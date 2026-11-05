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
    const liveUser = db?.users?.find(
      u => (u.id && decoded.id && u.id === decoded.id) ||
           (u.email && decoded.email && u.email.toLowerCase().trim() === decoded.email.toLowerCase().trim())
    );

    // Prioritize current database role and status over static token claims
    const currentRole = liveUser ? liveUser.role : decoded.role;
    const currentStatus = liveUser ? liveUser.status : decoded.status;

    if (liveUser && liveUser.status === 'rejected') {
      return {
        error: NextResponse.json({ message: 'Your account has been deactivated or rejected.' }, { status: 403 }),
        user: null
      };
    }
    
    if (allowedRoles && !allowedRoles.includes(currentRole)) {
      return {
        error: NextResponse.json({ message: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}` }, { status: 403 }),
        user: { ...decoded, role: currentRole, status: currentStatus }
      };
    }

    return { error: null, user: { ...decoded, role: currentRole, status: currentStatus } };
  } catch (err) {
    return { error: NextResponse.json({ message: 'Token is invalid or expired' }, { status: 403 }), user: null };
  }
}
