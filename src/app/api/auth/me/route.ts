import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { authenticate } from '@/src/lib/auth';
import { getDb, ensureDbInit } from '@/src/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'power_point_familia_super_secure_jwt_secret_key_2026';

export async function GET(req: NextRequest) {
  try {
    const { error, user } = authenticate(req);
    if (error) return error;

    await ensureDbInit(true);
    const db = getDb();
    const cleanEmail = user!.email ? user!.email.toLowerCase().trim() : '';
    const fullUser = db.users.find(
      u => (u.id && user!.id && u.id === user!.id) ||
           ((u as any)._id && user!.id && (u as any)._id === user!.id) ||
           (u.email && cleanEmail && u.email.toLowerCase().trim() === cleanEmail)
    );

    if (!fullUser) {
      return NextResponse.json({ message: 'User account not found or deleted.' }, { status: 401 });
    }

    if (fullUser.status === 'rejected') {
      return NextResponse.json({ message: 'User account is deactivated or rejected.' }, { status: 403 });
    }

    const userData = {
      id: fullUser.id || (fullUser as any)._id,
      email: fullUser.email,
      name: fullUser.name,
      phone: fullUser.phone,
      role: fullUser.role,
      status: fullUser.status,
      createdAt: fullUser.createdAt,
      image: fullUser.image || (fullUser as any).photoURL || '',
      photoURL: (fullUser as any).photoURL || fullUser.image || '',
    };

    // If role or status has changed compared to JWT token, sign and return a fresh token
    let refreshedToken: string | undefined;
    if (fullUser.role !== user!.role || fullUser.status !== user!.status) {
      refreshedToken = jwt.sign(userData, JWT_SECRET, { expiresIn: '7d' });
    }

    return NextResponse.json({
      user: userData,
      token: refreshedToken,
    });
  } catch (error) {
    console.error('Auth me error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
