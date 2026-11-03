'use client';

import React, { useState, useEffect } from 'react';
import { History, User, Building2, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { MonthlyHistoryRecord, MessMonthlyHistoryRecord } from '@/src/types';

interface HistoryTabProps {
  token: string;
  onError?: (msg: string) => void;
}

export default function HistoryTab({ token, onError }: HistoryTabProps) {
  const [individualHistory, setIndividualHistory] = useState<MonthlyHistoryRecord[]>([]);
  const [messHistory, setMessHistory] = useState<MessMonthlyHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/history/monthly', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setIndividualHistory(data.individualHistory || []);
          setMessHistory(data.messHistory || []);
        } else {
          onError?.('Failed to load history data');
        }
      } catch (error) {
        console.error('Error fetching monthly history', error);
        onError?.('Failed to load monthly history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [token, onError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-xs text-zinc-400">Loading History Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* === TABLE 1: INDIVIDUAL MONTHLY COST HISTORY === */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-500" />
              My Individual Monthly Cost History
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Personal breakdown of fixed costs, meal costs, and total month expenses
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-lg">
            Personal History
          </span>
        </div>

        {/* Desktop View: Table Container */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-bold">
                <th className="p-3">Month</th>
                <th className="p-3">Fixed Cost</th>
                <th className="p-3">Actual Meal Cost</th>
                <th className="p-3">Total Month Cost</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {individualHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-zinc-400 text-xs">
                    No individual cost history available yet.
                  </td>
                </tr>
              ) : (
                individualHistory.map((item) => (
                  <tr key={item.month} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3 font-bold text-zinc-900 dark:text-white">
                      {item.monthName}
                    </td>
                    <td className="p-3 font-semibold text-indigo-600 dark:text-indigo-400">
                      ৳{item.fixedCost}
                    </td>
                    <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400">
                      ৳{item.mealCost}
                    </td>
                    <td className="p-3 font-extrabold text-zinc-900 dark:text-white">
                      ৳{item.totalCost}
                    </td>
                    <td className="p-3 text-right">
                      {item.status === 'settled' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Settled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full border border-amber-500/20">
                          <Clock className="w-3 h-3" />
                          {item.status === 'in_progress' ? 'In Progress' : 'Pending'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: High-End Responsive Touch Cards */}
        <div className="md:hidden space-y-2.5">
          {individualHistory.length === 0 ? (
            <div className="p-6 text-center text-zinc-400 text-xs">
              No individual cost history available yet.
            </div>
          ) : (
            individualHistory.map((item) => (
              <div
                key={item.month}
                className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm text-zinc-900 dark:text-white">{item.monthName}</p>
                  {item.status === 'settled' ? (
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-extrabold rounded-full border border-emerald-500/20">
                      Settled ✓
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] font-extrabold rounded-full border border-amber-500/20">
                      In Progress ⏳
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-zinc-200/60 dark:border-zinc-700/60 text-center">
                  <div className="p-1.5 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                    <p className="text-[9px] text-zinc-400">Fixed</p>
                    <p className="text-xs font-bold text-indigo-400 mt-0.5">৳{item.fixedCost}</p>
                  </div>
                  <div className="p-1.5 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                    <p className="text-[9px] text-zinc-400">Meals</p>
                    <p className="text-xs font-bold text-emerald-400 mt-0.5">৳{item.mealCost}</p>
                  </div>
                  <div className="p-1.5 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                    <p className="text-[9px] text-zinc-400">Total</p>
                    <p className="text-xs font-black text-zinc-100 mt-0.5">৳{item.totalCost}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* === TABLE 2: WHOLE MESS MONTHLY COST HISTORY === */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-500" />
              Whole Mess Monthly Cost History
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Aggregated mess fixed costs, bazaar expenses, and total mess budget
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 rounded-lg">
            Mess Overall
          </span>
        </div>

        {/* Desktop View: Table Container */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-bold">
                <th className="p-3">Month</th>
                <th className="p-3">Mess Fixed Cost</th>
                <th className="p-3">Mess Meal/Bazaar Cost</th>
                <th className="p-3">Total Mess Cost</th>
                <th className="p-3 text-right">Mess Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {messHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-zinc-400 text-xs">
                    No mess cost history available yet.
                  </td>
                </tr>
              ) : (
                messHistory.map((item) => (
                  <tr key={item.month} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3 font-bold text-zinc-900 dark:text-white">
                      {item.monthName}
                    </td>
                    <td className="p-3 font-semibold text-indigo-600 dark:text-indigo-400">
                      ৳{item.totalFixedCost}
                    </td>
                    <td className="p-3 font-semibold text-amber-600 dark:text-amber-400">
                      ৳{item.totalMealCost}
                    </td>
                    <td className="p-3 font-extrabold text-zinc-900 dark:text-white">
                      ৳{item.totalMessCost}
                    </td>
                    <td className="p-3 text-right">
                      {item.status === 'settled' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Archived & Settled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full border border-blue-500/20">
                          <Clock className="w-3 h-3" />
                          Active Month
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: High-End Responsive Touch Cards */}
        <div className="md:hidden space-y-2.5">
          {messHistory.length === 0 ? (
            <div className="p-6 text-center text-zinc-400 text-xs">
              No mess cost history available yet.
            </div>
          ) : (
            messHistory.map((item) => (
              <div
                key={item.month}
                className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm text-zinc-900 dark:text-white">{item.monthName}</p>
                  {item.status === 'settled' ? (
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-extrabold rounded-full border border-emerald-500/20">
                      Settled ✓
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] font-extrabold rounded-full border border-blue-500/20">
                      Active Month ⏳
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-zinc-200/60 dark:border-zinc-700/60 text-center">
                  <div className="p-1.5 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                    <p className="text-[9px] text-zinc-400">Fixed Cost</p>
                    <p className="text-xs font-bold text-indigo-400 mt-0.5">৳{item.totalFixedCost}</p>
                  </div>
                  <div className="p-1.5 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                    <p className="text-[9px] text-zinc-400">Bazaar Cost</p>
                    <p className="text-xs font-bold text-amber-400 mt-0.5">৳{item.totalMealCost}</p>
                  </div>
                  <div className="p-1.5 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                    <p className="text-[9px] text-zinc-400">Total Mess</p>
                    <p className="text-xs font-black text-zinc-100 mt-0.5">৳{item.totalMessCost}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
