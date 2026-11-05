'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/src/context/AuthContext';
import { Calendar, Utensils, Wallet, History, Eye } from 'lucide-react';

export default function AdminMemberViewPage() {
  const { token } = useAuth();
  if (!token) return null;

  const memberSubRoutes = [
    { href: '/dashboard', label: 'Member Overview', desc: 'Main Member Dashboard view' },
    { href: '/dashboard/calendar', label: 'Calendar View', desc: 'Bazaar activity calendar & duty schedule' },
    { href: '/dashboard/meals', label: 'Meals View', desc: 'Daily menu & meal bookings' },
    { href: '/dashboard/finance', label: 'Finance View', desc: 'Member financial ledger & deposits' },
    { href: '/dashboard/history', label: 'History View', desc: 'Personal monthly history records' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
        <Eye className="w-6 h-6 text-emerald-400" />
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Admin - Member View Preview</h2>
          <p className="text-xs text-zinc-400">Select any member sub-route to preview member experience</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {memberSubRoutes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className="p-5 bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/40 rounded-2xl transition-all group cursor-pointer block"
          >
            <h3 className="text-sm font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">
              {route.label}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">{route.desc}</p>
            <span className="inline-block mt-3 text-[10px] font-mono text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              {route.href}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
