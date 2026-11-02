import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/src/lib/auth';
import { getDb, ensureDbInit } from '@/src/lib/db';
import { BazaarDutyInfo } from '@/src/types';

export async function GET(req: NextRequest) {
  try {
    const { error, user } = authenticate(req);
    if (error) return error;

    const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0];

    await ensureDbInit();
    const db = getDb();
    const userId = user!.id;

    // Check if user has bazaar assignment on this date (either as primary userId or secondary member2Id)
    const assignment = db.bazaarAssignments.find(
      a => a.date === date && (a.userId === userId || a.member2Id === userId)
    );

    // Find if anyone in the mess is assigned on this date
    const messAssignment = db.bazaarAssignments.find(a => a.date === date);
    let messShoppers = undefined;
    if (messAssignment) {
      const u1 = db.users.find(u => u.id === messAssignment.userId);
      const u2 = db.users.find(u => u.id === messAssignment.member2Id);
      messShoppers = {
        member1Name: u1 ? u1.name : 'Mess Member',
        member2Name: u2 ? u2.name : undefined,
        budget: messAssignment.budget || messAssignment.allocatedCash || 0,
        status: messAssignment.status,
      };
    }

    if (!assignment) {
      const response: BazaarDutyInfo = {
        hasDuty: false,
        date,
        messShoppers,
      };
      return NextResponse.json(response);
    }

    // Find pair partner name
    let pairPartnerName = 'Partner';
    const partnerId = assignment.userId === userId ? assignment.member2Id : assignment.userId;
    if (partnerId) {
      const partner = db.users.find(u => u.id === partnerId);
      if (partner) pairPartnerName = partner.name;
    } else if (assignment.bazaarPairId) {
      const pair = db.bazaarPairs.find(p => p.id === assignment.bazaarPairId);
      if (pair) {
        const pId = pair.member1Id === userId ? pair.member2Id : pair.member1Id;
        const partner = db.users.find(u => u.id === pId);
        if (partner) pairPartnerName = partner.name;
      }
    }

    // Budget assigned by manager
    const budget = assignment.budget || 500;

    // Check if expense submitted by either member 1 or member 2 for this assignment
    const expense = db.bazaarExpenses.find(e => e.assignmentId === assignment.id);
    let submittedDetails = undefined;
    if (expense) {
      const submitter = db.users.find(u => u.id === expense.userId);
      submittedDetails = {
        submittedByName: submitter ? submitter.name : 'Assigned Member',
        totalCost: expense.totalCost,
        items: expense.items || [],
        submittedAt: expense.submittedAt,
      };
    }

    const response: BazaarDutyInfo = {
      hasDuty: true,
      date,
      pairPartnerName,
      shoppingList: assignment.shoppingList || [],
      budget,
      assignmentId: assignment.id,
      status: assignment.status,
      submittedDetails,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Fetch calendar bazaar duty error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
