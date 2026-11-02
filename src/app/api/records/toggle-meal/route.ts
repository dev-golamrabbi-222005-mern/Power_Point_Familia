import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/src/lib/auth';
import { getDb, ensureDbInit, saveDb } from '@/src/lib/db';
import { getDhakaTime } from '@/src/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const { error, user } = authenticate(req);
    if (error) return error;

    if (!['member', 'manager', 'admin'].includes(user!.role)) {
      return NextResponse.json({ message: 'Only active members, managers, or admins can toggle meals.' }, { status: 403 });
    }

    const { date, mealType, action } = await req.json(); // action: 'on' | 'off'

    if (!date || !mealType || !action) {
      return NextResponse.json({ message: 'Missing required fields: date, mealType, action.' }, { status: 400 });
    }

    if (!['lunch', 'dinner'].includes(mealType)) {
      return NextResponse.json({ message: 'Invalid mealType.' }, { status: 400 });
    }

    if (!['on', 'off'].includes(action)) {
      return NextResponse.json({ message: 'Invalid action.' }, { status: 400 });
    }

    await ensureDbInit();
    const db = getDb();

    const targetMonth = date.slice(0, 7);
    if (db.settings.closedMealMonths?.includes(targetMonth)) {
      return NextResponse.json({
        message: 'Meal service is closed for this month by admin approval.',
      }, { status: 400 });
    }

    const userId = user!.id;
    const { today, currentHour } = getDhakaTime();
    const requestDate = new Date(date + 'T00:00:00');
    const todayDate = new Date(today + 'T00:00:00');
    const daysAhead = Math.floor((requestDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
    const isToday = (date === today);

    // Check if Manager has ALREADY locked this session for kitchen cooking
    const existingDayMeal = db.dailyMeals?.find(d => d.date === date);
    const session = mealType === 'lunch' ? existingDayMeal?.lunch : existingDayMeal?.dinner;
    if (action === 'off' && session && session.isLocked && user!.role === 'member') {
      return NextResponse.json({
        message: `দুঃখিত! আপনার রিকোয়েস্ট পৌঁছানোর আগেই রান্নার চাল-ডাল চুলায় উঠে গেছে${session.menu ? ` (মেনু: ${session.menu})` : ''}। তাই মিলটি আর বন্ধ করা সম্ভব নয়।`,
        isKitchenLocked: true,
        menu: session.menu,
        lockedAt: session.lockedAt,
      }, { status: 400 });
    }

    // Check cut-off time for today if attempting to turn OFF:
    // Lunch cut-off: 09:00 AM | Dinner cut-off: 03:00 PM (15:00)
    if (action === 'off' && isToday) {
      if (mealType === 'lunch' && currentHour >= 9) {
        return NextResponse.json({
          message: 'Lunch cut-off time (09:00 AM) has passed. Please submit a "Request Meal Off" to the manager.',
          cutoffPassed: true,
          mealType: 'lunch',
          cutoffTime: '09:00 AM',
        }, { status: 400 });
      }
      if (mealType === 'dinner' && currentHour >= 15) {
        return NextResponse.json({
          message: 'Dinner cut-off time (03:00 PM) has passed. Please submit a "Request Meal Off" to the manager.',
          cutoffPassed: true,
          mealType: 'dinner',
          cutoffTime: '03:00 PM',
        }, { status: 400 });
      }
    }

    // Validate: Can only turn off meals up to 3 days in advance (rolling 3-day window)
    if (action === 'off' && daysAhead > 3) {
      return NextResponse.json({
        message: 'Can only turn off meals up to 3 days in advance (Rolling 3-day window).',
        maxDaysAllowed: 3,
        daysRequested: daysAhead,
      }, { status: 400 });
    }

    // Find existing record for this user, date, mealType
    const existingRecordIndex = db.records.findIndex(
      r => r.userId === userId && r.date === date && r.mealType === mealType
    );

    const newCount = action === 'on' ? 1 : 0;
    let record;

    if (existingRecordIndex >= 0) {
      // Update existing
      record = db.records[existingRecordIndex];
      const oldCount = record.count;
      record.count = newCount;
      
      // Log the toggle action
      if (!db.mealToggleLog) db.mealToggleLog = [];
      db.mealToggleLog.push({
        id: `log-${Date.now()}-${Math.random()}`,
        userId,
        date,
        mealType,
        action,
        oldCount,
        newCount,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Create new
      record = {
        id: `rec-${Date.now()}-${Math.random()}`,
        userId,
        date,
        mealType,
        count: newCount,
      };
      db.records.push(record);
      
      // Log
      if (!db.mealToggleLog) db.mealToggleLog = [];
      db.mealToggleLog.push({
        id: `log-${Date.now()}-${Math.random()}`,
        userId,
        date,
        mealType,
        action,
        oldCount: 0,
        newCount,
        timestamp: new Date().toISOString(),
      });
    }

    saveDb(db);

    // Notify manager if meal is turned off
    if (action === 'off') {
      const userInfo = db.users.find(u => u.id === userId);
      const managers = db.users.filter(u => u.role === 'manager' && u.status === 'approved');
      
      // TODO: Send notification to manager
      // For now, just log that a meal was turned off
      console.log(`Meal off notification: ${userInfo?.name} turned off ${mealType} on ${date}`);
    }

    return NextResponse.json({
      message: `Meal turned ${action}.`,
      record,
      daysAhead,
    });
  } catch (error) {
    console.error('Meal toggle error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}

// GET: Fetch meal status for a specific user and date
export async function GET(req: NextRequest) {
  try {
    const { error, user } = authenticate(req);
    if (error) return error;

    const searchParams = req.nextUrl.searchParams;
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ message: 'Missing required parameter: date.' }, { status: 400 });
    }

    await ensureDbInit();
    const db = getDb();

    const targetMonth = date.slice(0, 7);
    if (db.settings.closedMealMonths?.includes(targetMonth)) {
      return NextResponse.json({
        message: 'Meal service is closed for this month by admin approval.',
      }, { status: 400 });
    }

    const userId = user!.id;
    const lunchRecord = db.records.find(r => r.userId === userId && r.date === date && r.mealType === 'lunch');
    const dinnerRecord = db.records.find(r => r.userId === userId && r.date === date && r.mealType === 'dinner');
    const dayMeal = db.dailyMeals?.find(d => d.date === date);

    const { today, currentHour } = getDhakaTime();
    const isToday = (date === today);

    const formattedLunch = {
      mealType: 'lunch' as const,
      isOn: lunchRecord ? lunchRecord.count > 0 : true,
      count: lunchRecord ? lunchRecord.count : 1,
      requestStatus: lunchRecord?.requestStatus || 'none',
      requestReason: lunchRecord?.requestReason,
      requestedAt: lunchRecord?.requestedAt,
      isCutoffPassed: (isToday && currentHour >= 9) || Boolean(dayMeal?.lunch?.isLocked),
      isLocked: Boolean(dayMeal?.lunch?.isLocked),
      menu: dayMeal?.lunch?.menu || '',
      lockedAt: dayMeal?.lunch?.lockedAt || null,
    };

    const formattedDinner = {
      mealType: 'dinner' as const,
      isOn: dinnerRecord ? dinnerRecord.count > 0 : true,
      count: dinnerRecord ? dinnerRecord.count : 1,
      requestStatus: dinnerRecord?.requestStatus || 'none',
      requestReason: dinnerRecord?.requestReason,
      requestedAt: dinnerRecord?.requestedAt,
      isCutoffPassed: (isToday && currentHour >= 15) || Boolean(dayMeal?.dinner?.isLocked),
      isLocked: Boolean(dayMeal?.dinner?.isLocked),
      menu: dayMeal?.dinner?.menu || '',
      lockedAt: dayMeal?.dinner?.lockedAt || null,
    };

    return NextResponse.json({
      date,
      isToday,
      cutoffTimes: {
        lunch: '09:00 AM',
        dinner: '03:00 PM',
      },
      records: [formattedLunch, formattedDinner],
    });
  } catch (error) {
    console.error('Meal status fetch error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
