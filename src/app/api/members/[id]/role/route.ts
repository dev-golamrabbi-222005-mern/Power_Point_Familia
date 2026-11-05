import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/src/lib/auth';
import { getDb, saveDb, ensureDbInit, updateUserInDb, deleteUserFromDb } from '@/src/lib/db';

// PUT: Full A-Z User Profile & Status Edit (Admin Only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = authenticate(req, ['admin']);
    if (error) return error;

    const { id } = await params;
    const body = await req.json();
    const { name, email, phone, role, status } = body;

    await ensureDbInit(true);
    const db = getDb();
    const userIndex = db.users.findIndex(u => u.id === id || (u as any)._id === id);

    if (userIndex === -1) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    if (db.users[userIndex].id === user!.id && (role !== undefined && role !== 'admin')) {
      return NextResponse.json(
        { message: 'You cannot demote yourself from Admin role!' },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (email) updates.email = email.toLowerCase().trim();
    if (phone !== undefined) updates.phone = phone;
    if (role) updates.role = role;
    if (status) updates.status = status;

    // Direct atomic update to MongoDB and in-memory cache
    await updateUserInDb(id, updates);

    // Also update current db.users in place and save
    Object.assign(db.users[userIndex], updates);
    await saveDb(db);

    return NextResponse.json({
      user: db.users[userIndex],
      message: 'User profile updated successfully.'
    });
  } catch (error) {
    console.error('Update user error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE: Permanent User Removal (Admin Only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = authenticate(req, ['admin']);
    if (error) return error;

    const { id } = await params;

    await ensureDbInit(true);
    const db = getDb();

    if (id === user!.id) {
      return NextResponse.json({ message: 'You cannot delete your own account!' }, { status: 400 });
    }

    const userIndex = db.users.findIndex(u => u.id === id || (u as any)._id === id);
    if (userIndex === -1) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const targetUser = db.users[userIndex];

    // Atomically delete from MongoDB and in-memory cache
    await deleteUserFromDb(id, targetUser.email);

    // Delete user from db.users array and persist
    db.users.splice(userIndex, 1);
    await saveDb(db);

    return NextResponse.json({ message: 'User account deleted permanently.' });
  } catch (error) {
    console.error('Delete user error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
