import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/src/lib/auth';
import { getDb, saveDb, ensureDbInit, connectMongo } from '@/src/lib/db';
import { BazaarExpense } from '@/src/types';

export async function GET(req: NextRequest) {
  try {
    const { error, user } = authenticate(req);
    if (error) return error;

    await ensureDbInit();
    const db = getDb();
    const cleanEmail = user?.email?.toLowerCase().trim();
    const userId = user!.id;

    if (user!.role === 'manager' || user!.role === 'admin') {
      const enriched = db.bazaarExpenses.map(e => {
        const u = db.users.find(usr => usr.id === e.userId || (usr.email && usr.email.toLowerCase().trim() === e.userId));
        const assign = db.bazaarAssignments.find(a => a.id === e.assignmentId);
        const partner = db.users.find(usr => usr.id === (assign?.userId === e.userId ? assign?.member2Id : assign?.userId));
        return { 
          ...e, 
          userName: u ? u.name : 'Unknown',
          partnerName: partner ? partner.name : undefined,
        };
      });
      return NextResponse.json(enriched);
    } else {
      // Members see expenses where they are shopper or pair partner
      const enriched = db.bazaarExpenses
        .filter(e => {
          const assign = db.bazaarAssignments.find(a => a.id === e.assignmentId);
          return e.userId === userId || 
                 (cleanEmail && e.userId === cleanEmail) ||
                 assign?.userId === userId || 
                 assign?.member2Id === userId ||
                 (cleanEmail && (assign?.userId === cleanEmail || assign?.member2Id === cleanEmail));
        })
        .map(e => {
          const u = db.users.find(usr => usr.id === e.userId || (usr.email && usr.email.toLowerCase().trim() === e.userId));
          const assign = db.bazaarAssignments.find(a => a.id === e.assignmentId);
          const partnerId = assign?.userId === userId ? assign?.member2Id : assign?.userId;
          const partner = db.users.find(usr => usr.id === partnerId);
          return { 
            ...e, 
            userName: u ? u.name : 'Shopper',
            partnerName: partner ? partner.name : undefined,
          };
        });
      return NextResponse.json(enriched);
    }
  } catch (error) {
    console.error('Fetch bazaar expenses error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error, user } = authenticate(req, ['member', 'manager', 'admin']);
    if (error) return error;

    const { assignmentId, date, items, totalCost, allocatedCash, returnedCash, remarks, receiptImage } = await req.json();

    if (!assignmentId || !date || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { message: 'assignmentId, date, and items are required.' },
        { status: 400 }
      );
    }

    await ensureDbInit();
    const db = getDb();
    const cleanEmail = user?.email?.toLowerCase().trim();
    const userId = user!.id;

    // Verify the assignment belongs to this user (unless manager/admin)
    const assignment = db.bazaarAssignments.find(a => a.id === assignmentId);
    if (!assignment) {
      return NextResponse.json({ message: 'Bazaar assignment not found.' }, { status: 404 });
    }

    const isAuthorized = user!.role === 'manager' || user!.role === 'admin' ||
      assignment.userId === userId ||
      assignment.member2Id === userId ||
      (cleanEmail && (assignment.userId === cleanEmail || assignment.member2Id === cleanEmail)) ||
      (cleanEmail && (
        db.users.find(u => u.id === assignment.userId || (u as any)._id === assignment.userId)?.email?.toLowerCase().trim() === cleanEmail ||
        db.users.find(u => u.id === assignment.member2Id || (u as any)._id === assignment.member2Id)?.email?.toLowerCase().trim() === cleanEmail
      ));

    if (!isAuthorized) {
      return NextResponse.json({ message: 'This is not your assigned bazaar.' }, { status: 403 });
    }

    const calculatedTotal = items.reduce((sum: number, item: any) => sum + Number(item.cost || 0), 0);
    const finalTotal = totalCost !== undefined ? Number(totalCost) : calculatedTotal;
    const finalAllocated = Number(allocatedCash ?? assignment.allocatedCash ?? assignment.budget ?? 0);
    const finalReturned = returnedCash !== undefined ? Number(returnedCash) : Math.max(0, finalAllocated - finalTotal);
    const nowIso = new Date().toISOString();

    // Update assignment status for BOTH assigned members automatically
    assignment.status = 'submitted';
    assignment.allocatedCash = finalAllocated;
    assignment.returnedCash = finalReturned;
    assignment.items = items;
    assignment.submittedAt = nowIso;
    assignment.submittedBy = userId;

    const newExpense: BazaarExpense = {
      id: `bexp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      assignmentId,
      userId: assignment.userId,
      date,
      allocatedCash: finalAllocated,
      returnedCash: finalReturned,
      items,
      totalCost: finalTotal,
      status: 'pending',
      remarks,
      receiptImage,
      submittedAt: nowIso,
    };

    db.bazaarExpenses.push(newExpense);
    await saveDb(db);

    // Direct atomic write to MongoDB
    const dbMongo = await connectMongo();
    if (dbMongo) {
      try {
        await dbMongo.collection('bazaarAssignments').updateOne(
          { id: assignment.id },
          {
            $set: {
              status: 'submitted',
              allocatedCash: finalAllocated,
              returnedCash: finalReturned,
              items,
              submittedAt: nowIso,
              submittedBy: userId,
            }
          }
        );
        await dbMongo.collection('bazaarExpenses').updateOne(
          { id: newExpense.id },
          { $set: { _id: newExpense.id, ...newExpense } },
          { upsert: true }
        );
      } catch (e) {
        console.error('Direct MongoDB write error for bazaar expense:', e);
      }
    }

    return NextResponse.json({
      expense: newExpense,
      reconciliation: {
        allocatedCash: finalAllocated,
        actualSpend: finalTotal,
        returnedCash: finalReturned,
      },
      message: 'Bazaar bill submitted successfully! Awaiting manager reconciliation & approval.'
    }, { status: 201 });
  } catch (error) {
    console.error('Submit bazaar expense error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { error, user } = authenticate(req, ['member', 'manager', 'admin']);
    if (error) return error;

    const { id, items, totalCost, remarks, allocatedCash, returnedCash } = await req.json();

    if (!id || !items || !Array.isArray(items)) {
      return NextResponse.json({ message: 'id and items are required.' }, { status: 400 });
    }

    await ensureDbInit();
    const db = getDb();

    const expIndex = db.bazaarExpenses.findIndex(e => e.id === id);
    if (expIndex === -1) {
      return NextResponse.json({ message: 'Bazaar expense not found.' }, { status: 404 });
    }

    const expense = db.bazaarExpenses[expIndex];
    if (expense.status === 'approved') {
      return NextResponse.json({ message: 'Cannot edit an approved bazaar expense.' }, { status: 400 });
    }

    const assignment = db.bazaarAssignments.find(a => a.id === expense.assignmentId);
    if (user!.role === 'member' && assignment?.userId !== user!.id && assignment?.member2Id !== user!.id && expense.userId !== user!.id) {
      return NextResponse.json({ message: 'Unauthorized to edit this bazaar.' }, { status: 403 });
    }

    const calculatedTotal = items.reduce((sum: number, item: any) => sum + Number(item.cost || 0), 0);
    const finalTotal = totalCost !== undefined ? Number(totalCost) : calculatedTotal;

    expense.items = items;
    expense.totalCost = finalTotal;
    if (remarks !== undefined) expense.remarks = remarks;
    if (allocatedCash !== undefined) expense.allocatedCash = Number(allocatedCash);
    if (returnedCash !== undefined) expense.returnedCash = Number(returnedCash);
    (expense as any).updatedAt = new Date().toISOString();

    if (assignment) {
      assignment.items = items;
      if (allocatedCash !== undefined) assignment.allocatedCash = expense.allocatedCash;
      if (returnedCash !== undefined) assignment.returnedCash = expense.returnedCash;
    }

    await saveDb(db);

    return NextResponse.json({
      expense,
      message: 'Bazaar details updated successfully!',
    });
  } catch (error) {
    console.error('Update bazaar expense error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
