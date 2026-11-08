import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/src/lib/auth';
import { getDb, saveDb, ensureDbInit, connectMongo } from '@/src/lib/db';
import { MealRecord } from '@/src/types';

// POST: Member submits a late meal-off request after cut-off time
export async function POST(req: NextRequest) {
  try {
    const { error, user } = authenticate(req, ['member', 'manager', 'admin']);
    if (error) return error;

    const { date, mealType, reason } = await req.json();

    if (!date || !mealType || !reason) {
      return NextResponse.json(
        { message: 'Missing required fields: date, mealType, reason.' },
        { status: 400 }
      );
    }

    if (!['lunch', 'dinner'].includes(mealType)) {
      return NextResponse.json({ message: 'Invalid mealType.' }, { status: 400 });
    }

    if (!reason.trim()) {
      return NextResponse.json({ message: 'Please provide a reason for the late meal-off request.' }, { status: 400 });
    }

    await ensureDbInit();
    const db = getDb();
    const userId = user!.id;
    const cleanEmail = user?.email?.toLowerCase().trim();

    // Check if kitchen headcount is already locked
    const existingDayMeal = db.dailyMeals?.find(d => d.date === date);
    const session = mealType === 'lunch' ? existingDayMeal?.lunch : existingDayMeal?.dinner;
    if (session && session.isLocked && user!.role === 'member') {
      return NextResponse.json({
        message: `দুঃখিত! আপনার রিকোয়েস্ট পৌঁছানোর আগেই রান্নার চাল-ডাল চুলায় উঠে গেছে${session.menu ? ` (মেনু: ${session.menu})` : ''}। তাই জরুরি মিল অফের আবেদন নেওয়া সম্ভব নয়।`,
        isKitchenLocked: true,
        menu: session.menu,
        lockedAt: session.lockedAt,
      }, { status: 400 });
    }

    let record = db.records.find(
      r => (r.userId === userId || (cleanEmail && r.userId === cleanEmail)) &&
           r.date === date &&
           r.mealType === mealType
    );

    const nowIso = new Date().toISOString();

    if (record) {
      record.requestStatus = 'pending';
      record.requestReason = reason.trim();
      record.requestedAt = nowIso;
      record.updatedAt = nowIso;
    } else {
      record = {
        id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId,
        date,
        mealType,
        count: 1, // Currently on, requesting off
        requestStatus: 'pending',
        requestReason: reason.trim(),
        requestedAt: nowIso,
        updatedAt: nowIso,
      };
      db.records.push(record);
    }

    await saveDb(db);

    // Direct atomic write to MongoDB collection records
    const dbMongo = await connectMongo();
    if (dbMongo) {
      try {
        await dbMongo.collection('records').updateOne(
          { id: record.id },
          {
            $set: {
              _id: record.id,
              id: record.id,
              userId: record.userId,
              date: record.date,
              mealType: record.mealType,
              count: record.count,
              requestStatus: record.requestStatus,
              requestReason: record.requestReason,
              requestedAt: record.requestedAt,
              updatedAt: nowIso,
            }
          },
          { upsert: true }
        );
      } catch (e) {
        console.error('Direct MongoDB write error in request-meal-off POST:', e);
      }
    }

    return NextResponse.json({
      message: 'Late meal-off request submitted to manager for review.',
      record,
    }, { status: 201 });
  } catch (err) {
    console.error('Request meal off error', err);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}

// GET: Fetch meal-off requests (Managers see all pending, Members see their own)
export async function GET(req: NextRequest) {
  try {
    const { error, user } = authenticate(req);
    if (error) return error;

    await ensureDbInit();
    const db = getDb();

    let recordsWithRequests = db.records.filter(
      r => r.requestStatus && r.requestStatus !== 'none'
    );

    if (user!.role === 'member') {
      const cleanEmail = user?.email?.toLowerCase().trim();
      recordsWithRequests = recordsWithRequests.filter(
        r => r.userId === user!.id || (cleanEmail && r.userId === cleanEmail)
      );
    }

    const enriched = recordsWithRequests.map(r => {
      const u = db.users.find(usr => usr.id === r.userId || (usr.email && usr.email.toLowerCase().trim() === r.userId));
      return {
        id: r.id,
        userId: r.userId,
        userName: u ? u.name : 'Unknown User',
        userEmail: u ? u.email : '',
        date: r.date,
        mealType: r.mealType,
        count: r.count,
        requestStatus: r.requestStatus,
        requestReason: r.requestReason,
        requestedAt: r.requestedAt,
        resolvedBy: r.resolvedBy,
        resolvedAt: r.resolvedAt,
      };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('Fetch meal off requests error', err);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}

// PUT: Manager accepts or rejects a meal-off request
export async function PUT(req: NextRequest) {
  try {
    const { error, user } = authenticate(req, ['manager', 'admin']);
    if (error) return error;

    const { recordId, action } = await req.json(); // action: 'accept' | 'reject'

    if (!recordId || !action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { message: 'recordId and valid action ("accept" | "reject") required.' },
        { status: 400 }
      );
    }

    await ensureDbInit();
    const db = getDb();

    const record = db.records.find(r => r.id === recordId);
    if (!record) {
      return NextResponse.json({ message: 'Meal record not found.' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();

    if (action === 'accept') {
      const oldCount = record.count;
      record.count = 0; // Turn OFF meal, member will NOT be charged
      record.requestStatus = 'accepted';
      record.resolvedBy = user!.id;
      record.resolvedAt = nowIso;
      record.updatedAt = nowIso;

      if (!db.mealToggleLog) db.mealToggleLog = [];
      db.mealToggleLog.push({
        id: `log-${Date.now()}-${Math.random()}`,
        userId: record.userId,
        date: record.date,
        mealType: record.mealType,
        action: 'off',
        oldCount,
        newCount: 0,
        timestamp: nowIso,
      });
    } else {
      record.count = 1; // Meal stays ON, member is charged
      record.requestStatus = 'rejected';
      record.resolvedBy = user!.id;
      record.resolvedAt = nowIso;
      record.updatedAt = nowIso;
    }

    await saveDb(db);

    // Direct atomic update in MongoDB collection records
    const dbMongo = await connectMongo();
    if (dbMongo) {
      try {
        await dbMongo.collection('records').updateOne(
          { id: record.id },
          {
            $set: {
              count: record.count,
              requestStatus: record.requestStatus,
              resolvedBy: record.resolvedBy,
              resolvedAt: record.resolvedAt,
              updatedAt: nowIso,
            }
          }
        );
      } catch (e) {
        console.error('Direct MongoDB write error in request-meal-off PUT:', e);
      }
    }

    return NextResponse.json({
      message: `Meal off request ${action === 'accept' ? 'accepted' : 'rejected'}.`,
      record,
    });
  } catch (err) {
    console.error('Resolve meal off request error', err);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
