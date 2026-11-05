import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb, ensureDbInit } from '@/src/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'power_point_familia_super_secure_jwt_secret_key_2026';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required.' },
        { status: 400 }
      );
    }

    await ensureDbInit(true);
    const db = getDb();
    const cleanEmail = email.toLowerCase().trim();
    const user = db.users.find(u => u.email && u.email.toLowerCase().trim() === cleanEmail);

    if (!user || !user.passwordHash || !bcrypt.compareSync(password, user.passwordHash)) {
      return NextResponse.json(
        { message: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    if (user.status === 'rejected') {
      return NextResponse.json(
        { message: 'Your account is deactivated or rejected. Please contact an admin.' },
        { status: 403 }
      );
    }

    const tokenUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      status: user.status,
      image: (user as any).image || (user as any).photoURL || '',
      photoURL: (user as any).photoURL || (user as any).image || '',
    };

    const token = jwt.sign(tokenUser, JWT_SECRET, { expiresIn: '7d' });

    return NextResponse.json({
      user: tokenUser,
      token,
      message: 'Login successful.'
    });
  } catch (error) {
    console.error('Login error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
