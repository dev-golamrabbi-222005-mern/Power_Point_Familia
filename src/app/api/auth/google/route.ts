import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDb, ensureDbInit, saveDb, connectMongo } from '@/src/lib/db';
import { User } from '@/src/types';

const JWT_SECRET = process.env.JWT_SECRET || 'power_point_familia_super_secure_jwt_secret_key_2026';
const DEFAULT_ADMIN = (process.env.DEFAULT_ADMIN_EMAIL || 'g.rabbi.dev@gmail.com').toLowerCase();

export async function POST(req: NextRequest) {
  try {
    const { email, name, uid, photoURL, image } = await req.json();

    if (!email) {
      return NextResponse.json({ message: 'Email is required from Google Auth.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const isAdmin = cleanEmail === DEFAULT_ADMIN || cleanEmail === 'g.rabbi.dev@gmail.com' || cleanEmail === 'g.rabbi2005.555@gmail.com';
    const profilePic = image || photoURL || '';

    await ensureDbInit();
    const db = getDb();

    // Check MongoDB directly for consistency
    const mongo = await connectMongo();
    let user: any = null;
    if (mongo) {
      const usersCol = mongo.collection('users');
      const escapedEmail = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      user = await usersCol.findOne({
        email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') },
      });
    }

    if (!user) {
      user = db.users.find((u) => u.email && u.email.toLowerCase().trim() === cleanEmail);
    }

    if (!user) {
      // Create new user via Google Sign-In
      const newUser: User & { passwordHash: string; photoURL?: string } = {
        id: uid || `user_g_${Date.now()}`,
        email: cleanEmail,
        name: name || cleanEmail.split('@')[0],
        phone: '',
        role: isAdmin ? 'admin' : 'member',
        status: isAdmin ? 'approved' : 'pending',
        createdAt: new Date().toISOString(),
        bazaarCount: 0,
        passwordHash: '',
        image: profilePic,
        photoURL: profilePic,
      };

      if (!db.users.some(u => u.email && u.email.toLowerCase().trim() === cleanEmail)) {
        db.users.push(newUser);
      }
      user = newUser;
      await saveDb(db);
    } else {
      // Existing user: Upgrade to admin if matching default admin email
      let modified = false;
      if (isAdmin && (user.role !== 'admin' || user.status !== 'approved')) {
        user.role = 'admin';
        user.status = 'approved';
        modified = true;
      }
      if (name && (!user.name || user.name.includes('@') || user.name !== name)) {
        user.name = name;
        modified = true;
      }
      if (profilePic && (user.image !== profilePic || user.photoURL !== profilePic)) {
        user.image = profilePic;
        user.photoURL = profilePic;
        modified = true;
      }
      if (modified) {
        await saveDb(db);
      }
    }

    const tokenUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      status: user.status,
      image: user.image || user.photoURL || '',
      photoURL: user.photoURL || user.image || '',
    };

    const token = jwt.sign(tokenUser, JWT_SECRET, { expiresIn: '7d' });

    return NextResponse.json({
      user: tokenUser,
      token,
      message: isAdmin ? 'Welcome Super Admin!' : 'Signed in with Google successfully.',
    });
  } catch (error: any) {
    console.error('Google Auth Route Error:', error);
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
  }
}
