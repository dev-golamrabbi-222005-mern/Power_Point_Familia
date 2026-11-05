'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/src/context/AuthContext';
import { ChefHat, ClipboardList, DollarSign, History, Eye } from 'lucide-react';

export default function AdminManagerViewPage() {
  const { token } = useAuth();
  if (!token) return null;

  const managerSubRoutes = [
    { href: '/dashboard', label: 'Manager Overview', desc: 'Main Manager Control Panel' },
    { href: '/dashboard/tickets', label: 'Tickets View', desc: 'Deposit approvals & Warning tickets' },
    { href: '/dashboard/meals-bazaar', label: 'Meals & Bazaar View', desc: 'Menu planning & Bazaar duty assignment' },
    { href: '/dashboard/finances', label: 'Finances View', desc: 'Member fixed costs & due assignment' },
    { href: '/dashboard/manager-history', label: 'History View', desc: 'Monthly history records' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl">
        <Eye className="w-6 h-6 text-teal-400" />
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Admin - Manager View Preview</h2>
          <p className="text-xs text-zinc-400">Select any manager sub-route to preview manager experience</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {managerSubRoutes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className="p-5 bg-zinc-900/80 border border-zinc-800 hover:border-teal-500/40 rounded-2xl transition-all group cursor-pointer block"
          >
            <h3 className="text-sm font-bold text-zinc-100 group-hover:text-teal-400 transition-colors">
              {route.label}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">{route.desc}</p>
            <span className="inline-block mt-3 text-[10px] font-mono text-teal-400/80 bg-teal-500/10 px-2 py-0.5 rounded-md">
              {route.href}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
