import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { authenticate } from '@/src/lib/auth';
import { getDb, saveDb, ensureDbInit } from '@/src/lib/db';

export async function PUT(req: NextRequest) {
  try {
    const { error, user } = authenticate(req);
    if (error) return error;

    const { name, phone, password } = await req.json();

    await ensureDbInit();
    const db = getDb();
    const userIndex = db.users.findIndex(u => u.id === user!.id);

    if (userIndex === -1) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    if (name) db.users[userIndex].name = name;
    if (phone) db.users[userIndex].phone = phone;
    
    if (password) {
      const salt = bcrypt.genSaltSync(10);
      db.users[userIndex].passwordHash = bcrypt.hashSync(password, salt);
    }

    await saveDb(db);

    return NextResponse.json({
      user: {
        id: db.users[userIndex].id,
        email: db.users[userIndex].email,
        name: db.users[userIndex].name,
        phone: db.users[userIndex].phone,
        role: db.users[userIndex].role,
        status: db.users[userIndex].status,
        createdAt: db.users[userIndex].createdAt,
        image: db.users[userIndex].image || db.users[userIndex].photoURL || '',
        photoURL: db.users[userIndex].photoURL || db.users[userIndex].image || '',
      },
      message: 'Profile updated successfully.'
    });
  } catch (error) {
    console.error('Update profile error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
