'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { useDashboard } from '@/src/context/DashboardContext';
import {
  Bell,
  ChefHat,
  UserCheck,
  ShieldAlert,
  LogOut,
  Settings,
  ChevronDown,
  Sparkles,
  Flame,
  CheckCircle2,
  Clock,
  ArrowRight,
  User as UserIcon,
} from 'lucide-react';
import Logo from '../shared/PPFLogo';

export default function DashboardTopBar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const {
    activeRoleView,
    toggleRoleView,
    mealRate,
    baseRate,
    liveMealRate,
    pendingDepositsCount,
    pendingUsersCount,
    pendingMealRequestsCount,
    setIsProfileOpen,
    setIsQuickApproveOpen,
  } = useDashboard();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <header className="sticky top-0 z-40 w-full bg-[#0a0a0a]/90 backdrop-blur-md border-b border-zinc-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-4 md:px-6 h-14 flex items-center justify-between gap-1.5 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <Link href="/dashboard" className="shrink-0 flex items-center">
              <Logo size="responsive" />
            </Link>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <div className="w-20 h-7 bg-zinc-900/60 border border-zinc-800/60 rounded-xl animate-pulse" />
            <div className="w-8 h-8 bg-zinc-900/60 border border-zinc-800/60 rounded-xl animate-pulse" />
          </div>
        </div>
      </header>
    );
  }

  // Determine current badge
  const isManagerMode = user.role === 'manager' && activeRoleView === 'manager';
  const isMemberMode = user.role === 'member' || (user.role === 'manager' && activeRoleView === 'member');
  const isAdmin = user.role === 'admin';

  const totalNotifCount =
    (user.role === 'admin' ? pendingUsersCount : 0) +
    (user.role === 'manager' || user.role === 'admin' ? pendingDepositsCount : 0) +
    (user.role === 'manager' || user.role === 'admin' ? pendingMealRequestsCount : 0);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0a0a0a]/90 backdrop-blur-md border-b border-zinc-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 md:px-6 h-14 flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Left side: Power Point Familia branding & Role badge */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <Link href="/dashboard" className="shrink-0 flex items-center">
            <Logo size="responsive" />
          </Link>

          {/* Role Badge */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isAdmin && (
              <span className="hidden sm:inline-flex px-2 py-0.5 sm:px-2.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30 items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                Admin
              </span>
            )}

            {user.role === 'member' && (
              <span className="hidden sm:inline-flex px-2 py-0.5 sm:px-2.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 items-center gap-1">
                <UserCheck className="w-3 h-3" />
                Member
              </span>
            )}
          </div>
        </div>

        {/* Right side: Quick Balance/Meal Rate Pill + Notifications + Profile Avatar */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Live Meal Rate Pill */}
          <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1 bg-zinc-900/90 border border-zinc-800 rounded-xl text-[11px] sm:text-xs font-bold shadow-xs shrink-0">
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20 shrink-0" />
            <span className="text-zinc-200 whitespace-nowrap">
              {liveMealRate > 0 ? (
                <>
                  ৳{liveMealRate.toFixed(1)}
                  <span className="hidden md:inline text-[10px] text-zinc-400 font-normal">/Meal</span>
                </>
              ) : (
                <>
                  ৳0.0
                  <span className="hidden md:inline text-[10px] text-zinc-400 font-normal"> (Est: ৳{baseRate})</span>
                </>
              )}
            </span>
          </div>

          {/* Notifications Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
              className="relative p-1.5 sm:p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all cursor-pointer flex items-center justify-center"
              title="Notifications & Alerts"
            >
              <Bell className="w-4 h-4 shrink-0" />
              {totalNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-zinc-950 font-black text-[9px] rounded-full flex items-center justify-center animate-pulse">
                  {totalNotifCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {notifDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800/80 px-1">
                  <span className="text-xs font-bold text-zinc-200">System Activity</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Live</span>
                </div>

                <div className="space-y-2">
                  {user.role === 'admin' && pendingUsersCount > 0 && (
                    <div
                      onClick={() => {
                        setNotifDropdownOpen(false);
                        setIsQuickApproveOpen(true);
                      }}
                      className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-between cursor-pointer hover:bg-purple-500/15 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-purple-400" />
                        <div>
                          <p className="text-xs font-bold text-purple-300">
                            {pendingUsersCount} Pending Join Requests
                          </p>
                          <p className="text-[10px] text-zinc-400">Click to review and approve</p>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                  )}

                  {(user.role === 'manager' || user.role === 'admin') && pendingDepositsCount > 0 && (
                    <Link
                      href="/dashboard/tickets"
                      onClick={() => setNotifDropdownOpen(false)}
                      className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-xl flex items-center justify-between cursor-pointer hover:bg-teal-500/15 transition-colors block"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-teal-400" />
                        <div>
                          <p className="text-xs font-bold text-teal-300">
                            {pendingDepositsCount} Pending Deposit Slips
                          </p>
                          <p className="text-[10px] text-zinc-400">Verification required</p>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-teal-400" />
                    </Link>
                  )}

                  {(user.role === 'manager' || user.role === 'admin') && pendingMealRequestsCount > 0 && (
                    <Link
                      href="/dashboard/meals"
                      onClick={() => setNotifDropdownOpen(false)}
                      className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between cursor-pointer hover:bg-amber-500/20 transition-colors block"
                    >
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-400 animate-pulse" />
                        <div>
                          <p className="text-xs font-bold text-amber-300">
                            {pendingMealRequestsCount} Late Meal-Off Requests
                          </p>
                          <p className="text-[10px] text-zinc-400">Urgent manager review required</p>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                    </Link>
                  )}

                  <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="text-[11px] text-zinc-300">
                      Auto-booking is active. Daily cutoff is 9:00 AM for Lunch & 3:00 PM for Dinner.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar with dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all cursor-pointer"
            >
              {user.image || user.photoURL ? (
                <img
                  src={user.image || user.photoURL}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-lg object-cover border border-emerald-500/30 shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:block text-left max-w-[100px] truncate">
                <p className="text-xs font-bold text-zinc-200 truncate leading-tight">
                  {user.name}
                </p>
                <p className="text-[9px] text-zinc-500 font-mono capitalize">
                  {user.role}
                </p>
              </div>
              <ChevronDown className="w-3 h-3 text-zinc-400 hidden sm:block" />
            </button>

            {/* Profile Menu Dropdown */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-3 border-b border-zinc-800/80 flex items-center gap-3">
                  {user.image || user.photoURL ? (
                    <img
                      src={user.image || user.photoURL}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-xl object-cover border border-emerald-500/40 shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-zinc-100 truncate">{user.name}</p>
                    <p className="text-[10px] text-zinc-400 truncate font-mono">{user.email}</p>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      setIsProfileOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer text-left"
                  >
                    <Settings className="w-4 h-4 text-emerald-400" />
                    Profile & Password
                  </button>

                  {user.role === 'manager' && (
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        toggleRoleView();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer text-left"
                    >
                      <ChefHat className="w-4 h-4 text-teal-400" />
                      Switch to {activeRoleView === 'manager' ? 'Member Mode' : 'Manager Mode'}
                    </button>
                  )}
                </div>

                <div className="pt-1 border-t border-zinc-800/80">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
