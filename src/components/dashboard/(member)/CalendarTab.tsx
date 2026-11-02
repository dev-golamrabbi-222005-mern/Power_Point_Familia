'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingCart,
  Utensils,
  Sun,
  Users,
  ShoppingBag,
  DollarSign,
  Calendar as CalendarIcon,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
  Info,
  Edit3,
} from 'lucide-react';
import { CalendarActivityData, BazaarDutyInfo, BazaarExpense } from '@/src/types';
import LiveBazaarShopperView from './live-bazaar-shopper-view';
import EditBazaarExpenseModal from './EditBazaarExpenseModal';
import { showSuccessAlert, showErrorAlert } from '@/src/lib/alerts';

interface CalendarTabProps {
  token: string;
  onError?: (msg: string) => void;
}

interface MonthCalendar {
  year: number;
  month: number;
  days: (number | null)[];
  firstDay: number;
  daysInMonth: number;
}

export default function CalendarTab({ token, onError }: CalendarTabProps) {
  const [activities, setActivities] = useState<Record<string, any> | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  // Bazaar duty info state for selected or today's date
  const [bazaarDuty, setBazaarDuty] = useState<BazaarDutyInfo | null>(null);
  const [dutyLoading, setDutyLoading] = useState(false);

  // Bazaar history state
  const [historyExpenses, setHistoryExpenses] = useState<(BazaarExpense & { userName?: string; partnerName?: string })[]>([]);
  const [editingExpense, setEditingExpense] = useState<(BazaarExpense & { userName?: string; partnerName?: string }) | null>(null);

  // Bajar Expense Submission State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [bazaarItemsInput, setBazaarItemsInput] = useState('');
  const [bazaarTotalCostInput, setBazaarTotalCostInput] = useState('');
  const [submittingExpense, setSubmittingExpense] = useState(false);

  const handleSubmitBazaarExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bazaarDuty?.assignmentId) return;

    try {
      setSubmittingExpense(true);
      const parsedItems = bazaarItemsInput
        .split(',')
        .map((i) => {
          const parts = i.trim().split('-');
          const name = parts[0]?.trim() || i.trim();
          const cost = Number(parts[1]?.trim() || 0);
          return { name, cost };
        })
        .filter((i) => i.name);

      const res = await fetch('/api/bazaar/expense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assignmentId: bazaarDuty.assignmentId,
          date: bazaarDuty.date,
          items:
            parsedItems.length > 0
              ? parsedItems
              : [{ name: 'Bazaar Items', cost: Number(bazaarTotalCostInput || 0) }],
          totalCost: Number(bazaarTotalCostInput || 0),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');
      showSuccessAlert(data.message || 'Bajar expense submitted successfully!');
      setShowSubmitModal(false);
      fetchBazaarDuty(bazaarDuty.date);
      fetchActivities();
    } catch (err: any) {
      showErrorAlert(err.message || 'Error submitting expense');
    } finally {
      setSubmittingExpense(false);
    }
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/calendar-activities', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activitiesByDate);
      }
    } catch (error) {
      console.error('Error fetching calendar activities', error);
      onError?.('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const fetchBazaarDuty = async (dateStr: string) => {
    try {
      setDutyLoading(true);
      const res = await fetch(`/api/dashboard/calendar-bazaar-duty?date=${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBazaarDuty(data);
      }
    } catch (error) {
      console.error('Error fetching bazaar duty info', error);
    } finally {
      setDutyLoading(false);
    }
  };

  const fetchBazaarHistory = async () => {
    try {
      const res = await fetch('/api/bazaar/expense', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryExpenses(data);
      }
    } catch (e) {
      console.error('Error fetching bazaar history', e);
    }
  };

  useEffect(() => {
    fetchActivities();
    const todayStr = new Date().toISOString().split('T')[0];
    fetchBazaarDuty(todayStr);
    fetchBazaarHistory();
  }, [token]);

  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr);
    fetchBazaarDuty(dateStr);
    setShowDetailModal(true);
  };

  const getCalendar = (year: number, month: number): MonthCalendar => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return { year, month, days, firstDay, daysInMonth };
  };

  const getDateString = (day: number): string => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const calendar = getCalendar(currentDate.getFullYear(), currentDate.getMonth());
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const activeDateDisplay = selectedDate || new Date().toISOString().split('T')[0];

  // Selected date activity details for modal
  const selectedActivity = selectedDate && activities ? activities[selectedDate] : null;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* === CALENDAR HEADER & GRID === */}
      <div className="bg-white dark:bg-zinc-900 p-3 md:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-zinc-900 dark:text-white">{monthName}</h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                যেকোনো তারিখে ক্লিক করে ওই দিনের বিস্তারিত মিল ও বাজার দেখুন
              </p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer text-zinc-700 dark:text-zinc-300 font-bold"
            >
              ←
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer text-zinc-700 dark:text-zinc-300 font-bold"
            >
              →
            </button>
          </div>
        </div>

        {/* === WEEKDAY HEADERS === */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 py-1.5"
            >
              {day}
            </div>
          ))}
        </div>

        {/* === CALENDAR GRID === */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendar.days.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="min-h-[64px] md:min-h-[82px] rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20" />;
            }

            const dateStr = getDateString(day);
            const isSelected = selectedDate === dateStr;
            const today = new Date().toISOString().split('T')[0];
            const isToday = dateStr === today;

            const act = activities ? activities[dateStr] : null;
            const lunchCount = act?.mealSummary?.lunch || 0;
            const dinnerCount = act?.mealSummary?.dinner || 0;
            const hasMeals = lunchCount > 0 || dinnerCount > 0;
            const hasBazaar = (act?.bazaarCount || 0) > 0 || (act?.totalBazaarCost || 0) > 0;
            const bazaarCost = act?.totalBazaarCost || 0;

            return (
              <button
                key={day}
                onClick={() => handleDateSelect(dateStr)}
                className={`min-h-[64px] md:min-h-[82px] p-1.5 rounded-xl flex flex-col justify-between items-start transition-all relative cursor-pointer text-left border ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-sm'
                    : isToday
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
                    : hasMeals || hasBazaar
                    ? 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700/70 hover:border-emerald-500/50'
                    : 'bg-zinc-50/60 dark:bg-zinc-800/20 border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {/* Top: Day Number & Today indicator */}
                <div className="w-full flex items-center justify-between">
                  <span
                    className={`text-xs md:text-sm font-bold ${
                      isToday
                        ? 'text-blue-500 font-black'
                        : isSelected
                        ? 'text-emerald-400 font-black'
                        : 'text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    {day}
                  </span>
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ring-2 ring-blue-500/30" />
                  )}
                </div>

                {/* Middle: Lunch & Dinner badges */}
                <div className="w-full flex items-center gap-1 mt-1 flex-wrap">
                  {lunchCount > 0 && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 leading-none">
                      L: {lunchCount}
                    </span>
                  )}
                  {dinnerCount > 0 && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 leading-none">
                      D: {dinnerCount}
                    </span>
                  )}
                </div>

                {/* Bottom: Bazaar Badge */}
                {hasBazaar && (
                  <div className="w-full mt-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 leading-none truncate">
                      🛒 {bazaarCost > 0 ? `৳${bazaarCost}` : 'বাজার'}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* === DAY ACTIVITY & MEAL DETAILS MODAL (OPENED ON DATE CLICK) === */}
      {showDetailModal && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-lg p-5 md:p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowDetailModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('bn-BD', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h3>
                <p className="text-xs text-zinc-400 font-mono">{selectedDate}</p>
              </div>
            </div>

            {/* 1. LUNCH DETAILS */}
            <div className="p-3.5 bg-zinc-800/40 rounded-xl border border-zinc-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    দুপুরের খাবার (Lunch)
                  </h4>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    selectedActivity?.mealSummary?.isLunchLocked
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-zinc-700/50 text-zinc-400 border-zinc-600'
                  }`}
                >
                  {selectedActivity?.mealSummary?.isLunchLocked ? '🔒 Locked' : '⏳ Open'}
                </span>
              </div>

              <div className="text-xs space-y-1">
                <p className="text-zinc-300">
                  <span className="text-zinc-500">মেনু:</span>{' '}
                  <strong className="text-white">
                    {selectedActivity?.mealSummary?.lunchMenu || 'মেনু এখনো নির্ধারণ করা হয়নি'}
                  </strong>
                </p>
                <div className="flex items-center justify-between text-zinc-400 pt-1">
                  <span>
                    মোট খেয়েছে/খাবেন:{' '}
                    <strong className="text-emerald-400">
                      {selectedActivity?.mealSummary?.lunch || 0} জন
                    </strong>
                  </span>
                  <span>
                    আপনার মিল:{' '}
                    {selectedActivity?.mealSummary?.myLunch ? (
                      <span className="text-emerald-400 font-bold">✓ আপনি খেয়েছেন (+১)</span>
                    ) : (
                      <span className="text-red-400 font-bold">✗ মিল বন্ধ ছিল</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. DINNER DETAILS */}
            <div className="p-3.5 bg-zinc-800/40 rounded-xl border border-zinc-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                    রাতের খাবার (Dinner)
                  </h4>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    selectedActivity?.mealSummary?.isDinnerLocked
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-zinc-700/50 text-zinc-400 border-zinc-600'
                  }`}
                >
                  {selectedActivity?.mealSummary?.isDinnerLocked ? '🔒 Locked' : '⏳ Open'}
                </span>
              </div>

              <div className="text-xs space-y-1">
                <p className="text-zinc-300">
                  <span className="text-zinc-500">মেনু:</span>{' '}
                  <strong className="text-white">
                    {selectedActivity?.mealSummary?.dinnerMenu || 'মেনু এখনো নির্ধারণ করা হয়নি'}
                  </strong>
                </p>
                <div className="flex items-center justify-between text-zinc-400 pt-1">
                  <span>
                    মোট খেয়েছে/খাবেন:{' '}
                    <strong className="text-emerald-400">
                      {selectedActivity?.mealSummary?.dinner || 0} জন
                    </strong>
                  </span>
                  <span>
                    আপনার মিল:{' '}
                    {selectedActivity?.mealSummary?.myDinner ? (
                      <span className="text-emerald-400 font-bold">✓ আপনি খেয়েছেন (+১)</span>
                    ) : (
                      <span className="text-red-400 font-bold">✗ মিল বন্ধ ছিল</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. BAZAAR DETAILS */}
            <div className="p-3.5 bg-zinc-800/40 rounded-xl border border-zinc-700/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-orange-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-orange-300">
                    বাজারের হিসাব
                  </h4>
                </div>
                {selectedActivity?.totalBazaarCost > 0 && (
                  <span className="text-xs font-black text-amber-400">
                    মোট: ৳{selectedActivity.totalBazaarCost}
                  </span>
                )}
              </div>

              {selectedActivity?.bazaarDetails && selectedActivity.bazaarDetails.length > 0 ? (
                <div className="space-y-2">
                  {selectedActivity.bazaarDetails.map((b: any, bIdx: number) => (
                    <div key={bIdx} className="p-2.5 bg-zinc-900/80 rounded-lg text-xs space-y-1">
                      <div className="flex justify-between items-center text-zinc-300">
                        <span>
                          বাজার করেছেন: <strong className="text-white">{b.userName}</strong>
                        </span>
                        <span className="font-bold text-amber-400">৳{b.totalCost}</span>
                      </div>
                      {b.items && (
                        <p className="text-[11px] text-zinc-400 pt-0.5">
                          <span className="text-zinc-500">আইটেমসমূহ:</span> {b.items}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 py-1 italic">
                  এই তারিখে কোনো বাজার অনুষ্ঠিত হয়নি।
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === BAZAAR DUTY SCHEDULE SECTION (UNDER CALENDAR) === */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-500" />
            <h3 className="text-sm md:text-base font-bold text-zinc-900 dark:text-white">
              Bazaar Duty Schedule ({activeDateDisplay})
            </h3>
          </div>
          {selectedDate ? (
            <button
              onClick={() => {
                setSelectedDate(null);
                const today = new Date().toISOString().split('T')[0];
                fetchBazaarDuty(today);
              }}
              className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
            >
              Reset to Today
            </button>
          ) : (
            <span className="text-xs font-bold px-2.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full border border-blue-500/20">
              Today
            </span>
          )}
        </div>

        {dutyLoading ? (
          <div className="p-4 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
            <span>Checking bazaar schedule...</span>
          </div>
        ) : bazaarDuty?.hasDuty ? (
          /* HAS BAZAAR DUTY TODAY / SELECTED DATE */
          <div className="p-4 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent dark:from-orange-950/40 dark:to-zinc-900 rounded-xl border border-orange-300 dark:border-orange-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-lg">
                  <ShoppingBag className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Bazaar Duty Assigned!
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Pair Partner:{' '}
                    <span className="font-bold text-orange-600 dark:text-orange-400">
                      {bazaarDuty.pairPartnerName}
                    </span>
                  </p>
                </div>
              </div>
              <span className="text-xs font-extrabold px-3 py-1 bg-orange-500/20 text-orange-700 dark:text-orange-300 rounded-full border border-orange-500/30">
                Budget: ৳{bazaarDuty.budget}
              </span>
            </div>

            {/* Manager Shopping List */}
            {bazaarDuty.shoppingList && bazaarDuty.shoppingList.length > 0 && (
              <div className="bg-white/80 dark:bg-zinc-800/80 p-3 rounded-lg border border-orange-200/60 dark:border-orange-900/40">
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-orange-500" />
                  Manager Requested Shopping List:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {bazaarDuty.shoppingList.map((item, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-medium px-2.5 py-1 bg-orange-100 dark:bg-orange-950/60 text-orange-900 dark:text-orange-200 rounded-md border border-orange-200 dark:border-orange-800"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Submission Status & Action */}
            {bazaarDuty.submittedDetails ||
            bazaarDuty.status === 'submitted' ||
            bazaarDuty.status === 'verified' ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-emerald-400 uppercase tracking-wider">
                    {bazaarDuty.status === 'verified'
                      ? '✓ Verified & Accepted by Manager'
                      : '✓ Submitted (Awaiting Manager Acceptance)'}
                  </span>
                  <span className="font-black text-emerald-300 text-sm">
                    ৳{bazaarDuty.submittedDetails?.totalCost || 0}
                  </span>
                </div>
                {bazaarDuty.submittedDetails?.submittedByName && (
                  <p className="text-zinc-400">
                    Submitted by:{' '}
                    <strong className="text-emerald-300">
                      {bazaarDuty.submittedDetails.submittedByName}
                    </strong>
                  </p>
                )}
                {bazaarDuty.submittedDetails?.items && bazaarDuty.submittedDetails.items.length > 0 && (
                  <p className="text-zinc-500 truncate">
                    Items:{' '}
                    {bazaarDuty.submittedDetails.items
                      .map((i) => `${i.name} (${i.cost}৳)`)
                      .join(', ')}
                  </p>
                )}
              </div>
            ) : (
              <div className="pt-2">
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Submit Bajar Cost & List</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* NO BAZAAR DUTY (HOLIDAY OR OTHER MEMBER'S DUTY) */
          <div className="p-4 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-950/30 dark:to-zinc-900 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full">
                <Sun className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm md:text-base font-extrabold text-emerald-900 dark:text-emerald-100 flex items-center gap-1.5">
                  It&apos;s your holiday today! 🎉
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  No bazaar duty scheduled for you on {activeDateDisplay}. Relax and enjoy your day!
                </p>
              </div>
            </div>

            {/* If another member is assigned in the mess on this date */}
            {bazaarDuty?.messShoppers && (
              <div className="p-3 bg-zinc-100/80 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-orange-500" />
                  <span className="text-zinc-700 dark:text-zinc-300 font-semibold">
                    Mess Bazaar Scheduled:{' '}
                    <strong className="text-zinc-900 dark:text-zinc-100">
                      {bazaarDuty.messShoppers.member1Name}
                      {bazaarDuty.messShoppers.member2Name
                        ? ` & ${bazaarDuty.messShoppers.member2Name}`
                        : ''}
                    </strong>
                  </span>
                </div>
                <span className="font-extrabold text-orange-600 dark:text-orange-400">
                  Budget: ৳{bazaarDuty.messShoppers.budget}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* === BAZAAR HISTORY & EDIT SECTION (আমার ও পার্টনারের বাজার তালিকা) === */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 md:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm md:text-base font-bold text-zinc-900 dark:text-white">
              Bazaar History (বাজারের ইতিহাস ও হিসাব)
            </h3>
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {historyExpenses.length} submissions
          </span>
        </div>

        {historyExpenses.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 py-3 text-center">
            No bazaar submissions found for you or your partner yet.
          </p>
        ) : (
          <div className="space-y-3">
            {historyExpenses.map((exp) => {
              const isPending = exp.status === 'pending';
              const itemsList = (exp.items || []).map((i) => `${i.name} (৳${i.cost})`).join(', ');

              return (
                <div
                  key={exp.id}
                  className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                        {exp.date}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          exp.status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {exp.status === 'approved' ? '✓ Approved by Manager' : '⏳ Pending Review'}
                      </span>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      Shopper: <strong className="text-zinc-800 dark:text-zinc-200">{exp.userName}</strong>
                      {exp.partnerName ? ` • Partner: ${exp.partnerName}` : ''}
                    </p>
                    {itemsList && (
                      <p className="text-zinc-500 truncate max-w-md">Items: {itemsList}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-200 dark:border-zinc-700">
                    <span className="font-bold text-zinc-900 dark:text-white text-sm">
                      ৳{exp.totalCost}
                    </span>
                    {isPending && (
                      <button
                        onClick={() => setEditingExpense(exp)}
                        className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg transition-colors cursor-pointer"
                        title="Edit Submission"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Bazaar Modal */}
      {editingExpense && (
        <EditBazaarExpenseModal
          expense={editingExpense}
          token={token}
          onClose={() => setEditingExpense(null)}
          onSuccess={() => {
            fetchBazaarHistory();
            fetchActivities();
            if (bazaarDuty?.date) fetchBazaarDuty(bazaarDuty.date);
          }}
        />
      )}
    </div>
  );
}
