'use client';

import React, { useState, useEffect } from 'react';
import { History, Calendar, Users, Building2, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { MonthlyHistoryRecord, MessMonthlyHistoryRecord } from '@/src/types';

interface ManagerHistoryTabProps {
  token: string;
  onError?: (msg: string) => void;
}

export default function ManagerHistoryTab({ token, onError }: ManagerHistoryTabProps) {
  const [individualHistory, setIndividualHistory] = useState<MonthlyHistoryRecord[]>([]);
  const [messHistory, setMessHistory] = useState<MessMonthlyHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Computed KPIs
  const [monthsSettled, setMonthsSettled] = useState(0);
  const [cumulativeSpend, setCumulativeSpend] = useState(0);
  const [avgMealRate, setAvgMealRate] = useState(45);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/history/monthly', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const iHist: MonthlyHistoryRecord[] = data.individualHistory || [];
          const mHist: MessMonthlyHistoryRecord[] = data.messHistory || [];

          setIndividualHistory(iHist);
          setMessHistory(mHist);

          const settledCount = mHist.filter(m => m.status === 'settled').length;
          const totalSpend = mHist.reduce((s, m) => s + m.totalMessCost, 0);
          
          setMonthsSettled(settledCount);
          setCumulativeSpend(totalSpend);
          setAvgMealRate(45);
        } else {
          onError?.('Failed to load manager history');
        }
      } catch (err) {
        console.error('Error fetching manager history', err);
        onError?.('Failed to load history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-xs text-zinc-400">Loading Manager History Records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* === KPIS HEADER GRID === */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent dark:from-indigo-950/30 dark:to-zinc-900 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/60 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              Months Settled & Archived
            </p>
            <CheckCircle2 className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white">
            {monthsSettled} <span className="text-xs font-normal text-zinc-400">months</span>
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-950/30 dark:to-zinc-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Cumulative Mess Spend
            </p>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white">
            ৳{cumulativeSpend}
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-950/30 dark:to-zinc-900 p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Historical Tracked Months
            </p>
            <Calendar className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white">
            {messHistory.length} <span className="text-xs font-normal text-zinc-400">total months</span>
          </p>
        </div>
      </div>

      {/* === TABLE 1: EVERYONE'S COST HISTORY === */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" />
              Members Monthly Expenses History
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Breakdown of individual fixed costs, meal costs, and total monthly costs
            </p>
          </div>
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-bold">
                <th className="p-3">Month</th>
                <th className="p-3">Fixed Costs Paid</th>
                <th className="p-3">Meal Cost</th>
                <th className="p-3">Total Cost</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {individualHistory.map((item) => (
                <tr key={item.month} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                  <td className="p-3 font-bold text-zinc-900 dark:text-white">{item.monthName}</td>
                  <td className="p-3 font-semibold text-indigo-600 dark:text-indigo-400">৳{item.fixedCost}</td>
                  <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400">৳{item.mealCost}</td>
                  <td className="p-3 font-extrabold text-zinc-900 dark:text-white">৳{item.totalCost}</td>
                  <td className="p-3 text-right">
                    {item.status === 'settled' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Settled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20">
                        <Clock className="w-3 h-3" /> In Progress
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View: High-End Responsive Touch Cards */}
        <div className="md:hidden space-y-2.5">
          {individualHistory.map((item) => (
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
                  <p className="text-[9px] text-zinc-400">Fixed Cost</p>
                  <p className="text-xs font-bold text-indigo-400 mt-0.5">৳{item.fixedCost}</p>
                </div>
                <div className="p-1.5 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                  <p className="text-[9px] text-zinc-400">Meal Cost</p>
                  <p className="text-xs font-bold text-emerald-400 mt-0.5">৳{item.mealCost}</p>
                </div>
                <div className="p-1.5 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                  <p className="text-[9px] text-zinc-400">Total Month</p>
                  <p className="text-xs font-black text-zinc-100 mt-0.5">৳{item.totalCost}</p>
                </div>
              </div>
            </div>
          ))}
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
              List of overall mess fixed costs, meal costs, and total mess budget month-by-month
            </p>
          </div>
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-bold">
                <th className="p-3">Month</th>
                <th className="p-3">Mess Fixed Costs</th>
                <th className="p-3">Mess Meal / Bazaar Spend</th>
                <th className="p-3">Total Mess Cost</th>
                <th className="p-3 text-right">Mess Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {messHistory.map((item) => (
                <tr key={item.month} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                  <td className="p-3 font-bold text-zinc-900 dark:text-white">{item.monthName}</td>
                  <td className="p-3 font-semibold text-indigo-600 dark:text-indigo-400">৳{item.totalFixedCost}</td>
                  <td className="p-3 font-semibold text-amber-600 dark:text-amber-400">৳{item.totalMealCost}</td>
                  <td className="p-3 font-extrabold text-zinc-900 dark:text-white">৳{item.totalMessCost}</td>
                  <td className="p-3 text-right">
                    {item.status === 'settled' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Archived
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-full border border-blue-500/20">
                        <Clock className="w-3 h-3" /> Active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View: High-End Responsive Touch Cards */}
        <div className="md:hidden space-y-2.5">
          {messHistory.map((item) => (
            <div
              key={item.month}
              className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 space-y-2 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm text-zinc-900 dark:text-white">{item.monthName}</p>
                {item.status === 'settled' ? (
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-extrabold rounded-full border border-emerald-500/20">
                    Archived ✓
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] font-extrabold rounded-full border border-blue-500/20">
                    Active Month ⏳
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-zinc-200/60 dark:border-zinc-700/60 text-center">
                <div className="p-1.5 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                  <p className="text-[9px] text-zinc-400">Fixed Costs</p>
                  <p className="text-xs font-bold text-indigo-400 mt-0.5">৳{item.totalFixedCost}</p>
                </div>
                <div className="p-1.5 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                  <p className="text-[9px] text-zinc-400">Meal Spend</p>
                  <p className="text-xs font-bold text-amber-400 mt-0.5">৳{item.totalMealCost}</p>
                </div>
                <div className="p-1.5 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                  <p className="text-[9px] text-zinc-400">Total Mess</p>
                  <p className="text-xs font-black text-zinc-100 mt-0.5">৳{item.totalMessCost}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
