'use client';

import React, { useState, useEffect } from 'react';
import { Utensils, TrendingUp, AlertTriangle, CheckCircle2, Clock, XCircle, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { ManagerOverviewData, FixedBillItem } from '@/src/types';
import KitchenLockCard from './KitchenLockCard';

interface ManagerOverviewTabProps {
  token: string;
  onError?: (msg: string) => void;
}

export default function ManagerOverviewTab({ token, onError }: ManagerOverviewTabProps) {
  const [overview, setOverview] = useState<ManagerOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/manager-overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      } else {
        onError?.('Failed to load manager overview data');
      }
    } catch (error) {
      console.error('Error fetching manager overview data', error);
      onError?.('Failed to load manager overview data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, onError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-xs text-zinc-400">Loading manager overview...</p>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No overview data available.</p>
      </div>
    );
  }

  const getBillStatusIcon = (status: FixedBillItem['status']) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'partial':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'unpaid':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getBillStatusBadge = (status: FixedBillItem['status']) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      case 'partial':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30';
      case 'unpaid':
        return 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30';
    }
  };

  const getBillStatusLabel = (status: FixedBillItem['status']) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'partial': return 'Partial';
      case 'unpaid': return 'Unpaid';
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* === KPI METRIC CARDS === */}
      <div className="grid grid-cols-2 gap-2 md:gap-4 md:grid-cols-3 lg:grid-cols-5">
        {/* Mess Total Meal Today */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-3 md:p-4 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-sm text-blue-700 dark:text-blue-300 font-semibold">
              Mess Meals Today
            </p>
            <Utensils className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-blue-900 dark:text-blue-100">
            {overview.messTotalMealsToday}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">meals today</p>
        </div>

        {/* Mess Total Meal This Month */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-3 md:p-4 rounded-lg border border-purple-200 dark:border-purple-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-sm text-purple-700 dark:text-purple-300 font-semibold">
              Mess Meals This Month
            </p>
            <Utensils className="w-4 h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-purple-900 dark:text-purple-100">
            {overview.messTotalMealsMonth}
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">meals this month</p>
        </div>

        {/* Meal Cost This Week */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-3 md:p-4 rounded-lg border border-green-200 dark:border-green-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-sm text-green-700 dark:text-green-300 font-semibold">
              Meal Cost This Week
            </p>
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-green-900 dark:text-green-100">
            ৳{overview.mealCostThisWeek}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">this week</p>
        </div>

        {/* Meal Cost This Month */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-3 md:p-4 rounded-lg border border-orange-200 dark:border-orange-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-sm text-orange-700 dark:text-orange-300 font-semibold">
              Meal Cost This Month
            </p>
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-orange-900 dark:text-orange-100">
            ৳{overview.mealCostThisMonth}
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">this month</p>
        </div>

        {/* Live Meal Rate */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-3 md:p-4 rounded-lg border border-red-200 dark:border-red-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-sm text-red-700 dark:text-red-300 font-semibold">
              Live Rate
            </p>
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-red-900 dark:text-red-100">
            ৳{overview.liveMealRate ? overview.liveMealRate.toFixed(2) : '0.00'}
          </p>
          <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 leading-tight">
            {overview.liveMealRate && overview.liveMealRate > 0
              ? 'per meal (Calculated live)'
              : `No meals logged yet (Est. Base: ৳${overview.baseRate || 45})`}
          </p>
        </div>
      </div>

      {/* === KITCHEN HEADCOUNT & MENU LOCK SECTION === */}
      <KitchenLockCard token={token} onRefresh={fetchData} />

      {/* === FIXED BILLS SECTION === */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Fixed Bills Status
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Individual bill payment status for each member
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg">
            {overview.fixedBills.length} Bills
          </span>
        </div>

        {overview.fixedBills.length === 0 ? (
          <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No fixed bills configured for this month.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {overview.fixedBills.map((bill) => (
              <div
                key={bill.type}
                className="p-4 bg-zinc-50/80 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-xs">
                      {getBillStatusIcon(bill.status)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                        {bill.label}
                      </h3>
                      <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        ৳{bill.totalAmount} <span className="text-[10px] font-normal text-zinc-400">total</span>
                      </p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        Share: ৳{bill.memberShare}/person • {bill.paidCount}/{bill.memberCount} paid
                      </p>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${getBillStatusBadge(bill.status)}`}>
                    {getBillStatusLabel(bill.status)}
                  </span>
                </div>

                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      bill.status === 'paid'
                        ? 'bg-emerald-500'
                        : bill.status === 'partial'
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${bill.totalAmount > 0 ? Math.min(Math.round((bill.paidAmount / bill.totalAmount) * 100), 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === PAST MONTH COMPARISON CHART === */}
      {overview.pastMonthComparison.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 p-3 md:p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <h3 className="text-sm md:text-base font-bold text-zinc-900 dark:text-white mb-3">
            Past Month Comparison — Meals & Costs
          </h3>
          <div className="w-full h-72 md:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={overview.pastMonthComparison}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip formatter={(value: number) => [`৳${value}`, '']} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="messMeals" fill="#3b82f6" name="Mess Meals" radius={[4, 4, 0, 0]} />
                <Bar dataKey="mealCost" fill="#8b5cf6" name="Meal Cost (৳)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fixedCost" fill="#f59e0b" name="Fixed Cost (৳)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalCost" fill="#10b981" name="Total Cost (৳)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Totals Summary */}
          <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
              6-Month Summary
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Total Meals</p>
                <p className="text-base md:text-lg font-bold text-zinc-900 dark:text-white">
                  {overview.pastMonthComparison.reduce((sum, d) => sum + d.messMeals, 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Total Meal Cost</p>
                <p className="text-base md:text-lg font-bold text-zinc-900 dark:text-white">
                  ৳{overview.pastMonthComparison.reduce((sum, d) => sum + d.mealCost, 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Total Fixed Cost</p>
                <p className="text-base md:text-lg font-bold text-zinc-900 dark:text-white">
                  ৳{overview.pastMonthComparison.reduce((sum, d) => sum + d.fixedCost, 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Grand Total</p>
                <p className="text-base md:text-lg font-bold text-zinc-900 dark:text-white">
                  ৳{overview.pastMonthComparison.reduce((sum, d) => sum + d.totalCost, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}