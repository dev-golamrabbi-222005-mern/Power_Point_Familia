import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { UserRole } from '../types';
import { getDb } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'power_point_familia_super_secure_jwt_secret_key_2026';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
}

export function authenticate(req: NextRequest, allowedRoles?: UserRole[]) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return { error: NextResponse.json({ message: 'Authentication token is missing' }, { status: 401 }), user: null };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;

    // Cross-verify with live database state
    const db = getDb();
    const cleanDecodedEmail = decoded.email ? decoded.email.toLowerCase().trim() : '';
    const liveUser = db?.users?.find(
      u => (u.id && decoded.id && u.id === decoded.id) ||
           ((u as any)._id && decoded.id && (u as any)._id === decoded.id) ||
           (u.email && cleanDecodedEmail && u.email.toLowerCase().trim() === cleanDecodedEmail)
    );

    // Prioritize current database role, status, and ID over static token claims
    const currentRole = liveUser ? liveUser.role : decoded.role;
    const currentStatus = liveUser ? liveUser.status : decoded.status;
    const canonicalId = liveUser ? (liveUser.id || (liveUser as any)._id || decoded.id) : decoded.id;
    const canonicalEmail = liveUser ? liveUser.email : decoded.email;
    const canonicalName = liveUser ? liveUser.name : decoded.name;

    const authPayload: AuthUser = {
      ...decoded,
      id: canonicalId,
      email: canonicalEmail,
      name: canonicalName,
      role: currentRole,
      status: currentStatus,
    };

    if (liveUser && liveUser.status === 'rejected') {
      return {
        error: NextResponse.json({ message: 'Your account has been deactivated or rejected.' }, { status: 403 }),
        user: null
      };
    }
    
    if (allowedRoles && !allowedRoles.includes(currentRole)) {
      return {
        error: NextResponse.json({ message: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}` }, { status: 403 }),
        user: authPayload
      };
    }

    return { error: null, user: authPayload };
  } catch (err) {
    return { error: NextResponse.json({ message: 'Token is invalid or expired' }, { status: 403 }), user: null };
  }
}
