'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { useDashboard } from '@/src/context/DashboardContext';
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
  UserCheck,
  ChevronRight,
  Shield,
  Sparkles,
} from 'lucide-react';

interface SidebarLink {
  href: string;
  label: string;
  icon: any;
  badge?: number;
}

export default function DashboardSidebar() {
  const { user } = useAuth();
  const [imageError, setImageError] = React.useState(false);
  const {
    activeRoleView,
    setActiveRoleView,
    pendingDepositsCount,
    pendingUsersCount,
    totalPendingTicketsCount,
  } = useDashboard();
  const pathname = usePathname();

  if (!user) return null;

  // 1. MEMBER LINKS (4 Clean Tabs)
  const memberLinks: SidebarLink[] = [
    { href: '/dashboard', label: 'Overview', icon: TrendingUp },
    { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
    { href: '/dashboard/meals', label: 'Meals & Menu', icon: Utensils },
    { href: '/dashboard/finance', label: 'Finance & Ledger', icon: Wallet },
  ];

  // 2. MANAGER LINKS (4 Clean Tabs)
  const managerLinks: SidebarLink[] = [
    { href: '/dashboard', label: 'Overview', icon: TrendingUp },
    { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
    { href: '/dashboard/meals', label: 'Meals & Bazaar', icon: ChefHat },
    {
      href: '/dashboard/finance',
      label: 'Finances & Dues',
      icon: DollarSign,
      badge: totalPendingTicketsCount > 0 ? totalPendingTicketsCount : undefined,
    },
  ];

  // 3. ADMIN LINKS
  const adminLinks: SidebarLink[] = [
    { href: '/dashboard', label: 'Overview', icon: TrendingUp },
    { href: '/dashboard/memberView', label: 'Member View', icon: UserCheck },
    { href: '/dashboard/managerView', label: 'Manager View', icon: ChefHat },
    {
      href: '/dashboard/users',
      label: 'Users Directory',
      icon: Users,
      badge: pendingUsersCount > 0 ? pendingUsersCount : undefined,
    },
    { href: '/dashboard/permission', label: 'Permissions & Settings', icon: SlidersHorizontal },
  ];

  const currentLinks =
    user.role === 'admin'
      ? adminLinks
      : user.role === 'manager'
      ? activeRoleView === 'manager'
        ? managerLinks
        : memberLinks
      : memberLinks;

  return (
    <aside className="hidden md:block w-64 shrink-0 space-y-6">
      {/* User Profile Summary Card */}
      <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-center gap-3 shadow-xs">
        {!imageError && (user.image || user.photoURL) ? (
          <img
            src={user.image || user.photoURL}
            alt={user.name}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-10 h-10 rounded-xl object-cover border border-emerald-500/30 shrink-0 shadow-xs"
          />
        ) : (
          <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center font-black text-sm shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="overflow-hidden">
          <p className="text-sm font-bold text-zinc-100 truncate">{user.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
              {user.role} workspace
            </p>
          </div>
        </div>
      </div>

      {/* Manager Workspace Mode Switcher */}
      {user.role === 'manager' && (
        <div className="p-1 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center shadow-xs">
          <button
            onClick={() => setActiveRoleView('manager')}
            className={`flex-1 py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeRoleView === 'manager'
                ? 'bg-teal-500 text-zinc-950 shadow-md font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5" />
            Manager
          </button>
          <button
            onClick={() => setActiveRoleView('member')}
            className={`flex-1 py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeRoleView === 'member'
                ? 'bg-emerald-500 text-zinc-950 shadow-md font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Member
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="space-y-1">
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-3 mb-2">
          {user.role === 'manager' && activeRoleView === 'member'
            ? 'Personal Member Hub'
            : 'Navigation'}
        </p>
        {currentLinks.map(link => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs font-black'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-emerald-400' : 'text-zinc-500'
                  }`}
                />
                <span className="truncate">{link.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {link.badge !== undefined && (
                  <span className="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-emerald-500 text-zinc-950">
                    {link.badge}
                  </span>
                )}
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform ${
                    isActive ? 'text-emerald-400 translate-x-0.5' : 'text-zinc-600'
                  }`}
                />
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
