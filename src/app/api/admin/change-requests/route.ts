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

    if (type !== 'meal_off_month' && !targetUserId) {
      return NextResponse.json({ message: 'targetUserId is required.' }, { status: 400 });
    }

    await ensureDbInit();
    const db = getDb();

    const targetUser = targetUserId ? db.users.find(u => u.id === targetUserId) : null;
    const targetUserName = targetUser?.name || (type === 'meal_off_month' ? 'Entire Mess (Total Meal Off)' : 'Member');

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
    const { error } = authenticate(req, ['admin']);
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
      if (item.type === 'meal_off_month') {
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
