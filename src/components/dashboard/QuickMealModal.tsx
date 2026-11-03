'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '@/src/context/DashboardContext';
import RequestMealOffModal from './RequestMealOffModal';
import { Utensils, X, Sun, Moon, Check, AlertCircle, RefreshCw, Clock, Send } from 'lucide-react';

interface MealDetail {
  isOn: boolean;
  isCutoffPassed: boolean;
  isLocked?: boolean;
  menu?: string;
  requestStatus?: 'none' | 'pending' | 'accepted' | 'rejected';
  requestReason?: string;
}

interface QuickDay {
  dateStr: string;
  label: string;
  isToday: boolean;
  lunch: MealDetail;
  dinner: MealDetail;
}

export default function QuickMealModal() {
  const { token, isQuickMealOpen, setIsQuickMealOpen, refreshAll } = useDashboard();
  const [days, setDays] = useState<QuickDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Late Request Modal state
  const [requestModalData, setRequestModalData] = useState<{
    isOpen: boolean;
    date: string;
    mealType: 'lunch' | 'dinner';
    cutoffTime: string;
  }>({
    isOpen: false,
    date: '',
    mealType: 'lunch',
    cutoffTime: '09:00 AM',
  });

  const fetchQuickMeals = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const today = new Date();
      const datesToFetch = [
        { d: new Date(today), label: 'Today (' + today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ')', isToday: true },
        { d: new Date(today.getTime() + 86400000), label: 'Tomorrow (' + new Date(today.getTime() + 86400000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ')', isToday: false },
      ];

      const loadedDays: QuickDay[] = [];
      const currentHour = today.getHours();

      for (const item of datesToFetch) {
        const dateStr = item.d.toISOString().split('T')[0];
        const res = await fetch(`/api/records/toggle-meal?date=${dateStr}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const lunchRec = data.records?.find((r: any) => r.mealType === 'lunch');
          const dinnerRec = data.records?.find((r: any) => r.mealType === 'dinner');

          loadedDays.push({
            dateStr,
            label: item.label,
            isToday: item.isToday,
            lunch: {
              isOn: lunchRec ? lunchRec.isOn : true,
              isCutoffPassed: item.isToday && currentHour >= 9,
              isLocked: Boolean(lunchRec?.isLocked),
              menu: lunchRec?.menu || '',
              requestStatus: lunchRec?.requestStatus,
              requestReason: lunchRec?.requestReason,
            },
            dinner: {
              isOn: dinnerRec ? dinnerRec.isOn : true,
              isCutoffPassed: item.isToday && currentHour >= 15,
              isLocked: Boolean(dinnerRec?.isLocked),
              menu: dinnerRec?.menu || '',
              requestStatus: dinnerRec?.requestStatus,
              requestReason: dinnerRec?.requestReason,
            },
          });
        } else {
          loadedDays.push({
            dateStr,
            label: item.label,
            isToday: item.isToday,
            lunch: { isOn: true, isCutoffPassed: item.isToday && currentHour >= 9 },
            dinner: { isOn: true, isCutoffPassed: item.isToday && currentHour >= 15 },
          });
        }
      }

      setDays(loadedDays);
    } catch (e: any) {
      setErrorMsg('Failed to load meal status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isQuickMealOpen) {
      fetchQuickMeals();
    }
  }, [isQuickMealOpen, token]);

  const handleToggle = async (dateStr: string, mealType: 'lunch' | 'dinner', currentVal: boolean, isCutoffPassed: boolean) => {
    if (!token) return;

    // If currently ON and cut-off has passed, open late request modal
    if (currentVal && isCutoffPassed) {
      setRequestModalData({
        isOpen: true,
        date: dateStr,
        mealType,
        cutoffTime: mealType === 'lunch' ? '09:00 AM' : '03:00 PM (15:00)',
      });
      return;
    }

    const toggleKey = `${dateStr}-${mealType}`;
    setToggling(toggleKey);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const action = currentVal ? 'off' : 'on';
      const res = await fetch('/api/records/toggle-meal', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date: dateStr, mealType, action }),
      });

      if (res.ok) {
        setDays(prev =>
          prev.map(d =>
            d.dateStr === dateStr
              ? {
                  ...d,
                  [mealType]: {
                    ...d[mealType],
                    isOn: !currentVal,
                    requestStatus: 'none',
                  },
                }
              : d
          )
        );
        setSuccessMsg(`Toggled ${mealType} ${action === 'on' ? 'ON' : 'OFF'}!`);
        refreshAll();
      } else {
        const err = await res.json();
        if (err.cutoffPassed) {
          setRequestModalData({
            isOpen: true,
            date: dateStr,
            mealType,
            cutoffTime: err.cutoffTime || (mealType === 'lunch' ? '09:00 AM' : '03:00 PM'),
          });
        } else {
          setErrorMsg(err.message || 'Cannot change meal at this time');
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Network error');
    } finally {
      setToggling(null);
    }
  };

  if (!isQuickMealOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-zinc-100">
                  Quick Meal Toggle
                </h3>
                <p className="text-xs text-zinc-400">
                  Manage meal bookings with smart cut-off checks
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsQuickMealOpen(false)}
              className="p-2 text-zinc-400 hover:text-zinc-200 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status alerts */}
          {errorMsg && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Body */}
          <div className="mt-5 space-y-4">
            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
                <p className="text-xs text-zinc-400">Fetching current meal statuses...</p>
              </div>
            ) : (
              days.map(day => (
                <div
                  key={day.dateStr}
                  className="p-4 bg-zinc-900/70 border border-zinc-800/80 rounded-2xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                      {day.label}
                      {day.isToday && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          Active Day
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {day.dateStr}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Lunch Toggle */}
                    <div className="space-y-1">
                      <button
                        onClick={() => handleToggle(day.dateStr, 'lunch', day.lunch.isOn, day.lunch.isCutoffPassed)}
                        disabled={day.lunch.isLocked || toggling === `${day.dateStr}-lunch` || day.lunch.requestStatus === 'pending'}
                        className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${
                          day.lunch.isLocked
                            ? 'bg-zinc-900/80 border-red-900/40 text-zinc-400 cursor-not-allowed opacity-80'
                            : day.lunch.requestStatus === 'pending'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 cursor-wait'
                            : day.lunch.isOn
                            ? day.lunch.isCutoffPassed
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:border-amber-400 cursor-pointer'
                              : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 cursor-pointer'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-500 hover:border-zinc-700 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Sun className="w-4 h-4 shrink-0" />
                          <div className="text-left truncate">
                            <p className="text-xs font-bold">Lunch</p>
                            <p className="text-[10px] opacity-80 truncate">
                              {day.lunch.isLocked
                                ? '🔒 Kitchen Locked'
                                : day.lunch.requestStatus === 'pending'
                                ? 'Req Pending'
                                : day.lunch.isOn
                                ? day.lunch.isCutoffPassed
                                  ? 'Cutoff Passed'
                                  : 'Active (ON)'
                                : 'Cancelled (OFF)'}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                            day.lunch.isLocked
                              ? 'bg-red-950/60 text-red-400 border border-red-800/50 text-[10px]'
                              : day.lunch.requestStatus === 'pending'
                              ? 'bg-amber-500/30 text-amber-300'
                              : day.lunch.isOn
                              ? day.lunch.isCutoffPassed
                                ? 'bg-amber-500 text-zinc-950 text-[10px]'
                                : 'bg-emerald-500 text-zinc-950'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {day.lunch.isLocked
                            ? '🔒'
                            : toggling === `${day.dateStr}-lunch`
                            ? '...'
                            : day.lunch.requestStatus === 'pending'
                            ? '⏳'
                            : day.lunch.isOn
                            ? day.lunch.isCutoffPassed
                              ? 'Off?'
                              : '✓'
                            : '✕'}
                        </div>
                      </button>

                      {day.lunch.isLocked ? (
                        <p className="text-[9px] text-red-400 text-center font-medium">
                          রান্নার চাল-ডাল চুলায় উঠে গেছে {day.lunch.menu ? `(${day.lunch.menu})` : ''}
                        </p>
                      ) : day.lunch.isCutoffPassed && day.lunch.isOn && day.lunch.requestStatus !== 'pending' ? (
                        <p className="text-[9px] text-amber-400 text-center font-medium">
                          Past 9 AM → Tap to request off
                        </p>
                      ) : null}
                    </div>

                    {/* Dinner Toggle */}
                    <div className="space-y-1">
                      <button
                        onClick={() => handleToggle(day.dateStr, 'dinner', day.dinner.isOn, day.dinner.isCutoffPassed)}
                        disabled={day.dinner.isLocked || toggling === `${day.dateStr}-dinner` || day.dinner.requestStatus === 'pending'}
                        className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${
                          day.dinner.isLocked
                            ? 'bg-zinc-900/80 border-red-900/40 text-zinc-400 cursor-not-allowed opacity-80'
                            : day.dinner.requestStatus === 'pending'
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 cursor-wait'
                            : day.dinner.isOn
                            ? day.dinner.isCutoffPassed
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:border-amber-400 cursor-pointer'
                              : 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 cursor-pointer'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-500 hover:border-zinc-700 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Moon className="w-4 h-4 shrink-0" />
                          <div className="text-left truncate">
                            <p className="text-xs font-bold">Dinner</p>
                            <p className="text-[10px] opacity-80 truncate">
                              {day.dinner.isLocked
                                ? '🔒 Kitchen Locked'
                                : day.dinner.requestStatus === 'pending'
                                ? 'Req Pending'
                                : day.dinner.isOn
                                ? day.dinner.isCutoffPassed
                                  ? 'Cutoff Passed'
                                  : 'Active (ON)'
                                : 'Cancelled (OFF)'}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                            day.dinner.isLocked
                              ? 'bg-red-950/60 text-red-400 border border-red-800/50 text-[10px]'
                              : day.dinner.requestStatus === 'pending'
                              ? 'bg-indigo-500/30 text-indigo-300'
                              : day.dinner.isOn
                              ? day.dinner.isCutoffPassed
                                ? 'bg-amber-500 text-zinc-950 text-[10px]'
                                : 'bg-indigo-500 text-zinc-950'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {day.dinner.isLocked
                            ? '🔒'
                            : toggling === `${day.dateStr}-dinner`
                            ? '...'
                            : day.dinner.requestStatus === 'pending'
                            ? '⏳'
                            : day.dinner.isOn
                            ? day.dinner.isCutoffPassed
                              ? 'Off?'
                              : '✓'
                            : '✕'}
                        </div>
                      </button>

                      {day.dinner.isLocked ? (
                        <p className="text-[9px] text-red-400 text-center font-medium">
                          রান্নার চাল-ডাল চুলায় উঠে গেছে {day.dinner.menu ? `(${day.dinner.menu})` : ''}
                        </p>
                      ) : day.dinner.isCutoffPassed && day.dinner.isOn && day.dinner.requestStatus !== 'pending' ? (
                        <p className="text-[9px] text-amber-400 text-center font-medium">
                          Past 3 PM → Tap to request off
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer with cutoff rules */}
          <div className="mt-5 pt-3 border-t border-zinc-800/80 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                Cutoffs: Lunch 9 AM | Dinner 3 PM
              </span>
              <span className="text-emerald-400 font-bold">Max 3 days advance</span>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setIsQuickMealOpen(false)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Request Late Meal Off Modal */}
      <RequestMealOffModal
        isOpen={requestModalData.isOpen}
        onClose={() => setRequestModalData(prev => ({ ...prev, isOpen: false }))}
        token={token || ''}
        date={requestModalData.date}
        mealType={requestModalData.mealType}
        cutoffTime={requestModalData.cutoffTime}
        onSuccess={() => {
          fetchQuickMeals();
          refreshAll();
        }}
      />
    </>
  );
}
