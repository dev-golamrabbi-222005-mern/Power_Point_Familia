import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/src/lib/auth';
import { getDb, ensureDbInit } from '@/src/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { error } = authenticate(req, ['manager', 'admin']);
    if (error) return error;

    await ensureDbInit(true);
    const db = getDb();
    
    // Don't expose password hash, but preserve all user data including fixedCosts and pastMonthDue
    const sanitizedUsers = db.users.map(({ passwordHash, ...safeUser }) => safeUser);

    return NextResponse.json(sanitizedUsers);
  } catch (error) {
    console.error('Fetch members error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
