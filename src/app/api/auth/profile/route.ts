import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { authenticate } from '@/src/lib/auth';
import { getDb, saveDb, ensureDbInit, updateUserInDb } from '@/src/lib/db';

export async function PUT(req: NextRequest) {
  try {
    const { error, user } = authenticate(req);
    if (error) return error;

    const { name, phone, password } = await req.json();

    // Force refresh from database so newly approved members or role changes are immediately available
    await ensureDbInit(true);
    const db = getDb();
    
    const cleanEmail = user?.email ? user.email.toLowerCase().trim() : '';
    const userId = user?.id;

    const userIndex = db.users.findIndex(u => 
      (userId && (u.id === userId || (u as any)._id === userId)) ||
      (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail)
    );

    if (userIndex === -1) {
      return NextResponse.json({ message: 'User not found in system.' }, { status: 404 });
    }

    const updates: any = {};
    if (name) {
      db.users[userIndex].name = name;
      updates.name = name;
    }
    if (phone) {
      db.users[userIndex].phone = phone;
      updates.phone = phone;
    }
    
    if (password) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);
      db.users[userIndex].passwordHash = hash;
      updates.passwordHash = hash;
    }

    const targetUserId = db.users[userIndex].id || (db.users[userIndex] as any)._id || userId;
    await updateUserInDb(targetUserId, { ...updates, email: db.users[userIndex].email });
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
