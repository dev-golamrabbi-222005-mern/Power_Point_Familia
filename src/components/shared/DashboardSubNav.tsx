'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import {
  TrendingUp,
  Calendar,
  Utensils,
  Wallet,
  History,
  ClipboardList,
  ChefHat,
  DollarSign,
  Users,
  SlidersHorizontal,
  ChevronDown,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';

export default function DashboardSubNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [managerMode, setManagerMode] = useState<'manager' | 'member'>('manager');

  if (!user) return null;

  // 1. MEMBER NAV LINKS
  const memberLinks = [
    { href: '/dashboard', label: 'Overview', icon: TrendingUp },
    { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
    { href: '/dashboard/meals', label: 'Meals', icon: Utensils },
    { href: '/dashboard/finance', label: 'Finance', icon: Wallet },
    { href: '/dashboard/history', label: 'History', icon: History },
  ];

  // 2. MANAGER NAV LINKS
  const managerLinks = [
    { href: '/dashboard', label: 'Overview', icon: TrendingUp },
    { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
    { href: '/dashboard/tickets', label: 'Tickets', icon: ClipboardList },
    { href: '/dashboard/meals-bazaar', label: 'Meals & Bazaar', icon: ChefHat },
    { href: '/dashboard/finances', label: 'Finances', icon: DollarSign },
    { href: '/dashboard/manager-history', label: 'History', icon: History },
  ];

  // 3. ADMIN NAV LINKS
  const adminLinks = [
    { href: '/dashboard', label: 'Overview', icon: TrendingUp },
    { href: '/dashboard/memberView', label: 'Member View', icon: UserCheck },
    { href: '/dashboard/managerView', label: 'Manager View', icon: ChefHat },
    { href: '/dashboard/users', label: 'Users', icon: Users },
    { href: '/dashboard/permission', label: 'Permissions', icon: SlidersHorizontal },
  ];

  return (
    <div className="bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-md sticky top-16 z-40">
      <div className="dashboard-container py-2.5 flex items-center justify-between flex-wrap gap-3">
        {/* MEMBER NAV */}
        {user.role === 'member' && (
          <div className="flex items-center gap-1.5 overflow-x-auto w-full">
            {memberLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-500 text-zinc-950 shadow-md font-black'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* MANAGER NAV (WITH DUAL CATEGORY MODE SWITCHER) */}
        {user.role === 'manager' && (
          <div className="flex items-center justify-between w-full flex-wrap gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(managerMode === 'manager' ? managerLinks : memberLinks).map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-emerald-500 text-zinc-950 shadow-md font-black'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Manager Mode Category Switcher Dropdown */}
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setManagerMode('manager')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  managerMode === 'manager'
                    ? 'bg-teal-500 text-zinc-950 font-black'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <ChefHat className="w-3.5 h-3.5" />
                Manager Mode
              </button>
              <button
                onClick={() => setManagerMode('member')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  managerMode === 'member'
                    ? 'bg-emerald-500 text-zinc-950 font-black'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Personal Member Mode
              </button>
            </div>
          </div>
        )}

        {/* ADMIN NAV */}
        {user.role === 'admin' && (
          <div className="flex items-center gap-1.5 overflow-x-auto w-full">
            {adminLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-purple-500 text-white shadow-md font-black'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
