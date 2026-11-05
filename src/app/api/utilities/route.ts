import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/src/lib/auth';
import { getDb, saveDb, ensureDbInit } from '@/src/lib/db';
import { SharedBill, MemberBillPayment } from '@/src/types';

export async function GET(req: NextRequest) {
  try {
    const { error, user } = authenticate(req);
    if (error) return error;

    await ensureDbInit();
    const db = getDb();

    // Get current month's shared bills
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Auto-ensure default 5 bills exist for the month
    const targets = db.settings?.fixedUtilityTargets || {
      rent: 19000,
      electricity: 3800,
      wifi: 650,
      gas: 2060,
      servant: 4000,
    };
    const defaultBills = [
      { type: 'rent', label: 'House Rent', amount: targets.rent },
      { type: 'electricity', label: 'Current Bill', amount: targets.electricity },
      { type: 'wifi', label: 'WiFi Bill', amount: targets.wifi },
      { type: 'gas', label: 'Gas Bill', amount: targets.gas },
      { type: 'servant_fee', label: 'Servant Fee', amount: targets.servant },
    ];

    let hasAdded = false;
    for (const d of defaultBills) {
      if (!db.sharedBills.some(b => b.month === currentMonth && b.type === d.type)) {
        db.sharedBills.push({
          id: `bill-${d.type}-${Date.now()}`,
          month: currentMonth,
          type: d.type as any,
          label: d.label,
          totalAmount: d.amount,
          dueDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          paidStatus: 'unpaid',
        });
        hasAdded = true;
      }
    }
    if (hasAdded) {
      await saveDb(db);
    }

    const bills = db.sharedBills.filter(b => b.month === currentMonth);

    // Count active approved members to divide bills
    const memberCount = db.users.filter(
      u => (u.role === 'member' && u.status === 'approved') || u.id === user!.id
    ).length;

    // Calculate each member's share
    const billsWithShare = bills.map(b => ({
      ...b,
      memberShare: Math.round(b.totalAmount / Math.max(memberCount, 1)),
    }));

    // Get user's payments for current month
    const userPayments = db.memberBillPayments.filter(
      p => p.userId === user!.id && p.month === currentMonth
    );

    return NextResponse.json({
      bills: billsWithShare,
      userPayments,
      memberCount,
    });
  } catch (error) {
    console.error('Fetch utilities error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}

// Manager/Admin: Create or update shared bills for a month
export async function POST(req: NextRequest) {
  try {
    const { error } = authenticate(req, ['manager', 'admin']);
    if (error) return error;

    const { month, type, label, totalAmount, dueDate } = await req.json();

    if (!month || !type || !totalAmount) {
      return NextResponse.json(
        { message: 'month, type, and totalAmount are required.' },
        { status: 400 }
      );
    }

    if (!['rent', 'electricity', 'wifi', 'servant_fee'].includes(type)) {
      return NextResponse.json({ message: 'Invalid bill type.' }, { status: 400 });
    }

    await ensureDbInit();
    const db = getDb();

    // Update existing or create new
    const existingIndex = db.sharedBills.findIndex(
      b => b.month === month && b.type === type
    );

    if (existingIndex !== -1) {
      db.sharedBills[existingIndex].totalAmount = Number(totalAmount);
      if (label) db.sharedBills[existingIndex].label = label;
      if (dueDate) db.sharedBills[existingIndex].dueDate = dueDate;
      await saveDb(db);
      return NextResponse.json({
        bill: db.sharedBills[existingIndex],
        message: `${db.sharedBills[existingIndex].label} updated for ${month}.`
      });
    }

    const newBill: SharedBill = {
      id: `bill-${type}-${Date.now()}`,
      month,
      type,
      label: label || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      totalAmount: Number(totalAmount),
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    db.sharedBills.push(newBill);
    await saveDb(db);

    return NextResponse.json({ bill: newBill, message: `${newBill.label} created.` }, { status: 201 });
  } catch (error) {
    console.error('Create utility bill error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
