'use client';

import React, { useState } from 'react';
import { useDashboard } from '@/src/context/DashboardContext';
import { useAuth } from '@/src/context/AuthContext';
import { User as UserIcon, X, Check, AlertCircle, Save, Lock, Phone } from 'lucide-react';

export default function ProfileSettingsModal() {
  const { isProfileOpen, setIsProfileOpen } = useDashboard();
  const { user, token, login } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  if (!isProfileOpen || !user) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setError('');
    setUpdating(true);

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          phone,
          ...(password ? { password } : {}),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile.');
      }

      setMsg('Profile updated successfully!');
      login(token!, data.user);
      setPassword('');
      setTimeout(() => {
        setIsProfileOpen(false);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Error updating profile.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            {user.image || user.photoURL ? (
              <img
                src={user.image || user.photoURL}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-md shrink-0"
              />
            ) : (
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 shrink-0">
                <UserIcon className="w-6 h-6" />
              </div>
            )}
            <div>
              <h3 className="font-display font-bold text-base text-zinc-100 flex items-center gap-2">
                {user.name}
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {user.role}
                </span>
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsProfileOpen(false)}
            className="p-2 text-zinc-400 hover:text-zinc-200 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {msg && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{msg}</span>
          </div>
        )}
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpdate} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 text-sm focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 text-sm focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="text"
                disabled
                value={user.email}
                className="w-full px-3.5 py-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl text-zinc-500 text-sm cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                New Password (Optional)
              </label>
              <input
                type="password"
                placeholder="Leave blank to keep"
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={6}
                className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 text-sm focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={() => setIsProfileOpen(false)}
              className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {updating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
