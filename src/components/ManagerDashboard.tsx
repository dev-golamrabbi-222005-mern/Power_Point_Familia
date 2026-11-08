'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User, MealMenu, SystemSettings } from '../types';
import ManagerOverviewTab from './dashboard/(manager)/ManagerOverviewTab';
import { TrendingUp, RefreshCw, Utensils, X, AlertTriangle } from 'lucide-react';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '@/src/lib/alerts';

interface ManagerDashboardProps {
  user: User;
  token: string;
  menus: MealMenu[];
  mealRate: number;
  onRefreshMenus: () => void;
}

export default function ManagerDashboard({
  user,
  token,
  menus,
  mealRate,
  onRefreshMenus,
}: ManagerDashboardProps) {
  const [autoBookEnabled, setAutoBookEnabled] = useState(true);
  const [autoBookLoading, setAutoBookLoading] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  const [resetStatusMsg, setResetStatusMsg] = useState('');
  const [initiateResetLoading, setInitiateResetLoading] = useState(false);

  const handleError = useCallback((msg: string) => {
    console.error(msg);
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        if (data.autoBookMeals !== undefined) {
          setAutoBookEnabled(data.autoBookMeals);
        }
      }
    } catch (err) {
      console.error('Error fetching settings', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const handleInitiateMonthEnd = async () => {
    const confirmed = await showConfirmAlert(
      'Initiate Month-End Reset?',
      'This will calculate month-end balances and submit a reset request to Admin.',
      'Yes, Initiate'
    );
    if (!confirmed) return;
    try {
      setInitiateResetLoading(true);
      const res = await fetch('/api/month-end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'initiate' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Initiate reset failed');
      showSuccessAlert(
        'Reset Initiated',
        'Month-End Reset initiated successfully! Sent to Admin for final approval.'
      );
      setResetStatusMsg('Month-End Reset initiated successfully! Sent to Admin for final approval.');
    } catch (err: any) {
      showErrorAlert('Error', err.message || 'Month end reset error');
    } finally {
      setInitiateResetLoading(false);
    }
  };

  const [isMealOffModalOpen, setIsMealOffModalOpen] = useState(false);
  const [mealOffMonth, setMealOffMonth] = useState(new Date().toISOString().slice(0, 7));
  const [mealOffReason, setMealOffReason] = useState('Ramadan / Semester Break / All members away');
  const [mealOffSubmitting, setMealOffSubmitting] = useState(false);

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const isCurrentMonthMealOff = Boolean(settings?.closedMealMonths?.includes(currentMonthStr));

  const handleRequestMealOff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealOffMonth) return;
    try {
      setMealOffSubmitting(true);
      const res = await fetch('/api/admin/change-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'meal_off_month',
          details: `Manager requested Total Meal Off for month ${mealOffMonth}. Reason: ${mealOffReason}`,
          newValue: { month: mealOffMonth, reason: mealOffReason },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed');
      await showSuccessAlert(
        'Meal-Off Request Submitted',
        'Request sent to Admin for approval. Once approved, meal operations for this month will be closed.'
      );
      setIsMealOffModalOpen(false);
      fetchSettings();
    } catch (err: any) {
      showErrorAlert('Error', err.message || 'Failed to submit request');
    } finally {
      setMealOffSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Permanent Month-End Reset & Meal Off Control Banner */}
      <div className="bg-gradient-to-r from-purple-900/30 via-zinc-900 to-amber-900/20 border border-purple-500/30 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/20 rounded-xl">
            <RefreshCw className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h4 className="font-display font-bold text-sm text-zinc-100 flex items-center gap-2">
              Month Control & Reset Engine
              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                Manager Control
              </span>
              {isCurrentMonthMealOff && (
                <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
                  Meal Closed This Month
                </span>
              )}
            </h4>
            <p className="text-xs text-zinc-400">
              Calculate month balances, reset engine, or submit request to close meal operations for an entire month.
            </p>
            {resetStatusMsg && (
              <p className="text-xs text-emerald-400 font-bold mt-1">{resetStatusMsg}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsMealOffModalOpen(true)}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl transition-all border border-zinc-700 shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <Utensils className="w-4 h-4 text-amber-400" />
            <span>Request Month Meal Off</span>
          </button>
          <button
            onClick={handleInitiateMonthEnd}
            disabled={initiateResetLoading}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${initiateResetLoading ? 'animate-spin' : ''}`} />
            <span>Initiate Month-End Reset</span>
          </button>
        </div>
      </div>

      {/* Manager Control Center Banner */}
      <div className="bg-gradient-to-r from-emerald-600/20 via-emerald-500/10 to-teal-600/20 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/15 rounded-xl">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              Manager Control Center
            </p>
            <p className="text-lg md:text-xl font-black text-zinc-100">
              Power Point Familia Manager Overview
            </p>
          </div>
        </div>
      </div>

      {/* Manager Overview Content */}
      <ManagerOverviewTab token={token} onError={handleError} />

      {/* Request Month Meal Off Modal */}
      {isMealOffModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-4">
            <button
              onClick={() => setIsMealOffModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 p-2 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl">
                <Utensils className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">
                  Request Month Meal Off (মিল বন্ধের আবেদন)
                </h3>
                <p className="text-xs text-zinc-400">
                  Submit request to Admin to close meal services for an entire month.
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
              <p className="font-bold mb-1">সিস্টেমের আচরণ:</p>
              <ul className="list-disc list-inside space-y-0.5 text-zinc-400">
                <li>অ্যাডমিন অনুমোদন দিলে ওই মাসের মিল সার্ভিস বন্ধ হয়ে যাবে।</li>
                <li>মেম্বাররা কোনো মিল বুক বা টগল করতে পারবে না।</li>
                <li>বাজার অ্যাসাইনমেন্ট ও লাইভ বাজার বন্ধ থাকবে।</li>
                <li>ফিক্সড কস্টের মধ্যে শুধু বাড়ি ভাড়া ও বিদ্যুৎ থাকবে; খালা বিল, ওয়াইফাই ও গ্যাস বিল বাদ যাবে (৳০)।</li>
              </ul>
            </div>

            <form onSubmit={handleRequestMealOff} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Target Month (YYYY-MM)
                </label>
                <input
                  type="month"
                  required
                  value={mealOffMonth}
                  onChange={(e) => setMealOffMonth(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Reason for Meal Off (আবেদনের কারণ)
                </label>
                <textarea
                  rows={3}
                  required
                  value={mealOffReason}
                  onChange={(e) => setMealOffReason(e.target.value)}
                  placeholder="e.g. Ramadan month / Semester vacation / Mess renovation"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMealOffModalOpen(false)}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mealOffSubmitting}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {mealOffSubmitting ? 'Submitting...' : 'Submit to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
