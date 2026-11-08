'use client';

import React, { useState, useEffect } from 'react';
import { Utensils, Lock, CheckCircle2, Clock, Sparkles, X, AlertCircle } from 'lucide-react';
import { DailyMealDay, MealSessionDetail } from '@/src/types';
import { showSuccessAlert, showErrorAlert } from '@/src/lib/alerts';

interface KitchenLockCardProps {
  token: string;
  onRefresh?: () => void;
}

export default function KitchenLockCard({ token, onRefresh }: KitchenLockCardProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [data, setData] = useState<{ date: string; lunch: MealSessionDetail; dinner: MealSessionDetail } | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [activeModal, setActiveModal] = useState<'lunch' | 'dinner' | null>(null);
  const [menuInput, setMenuInput] = useState('');
  const [locking, setLocking] = useState(false);

  const getRollingDays = () => {
    const days: { date: string; label: string; isToday: boolean }[] = [];
    for (let i = 0; i <= 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        date: dateStr,
        label:
          i === 0
            ? 'Today (আজ)'
            : i === 1
            ? 'Tomorrow (আগামীকাল)'
            : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        isToday: i === 0,
      });
    }
    return days;
  };

  const rollingDays = getRollingDays();

  const fetchStatus = async (targetDate = selectedDate) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/records/lock-session?date=${targetDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Error fetching lock session status', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus(selectedDate);
  }, [token, selectedDate]);

  // Reactive listener when any member toggles a meal
  useEffect(() => {
    const handleMealChanged = () => {
      fetchStatus(selectedDate);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('meal-requests-changed', handleMealChanged);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('meal-requests-changed', handleMealChanged);
      }
    };
  }, [selectedDate]);

  const openLockModal = (mealType: 'lunch' | 'dinner') => {
    const session = mealType === 'lunch' ? data?.lunch : data?.dinner;
    setMenuInput(session?.menu || '');
    setActiveModal(mealType);
  };

  const handleConfirmLock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModal || !menuInput.trim()) {
      showErrorAlert('অনুগ্রহ করে রান্নার মেনুটি লিখুন (যেমন: মুরগি + ডাল)');
      return;
    }

    try {
      setLocking(true);
      const res = await fetch('/api/records/lock-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: data?.date,
          mealType: activeModal,
          menu: menuInput.trim(),
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        showSuccessAlert(resData.message || 'হেডকাউন্ট ও মেনু সফলভাবে লক হয়েছে!');
        setActiveModal(null);
        setMenuInput('');
        fetchStatus();
        onRefresh?.();
      } else {
        showErrorAlert(resData.message || 'লক করতে ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      showErrorAlert(err.message || 'নেটওয়ার্ক এরর');
    } finally {
      setLocking(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse text-xs text-zinc-400">
        রান্নার হেডকাউন্ট লোড হচ্ছে...
      </div>
    );
  }

  const lunch = data?.lunch;
  const dinner = data?.dinner;

  return (
    <div className="bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 border border-zinc-800 rounded-2xl p-4 md:p-5 shadow-xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Utensils className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
              Kitchen Headcount & Menu Lock
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Live Kitchen
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              রান্না শুরুর আগে হেডকাউন্ট ও মেনু লক করুন। লক করলে মিল সংখ্যা অ্যাকাউন্টে যোগ হবে।
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchStatus(selectedDate)}
          className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          Refresh
        </button>
      </div>

      {/* Rolling 3-Day Advance Schedule Switcher */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-3 border-b border-zinc-800/60">
        <span className="text-[11px] font-bold uppercase text-zinc-400 mr-1 whitespace-nowrap">Schedule Date:</span>
        {rollingDays.map(d => (
          <button
            key={d.date}
            type="button"
            onClick={() => setSelectedDate(d.date)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedDate === d.date
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Two Column Grid: Lunch & Dinner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* LUNCH CARD */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            lunch?.isLocked
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : 'bg-zinc-800/40 border-zinc-700/60 hover:border-zinc-600'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Lunch (দুপুর)
              </span>
              <h4 className="text-base font-bold text-white">
                {lunch?.isLocked ? (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Locked for Cooking
                  </span>
                ) : (
                  <span className="text-zinc-300">রান্নার প্রস্তুতি চলছে</span>
                )}
              </h4>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                lunch?.isLocked
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              {lunch?.totalCount || 0} জন মেম্বার
            </span>
          </div>

          {/* Menu Display */}
          <div className="mt-3 py-2 px-3 rounded-lg bg-zinc-900/80 border border-zinc-800/90 text-xs">
            <span className="text-zinc-500 text-[11px] block">রান্নার মেনু:</span>
            <p className="font-semibold text-zinc-200 mt-0.5">
              {lunch?.menu ? lunch.menu : <span className="text-zinc-500 italic">মেনু এখনো নির্ধারণ করা হয়নি</span>}
            </p>
          </div>

          {/* Member Preview Summary */}
          <div className="mt-2.5 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>সক্রিয় (খাবেন): <strong className="text-emerald-400">{lunch?.activeMembers?.length || 0}</strong></span>
              <span>অফ রেখেছেন: <strong className="text-red-400">{lunch?.offMembers?.length || 0}</strong></span>
            </div>
            {lunch?.offMembers && lunch.offMembers.length > 0 && (
              <p className="text-[10px] text-red-400/90 truncate font-medium">
                অফ: {lunch.offMembers.map(m => m.name).join(', ')}
              </p>
            )}
          </div>

          {/* Action Button */}
          <div className="mt-3.5 pt-3 border-t border-zinc-800/60">
            <button
              onClick={() => openLockModal('lunch')}
              className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                lunch?.isLocked
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{lunch?.isLocked ? 'Update Menu / Relock Lunch' : `Lock Lunch (${lunch?.totalCount || 0} Meals)`}</span>
            </button>
          </div>
        </div>

        {/* DINNER CARD */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            dinner?.isLocked
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : 'bg-zinc-800/40 border-zinc-700/60 hover:border-zinc-600'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Dinner (রাত)
              </span>
              <h4 className="text-base font-bold text-white">
                {dinner?.isLocked ? (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Locked for Cooking
                  </span>
                ) : (
                  <span className="text-zinc-300">রান্নার প্রস্তুতি চলছে</span>
                )}
              </h4>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                dinner?.isLocked
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
              }`}
            >
              {dinner?.totalCount || 0} জন মেম্বার
            </span>
          </div>

          {/* Menu Display */}
          <div className="mt-3 py-2 px-3 rounded-lg bg-zinc-900/80 border border-zinc-800/90 text-xs">
            <span className="text-zinc-500 text-[11px] block">রান্নার মেনু:</span>
            <p className="font-semibold text-zinc-200 mt-0.5">
              {dinner?.menu ? dinner.menu : <span className="text-zinc-500 italic">মেনু এখনো নির্ধারণ করা হয়নি</span>}
            </p>
          </div>

          {/* Member Preview Summary */}
          <div className="mt-2.5 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>সক্রিয় (খাবেন): <strong className="text-emerald-400">{dinner?.activeMembers?.length || 0}</strong></span>
              <span>অফ রেখেছেন: <strong className="text-red-400">{dinner?.offMembers?.length || 0}</strong></span>
            </div>
            {dinner?.offMembers && dinner.offMembers.length > 0 && (
              <p className="text-[10px] text-red-400/90 truncate font-medium">
                অফ: {dinner.offMembers.map(m => m.name).join(', ')}
              </p>
            )}
          </div>

          {/* Action Button */}
          <div className="mt-3.5 pt-3 border-t border-zinc-800/60">
            <button
              onClick={() => openLockModal('dinner')}
              className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                dinner?.isLocked
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{dinner?.isLocked ? 'Update Menu / Relock Dinner' : `Lock Dinner (${dinner?.totalCount || 0} Meals)`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION & MENU INPUT MODAL */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white capitalize">
                  Confirm Today&apos;s {activeModal} Lock
                </h3>
                <p className="text-xs text-zinc-400">Date: {data?.date}</p>
              </div>
            </div>

            {/* Live Count Overview */}
            <div className="p-3 bg-zinc-800/60 rounded-xl border border-zinc-700/60 flex items-center justify-around text-center text-xs">
              <div>
                <span className="text-zinc-400 text-[11px] block">সক্রিয় মিল (+1)</span>
                <strong className="text-base text-emerald-400">
                  {activeModal === 'lunch' ? lunch?.activeMembers?.length || 0 : dinner?.activeMembers?.length || 0} জন
                </strong>
              </div>
              <div className="h-6 w-px bg-zinc-700" />
              <div>
                <span className="text-zinc-400 text-[11px] block">মিল বন্ধ</span>
                <strong className="text-base text-red-400">
                  {activeModal === 'lunch' ? lunch?.offMembers?.length || 0 : dinner?.offMembers?.length || 0} জন
                </strong>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmLock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                  <span>আজকের {activeModal === 'lunch' ? 'লাঞ্চের' : 'ডিনারের'} রান্নার মেনু:</span>
                  <span className="text-[11px] text-emerald-400 font-normal">ক্যালেন্ডারে সেভ হবে</span>
                </label>
                <input
                  type="text"
                  value={menuInput}
                  onChange={(e) => setMenuInput(e.target.value)}
                  placeholder="যেমন: মুরগি + মসুর ডাল + আলু ভর্তা"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 focus:border-emerald-500 rounded-xl text-white text-sm outline-none placeholder:text-zinc-600"
                  required
                  autoFocus
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-300/90 leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  লক করার পর রান্নার চাল-ডাল চূড়ান্ত হবে এবং কোনো মেম্বার এই বেলার মিল অফ করতে পারবে না।
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={locking}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-900/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {locking ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm Today&apos;s {activeModal === 'lunch' ? 'Lunch' : 'Dinner'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

