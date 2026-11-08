'use client';

import React, { useState, useEffect } from 'react';
import { Utensils, Zap, TrendingUp, ShoppingBag } from 'lucide-react';
import { useDashboard } from '@/src/context/DashboardContext';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { MemberOverviewData, MealCostData, MealCostAggregates } from '@/src/types';

interface OverviewTabProps {
  token: string;
  onError?: (msg: string) => void;
}

export default function OverviewTab({ token, onError }: OverviewTabProps) {
  const { todayBazaarAssignment, setIsLiveBazaarOpen, liveMealRate } = useDashboard();
  const [overview, setOverview] = useState<MemberOverviewData | null>(null);
  const [chartData, setChartData] = useState<{
    weekly: MealCostData[];
    monthly: MealCostData[];
    weeklyAgg: MealCostAggregates;
    monthlyAgg: MealCostAggregates;
  } | null>(null);
  const [activeChart, setActiveChart] = useState<'weekly' | 'monthly'>('weekly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch overview
        const overviewRes = await fetch('/api/dashboard/member-overview', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (overviewRes.ok) {
          const ovData = await overviewRes.json();
          setOverview(ovData);
        }

        // Fetch cost breakdown
        const costsRes = await fetch('/api/dashboard/meal-costs-breakdown', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (costsRes.ok) {
          const costsData = await costsRes.json();
          setChartData({
            weekly: costsData.weekly.data,
            monthly: costsData.monthly.data,
            weeklyAgg: costsData.weekly.aggregates,
            monthlyAgg: costsData.monthly.aggregates,
          });
        }
      } catch (error) {
        console.error('Error fetching overview data', error);
        onError?.('Failed to load overview data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, liveMealRate, onError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-xs text-zinc-400">Loading overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Month Meal Off Banner */}
      {overview?.isMonthMealOff && (
        <div className="p-4 bg-red-500/10 border-2 border-red-500/30 rounded-2xl flex items-center gap-3">
          <div className="p-2.5 bg-red-500/20 text-red-500 rounded-xl">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-red-600 dark:text-red-400">
              Meal Closed for This Month (এই মাসের জন্য মিল সার্ভিস বন্ধ রয়েছে)
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Admin has approved closing meal operations for this month. Only House Rent & Electricity fixed costs apply.
            </p>
          </div>
        </div>
      )}

      {/* === TODAY'S KITCHEN MENU HERO BANNER === */}
      {!overview?.isMonthMealOff && (
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-4 md:p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Utensils className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-sm md:text-base font-black text-zinc-100 flex items-center gap-2">
                  <span>আজকের কিচেন মেনু</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </h2>
                <p className="text-[11px] text-zinc-400">
                  রান্না শুরুর চূড়ান্ত হেডকাউন্ট ও মেনু স্ট্যাটাস
                </p>
              </div>
            </div>

            {/* Quick Lock Status */}
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
                overview?.isLunchLocked && overview?.isDinnerLocked
                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                  : overview?.isLunchLocked || overview?.isDinnerLocked
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}>
                {overview?.isLunchLocked && overview?.isDinnerLocked
                  ? '🔒 সব বেলার মিল লকড'
                  : overview?.isLunchLocked
                  ? '🔒 দুপুর লকড • রাত ওপেন'
                  : '🟢 মিল অন/অফ ওপেন'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
            {/* Lunch Menu Item */}
            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1">
                  ☀️ দুপুরের খাবার (Lunch)
                </span>
                <p className="text-xs md:text-sm font-extrabold text-zinc-100 truncate mt-0.5">
                  {overview?.lunchMenu ? `🍲 ${overview.lunchMenu}` : 'মেনু এখনো সেট করা হয়নি ⏳'}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${
                overview?.isLunchLocked ? 'bg-red-950/60 text-red-400 border border-red-800/50' : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
              }`}>
                {overview?.isLunchLocked ? 'লকড' : 'চলমান'}
              </span>
            </div>

            {/* Dinner Menu Item */}
            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 flex items-center gap-1">
                  🌙 রাতের খাবার (Dinner)
                </span>
                <p className="text-xs md:text-sm font-extrabold text-zinc-100 truncate mt-0.5">
                  {overview?.dinnerMenu ? `🍲 ${overview.dinnerMenu}` : 'মেনু এখনো সেট করা হয়নি ⏳'}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${
                overview?.isDinnerLocked ? 'bg-red-950/60 text-red-400 border border-red-800/50' : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
              }`}>
                {overview?.isDinnerLocked ? 'লকড' : 'চলমান'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* First Bazaar Status */}
      {!overview?.isMonthMealOff && (
        (overview?.totalBazaarExpenses || 0) > 0 ? (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300">
            <span className="flex items-center gap-2 font-semibold">
              <span className="text-base">🛒</span>
              <span>চলতি মাসের বাজার চলমান রয়েছে (মোট খরচ: <strong className="font-mono text-emerald-400">৳{overview?.totalBazaarExpenses}</strong>)</span>
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
              {overview?.bazaarCount || 1}টি বাজার সম্পন্ন
            </span>
          </div>
        ) : (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
            <span>⏳</span>
            <span>
              <strong>Waiting for first bazaar:</strong> চলতি মাসে এখনো কোনো বাজার সম্পন্ন হয়নি।
            </span>
          </div>
        )
      )}

      {/* === SUMMARY CARDS === */}
      <div className="grid grid-cols-2 gap-2 md:gap-4 md:grid-cols-3 lg:grid-cols-5">
        {/* My Total Meal */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-3 md:p-4 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-sm text-blue-700 dark:text-blue-300 font-semibold">
              My Total
            </p>
            <Utensils className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-blue-900 dark:text-blue-100">
            {overview?.isMonthMealOff ? 0 : (overview?.myTotalMeals || 0)}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {overview?.isMonthMealOff ? 'closed' : 'meals'}
          </p>
        </div>

        {/* Mess Total Meal */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-3 md:p-4 rounded-lg border border-purple-200 dark:border-purple-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-sm text-purple-700 dark:text-purple-300 font-semibold">
              Mess Total
            </p>
            <Utensils className="w-4 h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-purple-900 dark:text-purple-100">
            {overview?.isMonthMealOff ? 0 : (overview?.messTotalMeals || 0)}
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
            {overview?.isMonthMealOff ? 'closed' : 'meals'}
          </p>
        </div>

        {/* Today's My Meal */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-3 md:p-4 rounded-lg border border-green-200 dark:border-green-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-sm text-green-700 dark:text-green-300 font-semibold">
              Today Me
            </p>
            <Utensils className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-green-900 dark:text-green-100">
            {overview?.isMonthMealOff ? 0 : (overview?.todayMyMeals || 0)}
          </p>
          <p className="text-xs font-medium text-green-700 dark:text-green-300 mt-1">
            {overview?.isMonthMealOff
              ? 'Service Off'
              : `Lunch: ${overview?.todayMyLunch || 0}${overview?.isLunchLocked ? ' ✓' : ''} | Dinner: ${overview?.isDinnerLocked ? `${overview?.todayMyDinner || 0} ✓` : 'Pending'}`}
          </p>
        </div>

        {/* Today's Mess Meal */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-3 md:p-4 rounded-lg border border-orange-200 dark:border-orange-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-sm text-orange-700 dark:text-orange-300 font-semibold">
              Today Mess
            </p>
            <Utensils className="w-4 h-4 md:w-5 md:h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-orange-900 dark:text-orange-100">
            {overview?.isMonthMealOff ? 0 : (overview?.todayMessMeals || 0)}
          </p>
          <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mt-1">
            {overview?.isMonthMealOff
              ? 'Service Off'
              : `Lunch: ${overview?.todayMessLunch || 0}${overview?.isLunchLocked ? ' ✓' : ''} | Dinner: ${overview?.isDinnerLocked ? `${overview?.todayMessDinner || 0} ✓` : 'Pending'}`}
          </p>
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
            {overview?.isMonthMealOff
              ? 'N/A'
              : `৳${overview?.liveMealRate ? overview.liveMealRate.toFixed(2) : '0.00'}`}
          </p>
          <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 leading-tight">
            {overview?.isMonthMealOff
              ? 'Meal closed for this month'
              : !overview?.firstBazaarDate
              ? 'Waiting for first bazaar'
              : overview?.liveMealRate && overview.liveMealRate > 0
              ? 'per meal (Calculated live)'
              : `Est. Base: ৳${overview?.baseRate || 45}`}
          </p>
        </div>
      </div>

      {/* === UNLOCKED LIVE BAZAAR DUTY HERO CARD === */}
      {!overview?.isMonthMealOff && todayBazaarAssignment && (
        <div className={`p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border-2 ${
          todayBazaarAssignment.status === 'verified'
            ? 'bg-gradient-to-r from-teal-500/15 via-emerald-500/10 to-zinc-900 border-teal-500/40'
            : todayBazaarAssignment.status === 'submitted'
            ? 'bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-zinc-900 border-amber-500/40'
            : 'bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-amber-500/10 border-emerald-500/40'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 text-white rounded-xl shadow-md ${
              todayBazaarAssignment.status === 'verified'
                ? 'bg-gradient-to-br from-teal-500 to-emerald-600'
                : todayBazaarAssignment.status === 'submitted'
                ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                : 'bg-gradient-to-br from-emerald-500 to-teal-600'
            }`}>
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-zinc-900 dark:text-white">
                  {todayBazaarAssignment.status === 'verified'
                    ? "Today's Bazaar Verified & Settled! (আজকের বাজার সম্পন্ন হয়েছে)"
                    : todayBazaarAssignment.status === 'submitted'
                    ? "Bazaar Bill Submitted! (বাজার জমা দেওয়া হয়েছে - অনুমোদনের অপেক্ষায়)"
                    : "You have Live Bazaar Duty Today! (আজ আপনার বাজারের দায়িত্ব)"}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 text-white rounded-full uppercase tracking-wider ${
                  todayBazaarAssignment.status === 'verified'
                    ? 'bg-teal-500'
                    : todayBazaarAssignment.status === 'submitted'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-emerald-500 animate-pulse'
                }`}>
                  {todayBazaarAssignment.status === 'verified'
                    ? 'Settled'
                    : todayBazaarAssignment.status === 'submitted'
                    ? 'Awaiting Approval'
                    : 'Active'}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                Handover Cash: <strong className="text-amber-500 font-mono">৳{todayBazaarAssignment.allocatedCash ?? todayBazaarAssignment.budget ?? 0}</strong>
                {todayBazaarAssignment.member2Name && ` | Partner: ${todayBazaarAssignment.member2Name}`}
                {todayBazaarAssignment.status === 'submitted' && ' | বিল ম্যানেজারের ভেরিফিকেশন টিকিটে জমা আছে'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsLiveBazaarOpen(true)}
            className={`px-4 py-2.5 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 whitespace-nowrap ${
              todayBazaarAssignment.status === 'verified'
                ? 'bg-teal-600 hover:bg-teal-500'
                : todayBazaarAssignment.status === 'submitted'
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>
              {todayBazaarAssignment.status === 'verified'
                ? 'View Verified Bill'
                : todayBazaarAssignment.status === 'submitted'
                ? 'View Submitted Bill & Items'
                : 'Open Live Market Mode'}
            </span>
          </button>
        </div>
      )}

      {/* === CHARTS === */}
      {chartData && (
        <div className="space-y-4">
          {/* Chart Toggle */}
          <div className="flex gap-2 md:gap-3">
            <button
              onClick={() => setActiveChart('weekly')}
              className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-colors ${
                activeChart === 'weekly'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setActiveChart('monthly')}
              className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-colors ${
                activeChart === 'monthly'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Cost Chart */}
          <div className="bg-white dark:bg-zinc-900 p-3 md:p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <h3 className="text-sm md:text-base font-bold text-zinc-900 dark:text-white mb-3">
              Cost Breakdown
            </h3>
            <div className="w-full h-72 md:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activeChart === 'weekly' ? chartData.weekly : chartData.monthly}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey={activeChart === 'weekly' ? 'dayLabel' : 'week'}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <Tooltip formatter={(value) => `৳${value}`} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar dataKey="myMealCost" fill="#3b82f6" name="My Meal" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="messMealCost" fill="#8b5cf6" name="Mess Meal" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Aggregates */}
            <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                {activeChart === 'weekly' ? 'Weekly' : 'Monthly'} Totals
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">My Cost</p>
                  <p className="text-base md:text-lg font-bold text-zinc-900 dark:text-white">
                    ৳{activeChart === 'weekly' ? chartData.weeklyAgg.myTotalCost : chartData.monthlyAgg.myTotalCost}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Mess Cost</p>
                  <p className="text-base md:text-lg font-bold text-zinc-900 dark:text-white">
                    ৳{activeChart === 'weekly' ? chartData.weeklyAgg.messTotalCost : chartData.monthlyAgg.messTotalCost}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">My Meal</p>
                  <p className="text-base md:text-lg font-bold text-zinc-900 dark:text-white">
                    ৳{activeChart === 'weekly' ? chartData.weeklyAgg.myMealCost : chartData.monthlyAgg.myMealCost}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
