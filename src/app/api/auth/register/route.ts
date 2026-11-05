import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb, saveDb, ensureDbInit, connectMongo } from '@/src/lib/db';
import { UserRole } from '@/src/types';

const JWT_SECRET = process.env.JWT_SECRET || 'power_point_familia_super_secure_jwt_secret_key_2026';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, phone } = await req.json();

    if (!email || !password || !name || !phone) {
      return NextResponse.json(
        { message: 'All fields (email, password, name, phone) are required.' },
        { status: 400 }
      );
    }

    await ensureDbInit();
    const db = getDb();
    const cleanEmail = email.toLowerCase().trim();

    const mongo = await connectMongo();
    let existingUser: any = null;
    if (mongo) {
      const usersCol = mongo.collection('users');
      const escapedEmail = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      existingUser = await usersCol.findOne({
        email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') },
      });
    }

    if (!existingUser) {
      existingUser = db.users.find(u => u.email && u.email.toLowerCase().trim() === cleanEmail);
    }

    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email already exists.' },
        { status: 400 }
      );
    }

    const role: UserRole = 'member';
    const status: 'pending' | 'approved' | 'rejected' = 'pending';

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const newUser = {
      id: `user-${Date.now()}`,
      email: cleanEmail,
      name,
      phone,
      role,
      status,
      createdAt: new Date().toISOString(),
      passwordHash,
      bazaarCount: 0,
    };

    db.users.push(newUser);
    await saveDb(db);

    const tokenUser = {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name,
      status: newUser.status,
    };

    const token = jwt.sign(tokenUser, JWT_SECRET, { expiresIn: '7d' });

    return NextResponse.json({
      user: tokenUser,
      token,
      message: 'Account registered successfully! Waiting for Admin approval.'
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
