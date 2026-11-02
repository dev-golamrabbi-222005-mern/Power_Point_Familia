import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/src/lib/auth';
import { getDb, saveDb, ensureDbInit } from '@/src/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error, user } = authenticate(req, ['manager', 'admin']);
    if (error) return error;

    const { status, allocatedCash, returnedCash } = await req.json();

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { message: 'Status must be "approved" or "rejected".' },
        { status: 400 }
      );
    }

    await ensureDbInit();
    const db = getDb();

    const expenseIndex = db.bazaarExpenses.findIndex(e => e.id === id);
    if (expenseIndex === -1) {
      return NextResponse.json({ message: 'Expense not found.' }, { status: 404 });
    }

    const prevStatus = db.bazaarExpenses[expenseIndex].status;
    db.bazaarExpenses[expenseIndex].status = status;

    if (allocatedCash !== undefined) db.bazaarExpenses[expenseIndex].allocatedCash = Number(allocatedCash);
    if (returnedCash !== undefined) db.bazaarExpenses[expenseIndex].returnedCash = Number(returnedCash);

    if (status === 'approved') {
      db.bazaarExpenses[expenseIndex].verifiedAt = new Date().toISOString();
      db.bazaarExpenses[expenseIndex].verifiedBy = user!.id;
    }

    // Deduct expense from manager cash in hand if newly approved
    if (status === 'approved' && prevStatus !== 'approved') {
      const expenseAmount = db.bazaarExpenses[expenseIndex].totalCost || 0;
      (db.settings as any).totalCashInHand = Math.max(0, ((db.settings as any).totalCashInHand || 0) - expenseAmount);
    }

    // Also update the corresponding assignment
    const assignment = db.bazaarAssignments.find(
      a => a.id === db.bazaarExpenses[expenseIndex].assignmentId
    );
    if (assignment) {
      assignment.status = status === 'approved' ? 'verified' : 'pending';
      if (status === 'approved') {
        assignment.verifiedAt = new Date().toISOString();
        assignment.verifiedBy = user!.id;
      }
    }

    // Auto-advance pair: check if both members of the current active pair are done (verified or skipped)
    if (status === 'approved' && assignment && db.bazaarPairs.length > 0) {
      const currentPairIndex = db.settings.currentPairIndex;
      const currentPair = db.bazaarPairs[currentPairIndex % db.bazaarPairs.length];
      
      if (currentPair && (assignment.userId === currentPair.member1Id || assignment.userId === currentPair.member2Id)) {
        const pairMembers = [currentPair.member1Id, currentPair.member2Id];
        const allResolved = pairMembers.every(memberId => 
          db.bazaarAssignments.some(a => a.userId === memberId && (a.status === 'verified' || a.status === 'skipped'))
        );

        if (allResolved) {
          const oldIndex = db.settings.currentPairIndex;
          db.settings.currentPairIndex = (oldIndex + 1) % db.bazaarPairs.length;
          
          await saveDb(db);

          const nextPair = db.bazaarPairs[db.settings.currentPairIndex];
          const m1 = db.users.find(u => u.id === nextPair.member1Id);
          const m2 = db.users.find(u => u.id === nextPair.member2Id);

          return NextResponse.json({
            expense: db.bazaarExpenses[expenseIndex],
            message: `Expense approved! Pair resolved — advancing to: ${m1?.name || '?'} & ${m2?.name || '?'}`,
            autoAdvanced: true,
            newPairIndex: db.settings.currentPairIndex,
          });
        }
      }
    }

    await saveDb(db);

    return NextResponse.json({
      expense: db.bazaarExpenses[expenseIndex],
      message: `Expense ${status} successfully.`
    });
  } catch (error) {
    console.error('Update bazaar expense status error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
