'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sun, 
  Moon, 
  Check, 
  X, 
  AlertCircle, 
  Clock, 
  Calendar, 
  ShieldAlert, 
  FileText, 
  CheckCircle2, 
  XCircle,
  Sparkles,
  Lock
} from 'lucide-react';
import RequestMealOffModal from '@/src/components/dashboard/RequestMealOffModal';

interface MealTabProps {
  token: string;
  onError?: (msg: string) => void;
}

interface MealStatus {
  mealType: 'lunch' | 'dinner';
  isOn: boolean;
  count: number;
  requestStatus?: 'none' | 'pending' | 'accepted' | 'rejected';
  requestReason?: string;
  requestedAt?: string;
  isCutoffPassed?: boolean;
  isLocked?: boolean;
  menu?: string;
  lockedAt?: string | null;
}

interface MealDay {
  date: string;
  dayLabel: string;
  daysAhead: number;
  lunch: MealStatus;
  dinner: MealStatus;
}

export default function MealTab({ token, onError }: MealTabProps) {
  const [todaySummary, setTodaySummary] = useState<{
    myMeals: number;
    messMeals: number;
  } | null>(null);

  const [todayLunch, setTodayLunch] = useState<MealStatus | null>(null);
  const [todayDinner, setTodayDinner] = useState<MealStatus | null>(null);
  const [upcomingMeals, setUpcomingMeals] = useState<MealDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  // Request Meal Off modal
  const [requestModalState, setRequestModalState] = useState<{
    isOpen: boolean;
    date: string;
    mealType: 'lunch' | 'dinner';
  }>({
    isOpen: false,
    date: '',
    mealType: 'lunch',
  });

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  useEffect(() => {
    fetchMealData();
  }, [token]);

  const fetchMealData = async () => {
    try {
      setLoading(true);

      // 1. Fetch member overview for high level stats
      const overviewRes = await fetch('/api/dashboard/member-overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (overviewRes.ok) {
        const ovData = await overviewRes.json();
        setTodaySummary({
          myMeals: ovData.todayMyMeals ?? 0,
          messMeals: ovData.todayMessMeals ?? 0,
        });
      }

      // 2. Fetch today's detailed meal record (including cut-off and requestStatus)
      const todayRes = await fetch(`/api/records/toggle-meal?date=${todayStr}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (todayRes.ok) {
        const todayData = await todayRes.json();
        const lunch = todayData.records?.find((r: any) => r.mealType === 'lunch');
        const dinner = todayData.records?.find((r: any) => r.mealType === 'dinner');
        
        setTodayLunch(lunch || {
          mealType: 'lunch',
          isOn: true,
          count: 1,
          isCutoffPassed: now.getHours() >= 9,
          requestStatus: 'none',
        });

        setTodayDinner(dinner || {
          mealType: 'dinner',
          isOn: true,
          count: 1,
          isCutoffPassed: now.getHours() >= 15,
          requestStatus: 'none',
        });
      }

      // 3. Fetch upcoming 3 days (rolling 3-day window)
      const upcoming: MealDay[] = [];
      for (let i = 1; i <= 3; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        const mealRes = await fetch(`/api/records/toggle-meal?date=${dateStr}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (mealRes.ok) {
          const mealData = await mealRes.json();
          const lunch = mealData.records?.find((r: any) => r.mealType === 'lunch');
          const dinner = mealData.records?.find((r: any) => r.mealType === 'dinner');

          upcoming.push({
            date: dateStr,
            dayLabel: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            daysAhead: i,
            lunch: { 
              mealType: 'lunch', 
              isOn: lunch?.isOn ?? true, 
              count: lunch?.count ?? 1,
              requestStatus: lunch?.requestStatus || 'none'
            },
            dinner: { 
              mealType: 'dinner', 
              isOn: dinner?.isOn ?? true, 
              count: dinner?.count ?? 1,
              requestStatus: dinner?.requestStatus || 'none'
            },
          });
        }
      }
      setUpcomingMeals(upcoming);
    } catch (error) {
      console.error('Error fetching meal data', error);
      onError?.('Failed to load meal data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMeal = async (date: string, mealType: 'lunch' | 'dinner', currentState: boolean) => {
    try {
      setToggling(`${date}-${mealType}`);
      const action = currentState ? 'off' : 'on';

      const res = await fetch('/api/records/toggle-meal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date, mealType, action }),
      });

      const data = await res.json();

      if (res.ok) {
        if (date === todayStr) {
          if (mealType === 'lunch') {
            setTodayLunch(prev => prev ? { ...prev, isOn: !currentState, count: !currentState ? 1 : 0 } : null);
          } else {
            setTodayDinner(prev => prev ? { ...prev, isOn: !currentState, count: !currentState ? 1 : 0 } : null);
          }
        } else {
          setUpcomingMeals(prev =>
            prev.map(day =>
              day.date === date
                ? {
                    ...day,
                    [mealType]: { ...day[mealType], isOn: !currentState, count: !currentState ? 1 : 0 },
                  }
                : day
            )
          );
        }
        // Refresh overview
        fetchMealData();
      } else {
        // If cut-off passed, trigger request modal automatically
        if (data.cutoffPassed) {
          setRequestModalState({
            isOpen: true,
            date,
            mealType,
          });
        } else {
          onError?.(data.message || `Failed to toggle ${mealType}`);
        }
      }
    } catch (error) {
      console.error('Error toggling meal', error);
      onError?.('Failed to toggle meal');
    } finally {
      setToggling(null);
    }
  };

  const openRequestModal = (mealType: 'lunch' | 'dinner') => {
    setRequestModalState({
      isOpen: true,
      date: todayStr,
      mealType,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-xs text-zinc-400">Loading meal preferences & schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* === TOP SUMMARY METRICS === */}
      {todaySummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-xl border border-blue-200/80 dark:border-blue-800/60 shadow-xs">
            <p className="text-xs text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wider mb-1">Today My Meals</p>
            <p className="text-3xl font-extrabold text-blue-900 dark:text-blue-100">{todaySummary.myMeals}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">Logged for today</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-violet-50/50 dark:from-purple-950/20 dark:to-violet-950/20 p-4 rounded-xl border border-purple-200/80 dark:border-purple-800/60 shadow-xs">
            <p className="text-xs text-purple-700 dark:text-purple-300 font-bold uppercase tracking-wider mb-1">Mess Total Today</p>
            <p className="text-3xl font-extrabold text-purple-900 dark:text-purple-100">{todaySummary.messMeals}</p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">All members active</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 p-4 rounded-xl border border-amber-200/80 dark:border-amber-800/60 shadow-xs">
            <div className="flex items-center gap-1.5 mb-1">
              <Sun className="w-4 h-4 text-amber-500" />
              <p className="text-xs text-amber-700 dark:text-amber-300 font-bold uppercase tracking-wider">Lunch Cut-off</p>
            </div>
            <p className="text-2xl font-extrabold text-amber-900 dark:text-amber-100">09:00 AM</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
              {todayLunch?.isLocked 
                ? '🔒 Kitchen Locked' 
                : todayLunch?.isCutoffPassed 
                ? '⚠️ Cut-off Passed' 
                : '🟢 Normal toggle active'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 dark:from-indigo-950/20 dark:to-blue-950/20 p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs">
            <div className="flex items-center gap-1.5 mb-1">
              <Moon className="w-4 h-4 text-indigo-500" />
              <p className="text-xs text-indigo-700 dark:text-indigo-300 font-bold uppercase tracking-wider">Dinner Cut-off</p>
            </div>
            <p className="text-2xl font-extrabold text-indigo-900 dark:text-indigo-100">03:00 PM</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
              {todayDinner?.isLocked 
                ? '🔒 Kitchen Locked' 
                : todayDinner?.isCutoffPassed 
                ? '⚠️ Cut-off Passed' 
                : '🟢 Normal toggle active'}
            </p>
          </div>
        </div>
      )}

      {/* === TODAY'S MEALS: SMART CUT-OFF & REQUEST MEAL OFF SECTION === */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              Today's Meal Controls ({todayStr})
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Manage today's meal status. Direct turn-off is available before cut-off time; after cut-off or kitchen lock, meal state is locked for cooking.
            </p>
          </div>
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">
            Today
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* --- TODAY LUNCH CARD --- */}
          <div className={`p-4 rounded-xl border transition-all ${
            todayLunch?.isOn
              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/70'
              : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/60'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${
                  todayLunch?.isOn ? 'bg-amber-500 text-white shadow-sm' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
                }`}>
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Lunch (দুপুরের খাবার)</h3>
                    {todayLunch?.isLocked && (
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Expected Cut-off: 09:00 AM
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-right">
                <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                  todayLunch?.isOn
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                }`}>
                  {todayLunch?.isOn ? 'ON (1 Meal)' : 'OFF (0 Meal)'}
                </span>
              </div>
            </div>

            {/* Request Status Banner if late request exists */}
            {todayLunch?.requestStatus && todayLunch.requestStatus !== 'none' && (
              <div className={`mb-3 p-2.5 rounded-lg text-xs font-medium border flex items-start gap-2 ${
                todayLunch.requestStatus === 'pending'
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                  : todayLunch.requestStatus === 'accepted'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200'
              }`}>
                {todayLunch.requestStatus === 'pending' && <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                {todayLunch.requestStatus === 'accepted' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                {todayLunch.requestStatus === 'rejected' && <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                <div>
                  <p className="font-bold">
                    {todayLunch.requestStatus === 'pending' && '⏳ Meal-Off Request Pending Review'}
                    {todayLunch.requestStatus === 'accepted' && '✓ Late Meal-Off Request Accepted by Manager (No Charge)'}
                    {todayLunch.requestStatus === 'rejected' && '✕ Meal-Off Request Rejected by Manager (Meal Counted)'}
                  </p>
                  {todayLunch.requestReason && (
                    <p className="text-[11px] opacity-90 mt-0.5">Reason: "{todayLunch.requestReason}"</p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between gap-2">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {todayLunch?.isLocked 
                  ? `${todayLunch?.menu ? `🍲 মেনু: ${todayLunch.menu}` : 'No Menu'}`
                  : todayLunch?.isCutoffPassed 
                  ? 'Expected cut-off passed for lunch' 
                  : 'Before cut-off (direct toggle)'}
              </span>

              {todayLunch?.isLocked ? (
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 bg-zinc-200/80 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-not-allowed select-none">
                    <Lock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>রান্না শুরুর জন্য লকড</span>
                  </div>
                </div>
              ) : todayLunch?.isOn ? (
                todayLunch.isCutoffPassed ? (
                  todayLunch.requestStatus === 'pending' ? (
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Request Submitted
                    </span>
                  ) : (
                    <button
                      onClick={() => openRequestModal('lunch')}
                      className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Request Meal Off</span>
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => handleToggleMeal(todayStr, 'lunch', true)}
                    disabled={toggling === `${todayStr}-lunch`}
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Turn OFF</span>
                  </button>
                )
              ) : (
                <button
                  onClick={() => handleToggleMeal(todayStr, 'lunch', false)}
                  disabled={toggling === `${todayStr}-lunch`}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Turn ON</span>
                </button>
              )}
            </div>
          </div>

          {/* --- TODAY DINNER CARD --- */}
          <div className={`p-4 rounded-xl border transition-all ${
            todayDinner?.isOn
              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/70'
              : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/60'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${
                  todayDinner?.isOn ? 'bg-indigo-600 text-white shadow-sm' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
                }`}>
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Dinner (রাতের খাবার)</h3>
                    {todayDinner?.isLocked && (
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Expected Cut-off: 03:00 PM
                  </p>
                  {todayDinner?.menu && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                      🍲 মেনু: {todayDinner.menu}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-right">
                <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                  todayDinner?.isOn
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                }`}>
                  {todayDinner?.isOn ? 'ON (1 Meal)' : 'OFF (0 Meal)'}
                </span>
              </div>
            </div>

            {/* Request Status Banner if late request exists */}
            {todayDinner?.requestStatus && todayDinner.requestStatus !== 'none' && (
              <div className={`mb-3 p-2.5 rounded-lg text-xs font-medium border flex items-start gap-2 ${
                todayDinner.requestStatus === 'pending'
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                  : todayDinner.requestStatus === 'accepted'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200'
              }`}>
                {todayDinner.requestStatus === 'pending' && <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                {todayDinner.requestStatus === 'accepted' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                {todayDinner.requestStatus === 'rejected' && <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                <div>
                  <p className="font-bold">
                    {todayDinner.requestStatus === 'pending' && '⏳ Meal-Off Request Pending Review'}
                    {todayDinner.requestStatus === 'accepted' && '✓ Late Meal-Off Request Accepted by Manager (No Charge)'}
                    {todayDinner.requestStatus === 'rejected' && '✕ Meal-Off Request Rejected by Manager (Meal Counted)'}
                  </p>
                  {todayDinner.requestReason && (
                    <p className="text-[11px] opacity-90 mt-0.5">Reason: "{todayDinner.requestReason}"</p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between gap-2">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {todayDinner?.isLocked 
                  ? `${todayDinner?.menu ? `🍲 মেনু: ${todayDinner.menu}` : 'No Menu'}` 
                  : todayDinner?.isCutoffPassed 
                  ? 'Expected cut-off passed for dinner' 
                  : 'Before cut-off (direct toggle)'}
              </span>

              {todayDinner?.isLocked ? (
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 bg-zinc-200/80 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-not-allowed select-none">
                    <Lock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>রান্না শুরুর জন্য লকড</span>
                  </div>
                </div>
              ) : todayDinner?.isOn ? (
                todayDinner.isCutoffPassed ? (
                  todayDinner.requestStatus === 'pending' ? (
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Request Submitted
                    </span>
                  ) : (
                    <button
                      onClick={() => openRequestModal('dinner')}
                      className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Request Meal Off</span>
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => handleToggleMeal(todayStr, 'dinner', true)}
                    disabled={toggling === `${todayStr}-dinner`}
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Turn OFF</span>
                  </button>
                )
              ) : (
                <button
                  onClick={() => handleToggleMeal(todayStr, 'dinner', false)}
                  disabled={toggling === `${todayStr}-dinner`}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Turn ON</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* === UPCOMING 3 DAYS (ROLLING 3-DAY ADVANCE OFF RULES) === */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              Rolling 3-Day Advance Schedule
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              You can turn off meals up to 3 days in advance. Subsequent days remain auto-booked by system rules.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg">
            3-Day Rolling Window
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {upcomingMeals.map(day => (
            <div key={day.date} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-sm text-zinc-900 dark:text-white">{day.dayLabel}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md">
                    +{day.daysAhead} day{day.daysAhead > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono mb-3">{day.date}</p>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                {/* Lunch */}
                <button
                  onClick={() => handleToggleMeal(day.date, 'lunch', day.lunch.isOn)}
                  disabled={toggling === `${day.date}-lunch`}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    day.lunch.isOn
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                      : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20'
                  } ${toggling === `${day.date}-lunch` ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Lunch: {day.lunch.isOn ? 'ON' : 'OFF'}</span>
                </button>

                {/* Dinner */}
                <button
                  onClick={() => handleToggleMeal(day.date, 'dinner', day.dinner.isOn)}
                  disabled={toggling === `${day.date}-dinner`}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    day.dinner.isOn
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                      : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20'
                  } ${toggling === `${day.date}-dinner` ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dinner: {day.dinner.isOn ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* === RULES & SYSTEM INFO BOX === */}
      <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800/60 p-4 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
          <p className="font-bold text-sm text-blue-950 dark:text-blue-100">Smart Meal Policy Guidelines (মেস মিল নীতিমালা)</p>
          <ul className="list-disc pl-4 space-y-0.5 text-blue-800 dark:text-blue-300">
            <li><strong>Lunch Cut-off:</strong> 09:00 AM (সকাল ৯:০০ টার আগে সাধারণ অন/অফ করা যায়)।</li>
            <li><strong>Dinner Cut-off:</strong> 03:00 PM (দুপুর ৩:০০ টার আগে সাধারণ অন/অফ করা যায়)।</li>
            <li><strong>Late Off Request:</strong> কাট-অফ পার হয়ে গেলে মেম্বার কারণ সহ "Request Meal Off" পাঠাতে পারবেন যা ম্যানেজার রান্না/বাজার শুরুর আগে অনুমোদন করতে পারবেন।</li>
            <li><strong>Rolling 3-Day Rule:</strong> সবসময় বর্তমান দিন থেকে আগামী ৩ দিন পর্যন্ত মিল অগ্রিম অফ রাখা সম্ভব। দীর্ঘ ছুটির ক্ষেত্রে উইন্ডো এগোনোর সাথে সাথে পরবর্তী দিনগুলো অফ করতে হবে।</li>
          </ul>
        </div>
      </div>

      {/* REQUEST MEAL OFF MODAL */}
      <RequestMealOffModal
        isOpen={requestModalState.isOpen}
        onClose={() => setRequestModalState(prev => ({ ...prev, isOpen: false }))}
        token={token}
        date={requestModalState.date}
        mealType={requestModalState.mealType}
        cutoffTime={requestModalState.mealType === 'lunch' ? '09:00 AM' : '03:00 PM'}
        onSuccess={() => {
          fetchMealData();
        }}
      />
    </div>
  );
}
