import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import jwt from 'jsonwebtoken';
import { getDb, ensureDbInit, saveDb, connectMongo } from '@/src/lib/db';
import { User } from '@/src/types';

const JWT_SECRET = process.env.JWT_SECRET || 'power_point_familia_super_secure_jwt_secret_key_2026';

// Local development safety guard: Never let localhost redirect to production Vercel
if (process.env.NODE_ENV === 'development' && !process.env.VERCEL) {
  if (!process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL.includes('vercel.app')) {
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
  }
}

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;

      try {
        await ensureDbInit(true);
        const db = getDb();
        const cleanEmail = user.email.toLowerCase().trim();
        const profileImage = (user.image || (profile as any)?.picture || '') as string;
        const displayName = user.name || cleanEmail.split('@')[0];

        // 1. Check direct MongoDB first for guaranteed consistency and zero duplicacy
        const mongo = await connectMongo();
        let dbUser: any = null;
        if (mongo) {
          const usersCol = mongo.collection('users');
          await usersCol.createIndex({ email: 1 }, { unique: true }).catch(() => {});
          const escapedEmail = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          dbUser = await usersCol.findOne({
            email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') },
          });
        }

        // 2. Fallback to in-memory db.users check
        if (!dbUser) {
          dbUser = db.users.find((u) => u.email && u.email.toLowerCase().trim() === cleanEmail);
        }

        if (!dbUser) {
          // No user exists with this email -> Create ONE new user with default member role & pending status
          const newUser: User & { passwordHash: string; photoURL?: string } = {
            id: user.id || `user_g_${Date.now()}`,
            email: cleanEmail,
            name: displayName,
            phone: '',
            role: 'member',
            status: 'pending',
            createdAt: new Date().toISOString(),
            bazaarCount: 0,
            passwordHash: '',
            image: profileImage,
            photoURL: profileImage,
          };

          // Guard against duplicacy before pushing
          const alreadyExists = db.users.some(u => u.email && u.email.toLowerCase().trim() === cleanEmail);
          if (!alreadyExists) {
            db.users.push(newUser);
          }

          if (mongo) {
            const usersCol = mongo.collection('users');
            await usersCol.updateOne(
              { email: cleanEmail },
              { $set: newUser, $setOnInsert: { _id: newUser.id } },
              { upsert: true }
            );
          }
          await saveDb(db);
        } else {
          // User already exists! Preserve role & status from DB.
          let modified = false;
          if (profileImage && (dbUser.image !== profileImage || dbUser.photoURL !== profileImage)) {
            dbUser.image = profileImage;
            dbUser.photoURL = profileImage;
            modified = true;
          }
          if (displayName && (!dbUser.name || dbUser.name.includes('@'))) {
            dbUser.name = displayName;
            modified = true;
          }

          // Sync in-memory user
          const inMemIdx = db.users.findIndex(u => u.email && u.email.toLowerCase().trim() === cleanEmail);
          if (inMemIdx >= 0) {
            db.users[inMemIdx] = { ...db.users[inMemIdx], ...dbUser };
          } else {
            db.users.push(dbUser);
          }

          if (mongo && modified) {
            const usersCol = mongo.collection('users');
            await usersCol.updateOne(
              { email: cleanEmail },
              { $set: { image: dbUser.image, photoURL: dbUser.photoURL, name: dbUser.name } }
            );
          }
          if (modified) {
            await saveDb(db);
          }
        }
        return true;
      } catch (err) {
        console.error('NextAuth signIn error:', err);
        return false;
      }
    },

    async jwt({ token, user, trigger, session }) {
      if (token?.email) {
        try {
          await ensureDbInit();
          const cleanEmail = token.email.toLowerCase().trim();

          const mongo = await connectMongo();
          let dbUser: any = null;
          if (mongo) {
            const usersCol = mongo.collection('users');
            const escapedEmail = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            dbUser = await usersCol.findOne({
              email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') },
            });
          }

          if (!dbUser) {
            const db = getDb();
            dbUser = db.users.find((u) => u.email && u.email.toLowerCase().trim() === cleanEmail);
          }

          if (dbUser) {
            token.id = dbUser.id || (dbUser._id ? dbUser._id.toString() : '');
            token.role = dbUser.role;
            token.status = dbUser.status;
            token.name = dbUser.name;
            token.image = dbUser.image || dbUser.photoURL || token.picture || '';

            const tokenPayload = {
              id: token.id,
              email: dbUser.email,
              role: dbUser.role,
              name: dbUser.name,
              status: dbUser.status,
              image: token.image,
              photoURL: token.image,
            };

            (token as any).jwtToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });
          }
        } catch (e) {
          console.error('NextAuth jwt callback error:', e);
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).status = token.status;
        (session.user as any).name = token.name;
        (session.user as any).image = token.image;
        (session.user as any).photoURL = token.image;
        (session as any).jwtToken = (token as any).jwtToken;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      const isDev = process.env.NODE_ENV === 'development' && !process.env.VERCEL;
      const effectiveBase = isDev ? 'http://localhost:3000' : baseUrl;

      if (url.startsWith('/')) {
        return `${effectiveBase}${url}`;
      }

      try {
        const parsedUrl = new URL(url);
        if (
          parsedUrl.origin === effectiveBase ||
          parsedUrl.hostname === 'localhost' ||
          parsedUrl.hostname === '127.0.0.1'
        ) {
          return url;
        }
      } catch {}

      return effectiveBase;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'power_point_familia_super_secure_jwt_secret_key_2026',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
