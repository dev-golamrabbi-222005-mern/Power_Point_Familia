import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/src/lib/auth';
import { getDb, saveDb, ensureDbInit } from '@/src/lib/db';
import { BazaarAssignment } from '@/src/types';

export async function GET(req: NextRequest) {
  try {
    const { error, user } = authenticate(req);
    if (error) return error;

    await ensureDbInit();
    const db = getDb();
    
    const cleanEmail = user?.email?.toLowerCase().trim();
    const userId = user!.id;
    
    if (user!.role === 'manager' || user!.role === 'admin') {
      // Return all assignments with both member names hydrated
      const enriched = db.bazaarAssignments.map(a => {
        const u1 = db.users.find(usr => usr.id === a.userId || (usr.email && usr.email.toLowerCase().trim() === a.userId));
        const u2 = db.users.find(usr => usr.id === a.member2Id || (usr.email && usr.email.toLowerCase().trim() === a.member2Id));
        return {
          ...a,
          userName: u1 ? u1.name : 'Member 1',
          member2Name: u2 ? u2.name : 'Member 2',
        };
      });
      return NextResponse.json(enriched);
    } else {
      // Members see assignments where they are either Member 1 or Member 2
      const enriched = db.bazaarAssignments
        .filter(a => a.userId === userId || a.member2Id === userId || (cleanEmail && (a.userId === cleanEmail || a.member2Id === cleanEmail)))
        .map(a => {
          const u1 = db.users.find(usr => usr.id === a.userId || (usr.email && usr.email.toLowerCase().trim() === a.userId));
          const u2 = db.users.find(usr => usr.id === a.member2Id || (usr.email && usr.email.toLowerCase().trim() === a.member2Id));
          return {
            ...a,
            userName: u1 ? u1.name : 'Member 1',
            member2Name: u2 ? u2.name : 'Member 2',
          };
        });
      return NextResponse.json(enriched);
    }
  } catch (error) {
    console.error('Fetch bazaar assignments error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error, user } = authenticate(req, ['manager', 'admin']);
    if (error) return error;

    const { userId, member2Id, date, shoppingList, budget, allocatedCash, items } = await req.json();

    if (!userId || !date) {
      return NextResponse.json(
        { message: 'Primary member (userId) and date are required.' },
        { status: 400 }
      );
    }

    await ensureDbInit();
    const db = getDb();

    const targetMonth = date.slice(0, 7);
    if (db.settings.closedMealMonths?.includes(targetMonth)) {
      return NextResponse.json(
        { message: 'Cannot assign bazaar. Meal service is closed for this month by admin approval.' },
        { status: 400 }
      );
    }

    const cash = Number(allocatedCash ?? budget ?? 0);
    const parsedItems = Array.isArray(items) && items.length > 0
      ? items
      : (Array.isArray(shoppingList) ? shoppingList.map((itemStr: string) => ({
          name: typeof itemStr === 'string' ? itemStr : (itemStr as any).name || 'Item',
          qty: (itemStr as any).qty || '',
          cost: Number((itemStr as any).cost || 0),
          isExtra: false,
          checked: false,
        })) : []);

    const stringList = Array.isArray(shoppingList) && shoppingList.length > 0
      ? shoppingList
      : parsedItems.map((i: any) => i.name);

    const newAssignment: BazaarAssignment = {
      id: `bazaar-${Date.now()}`,
      userId,
      member2Id: member2Id || undefined,
      date,
      shoppingList: stringList,
      budget: cash,
      allocatedCash: cash,
      items: parsedItems,
      status: 'pending',
    };

    db.bazaarAssignments.push(newAssignment);
    
    // Increment bazaar count for assigned members
    const user1 = db.users.find(u => u.id === userId);
    if (user1) user1.bazaarCount = (user1.bazaarCount || 0) + 1;

    if (member2Id) {
      const user2 = db.users.find(u => u.id === member2Id);
      if (user2) user2.bazaarCount = (user2.bazaarCount || 0) + 1;
    }
    
    saveDb(db);

    return NextResponse.json({
      assignment: newAssignment,
      message: 'Double member bazaar assignment created with budget!'
    }, { status: 201 });
  } catch (error) {
    console.error('Create bazaar assignment error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}

// Handle bazaar delegation
export async function PUT(req: NextRequest) {
  try {
    const { error, user } = authenticate(req, ['member', 'manager', 'admin']);
    if (error) return error;

    const { assignmentId, delegateToUserId } = await req.json();

    if (!assignmentId || !delegateToUserId) {
      return NextResponse.json(
        { message: 'assignmentId and delegateToUserId are required.' },
        { status: 400 }
      );
    }

    await ensureDbInit();
    const db = getDb();

    const assignment = db.bazaarAssignments.find(a => a.id === assignmentId);
    if (!assignment) {
      return NextResponse.json({ message: 'Bazaar assignment not found.' }, { status: 404 });
    }

    // Only assigned members or manager/admin can delegate
    if (assignment.userId !== user!.id && assignment.member2Id !== user!.id && user!.role !== 'manager' && user!.role !== 'admin') {
      return NextResponse.json({ message: 'You can only delegate your assigned bazaar duties.' }, { status: 403 });
    }

    if (assignment.status !== 'pending') {
      return NextResponse.json({ message: 'Cannot delegate a submitted or verified assignment.' }, { status: 400 });
    }

    // Reassign
    assignment.delegatedFrom = user!.id;
    if (assignment.userId === user!.id) {
      assignment.userId = delegateToUserId;
    } else {
      assignment.member2Id = delegateToUserId;
    }
    assignment.status = 'pending';

    const originalUser = db.users.find(u => u.id === user!.id);
    if (originalUser) {
      originalUser.bazaarCount = (originalUser.bazaarCount || 0) + 1;
    }

    saveDb(db);

    return NextResponse.json({
      assignment,
      message: 'Bazaar duty delegated successfully.'
    });
  } catch (error) {
    console.error('Bazaar delegation error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
