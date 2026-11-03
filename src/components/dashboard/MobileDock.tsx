'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDashboard } from '@/src/context/DashboardContext';
import {
  TrendingUp,
  Utensils,
  Wallet,
  Calendar,
  History,
  ChefHat,
  ShoppingBag,
  DollarSign,
  ClipboardList,
  UserCheck,
  Users,
  SlidersHorizontal,
  Plus,
  Power,
  Layers,
} from 'lucide-react';

export default function MobileDock() {
  const pathname = usePathname();
  const {
    user,
    activeRoleView,
    toggleRoleView,
    pendingDepositsCount,
    pendingUsersCount,
    todayBazaarAssignment,
    setIsLiveBazaarOpen,
    setIsQuickMealOpen,
    setIsQuickExpenseOpen,
    setIsQuickApproveOpen,
  } = useDashboard();

  if (!user) return null;

  // 1. MEMBER DOCK (4 Clean Tabs)
  if (user.role === 'member' || (user.role === 'manager' && activeRoleView === 'member')) {
    const leftItems = [
      { href: '/dashboard', label: 'Home', icon: TrendingUp },
      { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
    ];
    const rightItems = [
      { href: '/dashboard/meals', label: 'Meals', icon: Utensils },
      { href: '/dashboard/finance', label: 'Finance', icon: Wallet },
    ];

    return (
      <div className="md:hidden fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] left-3 right-3 z-50 max-w-md mx-auto pointer-events-auto">
        {/* Unlocked Live Bazaar Button on Market Day */}
        {todayBazaarAssignment && (
          <button
            onClick={() => setIsLiveBazaarOpen(true)}
            className="w-full mb-2 py-2 px-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-white font-extrabold text-xs rounded-2xl shadow-xl flex items-center justify-between animate-pulse cursor-pointer border border-white/20 active:scale-98 transition-all"
          >
            <div className="flex items-center gap-2">
              <div className="p-1 bg-black/20 rounded-md">
                <ShoppingBag className="w-4 h-4 text-white" />
              </div>
              <span>Live Bazaar Mode Unlocked!</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded-full font-mono font-bold text-amber-200">
                ৳{todayBazaarAssignment.allocatedCash ?? todayBazaarAssignment.budget ?? 0}
              </span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md font-semibold">Open</span>
            </div>
          </button>
        )}

        <nav className="backdrop-blur-xl bg-zinc-950/90 border border-zinc-800/85 rounded-3xl px-2 py-2 shadow-2xl shadow-black/80 flex items-center justify-around relative">
          {/* Left items */}
          {leftItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center py-1 transition-all rounded-2xl relative ${
                  isActive
                    ? 'text-emerald-400 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-all ${
                    isActive ? 'bg-emerald-500/15 text-emerald-400 shadow-sm' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight font-medium">
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute -bottom-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                )}
              </Link>
            );
          })}

          {/* Central Floating Action Button: Quick Meal Toggle */}
          <div className="flex flex-col items-center justify-center px-1">
            <button
              onClick={() => setIsQuickMealOpen(true)}
              title="Quick Meal Toggle (Today/Tomorrow)"
              className="w-12 h-12 -mt-5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-zinc-950 font-black shadow-lg shadow-emerald-500/30 flex items-center justify-center border-2 border-zinc-950 active:scale-95 transition-transform cursor-pointer group"
            >
              <Power className="w-6 h-6 stroke-[2.5] text-zinc-950 group-hover:rotate-12 transition-transform" />
            </button>
            <span className="text-[9px] text-emerald-400 font-bold mt-1 tracking-tight">
              Meal On/Off
            </span>
          </div>

          {/* Right items */}
          {rightItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center py-1 transition-all rounded-2xl relative ${
                  isActive
                    ? 'text-emerald-400 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-all ${
                    isActive ? 'bg-emerald-500/15 text-emerald-400 shadow-sm' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight font-medium">
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute -bottom-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  // 2. MANAGER DOCK (4 Clean Tabs)
  if (user.role === 'manager' && activeRoleView === 'manager') {
    return (
      <div className="md:hidden fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] left-3 right-3 z-50 max-w-md mx-auto pointer-events-auto">
        <nav className="backdrop-blur-xl bg-zinc-950/90 border border-zinc-800/85 rounded-3xl px-2 py-2 shadow-2xl shadow-black/80 flex items-center justify-around relative">
          {/* 1. Overview */}
          <Link
            href="/dashboard"
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all rounded-2xl relative ${
              pathname === '/dashboard' ? 'text-teal-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                pathname === '/dashboard' ? 'bg-teal-500/15 text-teal-400 shadow-sm' : ''
              }`}
            >
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-medium">Overview</span>
            {pathname === '/dashboard' && (
              <span className="absolute -bottom-0.5 w-1.5 h-1.5 bg-teal-400 rounded-full shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
            )}
          </Link>

          {/* 2. Calendar */}
          <Link
            href="/dashboard/calendar"
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all rounded-2xl relative ${
              pathname === '/dashboard/calendar' ? 'text-teal-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                pathname === '/dashboard/calendar' ? 'bg-teal-500/15 text-teal-400 shadow-sm' : ''
              }`}
            >
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-medium">Calendar</span>
            {pathname === '/dashboard/calendar' && (
              <span className="absolute -bottom-0.5 w-1.5 h-1.5 bg-teal-400 rounded-full shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
            )}
          </Link>

          {/* Central Floating Action Button: Add Expense / Bazaar Entry */}
          <div className="flex flex-col items-center justify-center px-1">
            <button
              onClick={() => setIsQuickExpenseOpen(true)}
              title="Add Bazaar / Expense Entry"
              className="w-12 h-12 -mt-5 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-zinc-950 font-black shadow-lg shadow-teal-500/30 flex items-center justify-center border-2 border-zinc-950 active:scale-95 transition-transform cursor-pointer group"
            >
              <Plus className="w-6 h-6 stroke-[3] text-zinc-950 group-hover:scale-110 transition-transform" />
            </button>
            <span className="text-[9px] text-teal-400 font-bold mt-1 tracking-tight">
              Add Expense
            </span>
          </div>

          {/* 3. Kitchen & Meals */}
          <Link
            href="/dashboard/meals"
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all rounded-2xl relative ${
              pathname === '/dashboard/meals' || pathname === '/dashboard/meals-bazaar' ? 'text-teal-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                pathname === '/dashboard/meals' || pathname === '/dashboard/meals-bazaar' ? 'bg-teal-500/15 text-teal-400 shadow-sm' : ''
              }`}
            >
              <ChefHat className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-medium">Kitchen</span>
            {(pathname === '/dashboard/meals' || pathname === '/dashboard/meals-bazaar') && (
              <span className="absolute -bottom-0.5 w-1.5 h-1.5 bg-teal-400 rounded-full shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
            )}
          </Link>

          {/* 4. Finances & Dues (with badge) */}
          <Link
            href="/dashboard/finance"
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all rounded-2xl relative ${
              pathname === '/dashboard/finance' || pathname === '/dashboard/finances' || pathname === '/dashboard/tickets' ? 'text-teal-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all relative ${
                pathname === '/dashboard/finance' || pathname === '/dashboard/finances' || pathname === '/dashboard/tickets' ? 'bg-teal-500/15 text-teal-400 shadow-sm' : ''
              }`}
            >
              <DollarSign className="w-5 h-5" />
              {pendingDepositsCount > 0 && (
                <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-amber-400 text-zinc-950 text-[8px] font-black rounded-full flex items-center justify-center">
                  {pendingDepositsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-medium">Finances</span>
            {(pathname === '/dashboard/finance' || pathname === '/dashboard/finances' || pathname === '/dashboard/tickets') && (
              <span className="absolute -bottom-0.5 w-1.5 h-1.5 bg-teal-400 rounded-full shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
            )}
          </Link>
        </nav>
      </div>
    );
  }

  // 3. ADMIN DOCK (4 Clean Tabs)
  return (
    <div className="md:hidden fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] left-3 right-3 z-50 max-w-md mx-auto pointer-events-auto">
      <nav className="backdrop-blur-xl bg-zinc-950/90 border border-zinc-800/85 rounded-3xl px-2 py-2 shadow-2xl shadow-black/80 flex items-center justify-around relative">
        {/* 1. Overview */}
        <Link
          href="/dashboard"
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all rounded-2xl relative ${
            pathname === '/dashboard' ? 'text-purple-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              pathname === '/dashboard' ? 'bg-purple-500/15 text-purple-400 shadow-sm' : ''
            }`}
          >
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Overview</span>
          {pathname === '/dashboard' && (
            <span className="absolute -bottom-0.5 w-1.5 h-1.5 bg-purple-400 rounded-full shadow-[0_0_8px_rgba(192,132,252,0.8)]" />
          )}
        </Link>

        {/* 2. Calendar */}
        <Link
          href="/dashboard/calendar"
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all rounded-2xl relative ${
            pathname === '/dashboard/calendar' ? 'text-purple-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              pathname === '/dashboard/calendar' ? 'bg-purple-500/15 text-purple-400 shadow-sm' : ''
            }`}
          >
            <Calendar className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Calendar</span>
          {pathname === '/dashboard/calendar' && (
            <span className="absolute -bottom-0.5 w-1.5 h-1.5 bg-purple-400 rounded-full shadow-[0_0_8px_rgba(192,132,252,0.8)]" />
          )}
        </Link>

        {/* Central Floating Action Button: Quick Approve Pending Users */}
        <div className="flex flex-col items-center justify-center px-1">
          <button
            onClick={() => setIsQuickApproveOpen(true)}
            title="Approve Pending Users"
            className="w-12 h-12 -mt-5 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-black shadow-lg shadow-purple-500/30 flex items-center justify-center border-2 border-zinc-950 active:scale-95 transition-transform cursor-pointer relative group"
          >
            <UserCheck className="w-6 h-6 stroke-[2.5] text-white group-hover:scale-110 transition-transform" />
            {pendingUsersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 text-zinc-950 font-black text-[9px] rounded-full flex items-center justify-center border border-zinc-950">
                {pendingUsersCount}
              </span>
            )}
          </button>
          <span className="text-[9px] text-purple-400 font-bold mt-1 tracking-tight">
            Approve
          </span>
        </div>

        {/* 3. Users */}
        <Link
          href="/dashboard/users"
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all rounded-2xl relative ${
            pathname === '/dashboard/users' ? 'text-purple-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              pathname === '/dashboard/users' ? 'bg-purple-500/15 text-purple-400 shadow-sm' : ''
            }`}
          >
            <Users className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Users</span>
          {pathname === '/dashboard/users' && (
            <span className="absolute -bottom-0.5 w-1.5 h-1.5 bg-purple-400 rounded-full shadow-[0_0_8px_rgba(192,132,252,0.8)]" />
          )}
        </Link>

        {/* 4. Permissions */}
        <Link
          href="/dashboard/permission"
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all rounded-2xl relative ${
            pathname === '/dashboard/permission' ? 'text-purple-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              pathname === '/dashboard/permission' ? 'bg-purple-500/15 text-purple-400 shadow-sm' : ''
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Settings</span>
          {pathname === '/dashboard/permission' && (
            <span className="absolute -bottom-0.5 w-1.5 h-1.5 bg-purple-400 rounded-full shadow-[0_0_8px_rgba(192,132,252,0.8)]" />
          )}
        </Link>
      </nav>
    </div>
  );
}
