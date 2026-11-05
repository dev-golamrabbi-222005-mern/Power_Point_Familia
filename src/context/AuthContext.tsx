'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut, useSession } from 'next-auth/react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  signInWithGoogle: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync NextAuth session with local JWT auth state
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const u = session.user as any;
      const jwtToken = (session as any).jwtToken;

      const syncedUser: User = {
        id: u.id || u.sub || (u.email ? u.email.toLowerCase().trim() : 'user_member'),
        email: u.email || '',
        name: u.name || '',
        phone: u.phone || '',
        role: u.role || 'member',
        status: u.status || 'approved',
        createdAt: u.createdAt || new Date().toISOString(),
        bazaarCount: u.bazaarCount || 0,
        image: u.image || u.photoURL || '',
        photoURL: u.photoURL || u.image || '',
      };

      if (jwtToken) {
        login(jwtToken, syncedUser);
      } else {
        setUser(syncedUser);
        localStorage.setItem('familia_user', JSON.stringify(syncedUser));
      }
    }
  }, [session, status]);

  const refreshUser = async () => {
    const storedToken = localStorage.getItem('familia_token');
    if (!storedToken) {
      if (status !== 'authenticated') {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${storedToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
          const activeToken = data.token || storedToken;
          setToken(activeToken);
          localStorage.setItem('familia_token', activeToken);
          localStorage.setItem('familia_user', JSON.stringify(data.user));
        } else {
          logout();
        }
      } else {
        logout();
      }
    } catch (error) {
      console.error('Session validation error', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Synchronously restore cached user & token on client mount
    try {
      const storedToken = localStorage.getItem('familia_token');
      const storedUser = localStorage.getItem('familia_user');
      if (storedToken) {
        setToken(storedToken);
      }
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Failed to parse cached user', e);
    }
    refreshUser();
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('familia_token', newToken);
      localStorage.setItem('familia_user', JSON.stringify(newUser));
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('familia_token');
      localStorage.removeItem('familia_user');
    }
    try {
      await nextAuthSignOut({ redirect: false });
    } catch (e) {
      // ignore
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    setLoading(true);
    try {
      await nextAuthSignIn('google', { callbackUrl: '/dashboard' });
    } catch (err: any) {
      console.error('NextAuth Google Sign In Error:', err);
      setLoading(false);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading: loading || status === 'loading',
        login,
        logout,
        signInWithGoogle,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
