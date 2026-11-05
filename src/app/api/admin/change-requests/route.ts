import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/src/lib/auth';
import { getDb, saveDb, ensureDbInit } from '@/src/lib/db';
import { AdminChangeRequest } from '@/src/types';

// GET: List all change requests
export async function GET(req: NextRequest) {
  try {
    const { error } = authenticate(req, ['admin', 'manager']);
    if (error) return error;

    await ensureDbInit();
    const db = getDb();
    const requests = db.adminChangeRequests || [];

    return NextResponse.json(requests);
  } catch (err) {
    console.error('Error fetching admin change requests', err);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}

// POST: Manager submits a significant change request
export async function POST(req: NextRequest) {
  try {
    const { error, user } = authenticate(req, ['manager', 'admin']);
    if (error) return error;

    const { targetUserId, type, details, oldValue, newValue } = await req.json();

    if (!type || !details) {
      return NextResponse.json({ message: 'type and details are required.' }, { status: 400 });
    }

    if (type !== 'meal_off_month' && type !== 'pay_fixed_bill' && !targetUserId) {
      return NextResponse.json({ message: 'targetUserId is required.' }, { status: 400 });
    }

    await ensureDbInit();
    const db = getDb();

    const targetUser = targetUserId ? db.users.find(u => u.id === targetUserId) : null;
    let targetUserName = targetUser?.name || 'Member';
    if (type === 'meal_off_month') targetUserName = 'Entire Mess (Total Meal Off)';
    if (type === 'pay_fixed_bill') targetUserName = newValue?.label || 'Fixed Utility';

    if (type === 'pay_fixed_bill') {
      const billMonth = newValue?.month || new Date().toISOString().slice(0, 7);
      const billType = newValue?.billType || 'rent';
      const bill = db.sharedBills.find(b => b.month === billMonth && b.type === billType);
      if (bill) {
        bill.paidStatus = 'pending_approval';
      }
    }

    const newRequest: AdminChangeRequest = {
      id: `req-${Date.now()}`,
      managerId: user!.id,
      managerName: user!.name,
      targetUserId: targetUserId || 'mess_all',
      targetUserName,
      type,
      details,
      oldValue,
      newValue,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };

    if (!db.adminChangeRequests) db.adminChangeRequests = [];
    db.adminChangeRequests.push(newRequest);
    await saveDb(db);

    return NextResponse.json({
      message: 'Waiting for Admin approval for making significant change.',
      request: newRequest,
    }, { status: 201 });
  } catch (err) {
    console.error('Error submitting change request', err);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}

// PUT: Admin approves or rejects a change request
export async function PUT(req: NextRequest) {
  try {
    const { user, error } = authenticate(req, ['admin']);
    if (error) return error;

    const { requestId, action } = await req.json(); // action: 'approved' | 'rejected'

    if (!requestId || !['approved', 'rejected'].includes(action)) {
      return NextResponse.json({ message: 'requestId and valid action are required.' }, { status: 400 });
    }

    await ensureDbInit();
    const db = getDb();
    const requests = db.adminChangeRequests || [];

    const reqIndex = requests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) {
      return NextResponse.json({ message: 'Change request not found.' }, { status: 404 });
    }

    const item = requests[reqIndex];
    item.status = action;
    item.resolvedAt = new Date().toISOString();

    // If approved, apply the requested changes to DB
    if (action === 'approved') {
      if (item.type === 'pay_fixed_bill') {
        const billMonth = item.newValue?.month || item.requestedAt.slice(0, 7);
        const billType = item.newValue?.billType || 'rent';
        let bill = db.sharedBills.find(b => b.month === billMonth && b.type === billType);
        if (bill) {
          bill.paidStatus = 'paid';
          bill.paidAt = new Date().toISOString();
          bill.paidAmount = Number(item.newValue?.amount || bill.totalAmount);
          bill.paymentMethod = item.newValue?.paymentMethod || 'Cash';
          bill.trxId = item.newValue?.trxId || '';
          bill.approvedBy = user?.name || 'Admin';
          bill.remarks = item.newValue?.remarks || '';
        } else {
          bill = {
            id: `bill-${billType}-${Date.now()}`,
            month: billMonth,
            type: billType,
            label: item.newValue?.label || billType,
            totalAmount: Number(item.newValue?.amount || 0),
            dueDate: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            paidStatus: 'paid',
            paidAt: new Date().toISOString(),
            paidAmount: Number(item.newValue?.amount || 0),
            paymentMethod: item.newValue?.paymentMethod || 'Cash',
            trxId: item.newValue?.trxId || '',
            approvedBy: user?.name || 'Admin',
            remarks: item.newValue?.remarks || '',
          };
          db.sharedBills.push(bill);
        }
      } else if (item.type === 'add_custom_utility') {
        const billMonth = item.newValue?.month || item.requestedAt.slice(0, 7);
        const customType = item.newValue?.customType || `custom_${Date.now()}`;
        const label = item.newValue?.label || 'Extra Utility';
        const amount = Number(item.newValue?.amount || 0);

        if (!db.sharedBills) db.sharedBills = [];
        const existingBill = db.sharedBills.find(b => b.month === billMonth && b.type === customType);
        if (existingBill) {
          existingBill.label = label;
          existingBill.totalAmount = amount;
          existingBill.remarks = item.newValue?.reason || existingBill.remarks;
        } else {
          db.sharedBills.push({
            id: `bill-${customType}`,
            month: billMonth,
            type: customType,
            label,
            totalAmount: amount,
            dueDate: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            isCustom: true,
            paidStatus: 'unpaid',
            remarks: item.newValue?.reason || '',
          });
        }
      } else if (item.type === 'meal_off_month') {
        const targetMonth = item.newValue?.month || item.details?.slice(0, 7) || new Date().toISOString().slice(0, 7);
        if (targetMonth) {
          if (!db.settings.closedMealMonths) db.settings.closedMealMonths = [];
          if (!db.settings.closedMealMonths.includes(targetMonth)) {
            db.settings.closedMealMonths.push(targetMonth);
          }
        }
      } else {
        const targetUser = db.users.find(u => u.id === item.targetUserId);
        if (targetUser && item.newValue) {
          if (item.newValue.name) targetUser.name = item.newValue.name;
          if (item.newValue.phone) targetUser.phone = item.newValue.phone;
          if (item.newValue.role && ['member', 'manager', 'user'].includes(item.newValue.role)) {
            targetUser.role = item.newValue.role;
          }
          if (item.newValue.status) targetUser.status = item.newValue.status;
        }
      }
    } else if (action === 'rejected' && item.type === 'pay_fixed_bill') {
      const billMonth = item.newValue?.month || item.requestedAt.slice(0, 7);
      const billType = item.newValue?.billType || 'rent';
      const bill = db.sharedBills.find(b => b.month === billMonth && b.type === billType);
      if (bill) {
        bill.paidStatus = 'unpaid';
      }
    }

    await saveDb(db);

    return NextResponse.json({
      message: `Change request successfully ${action}.`,
      request: item,
    });
  } catch (err) {
    console.error('Error processing change request', err);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
