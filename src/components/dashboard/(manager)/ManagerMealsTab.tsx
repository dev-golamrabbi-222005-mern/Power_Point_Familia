'use client';

import React, { useState, useEffect } from 'react';
import { 
  Utensils, 
  ChefHat, 
  Calendar, 
  Clock, 
  X, 
  Check, 
  AlertTriangle, 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  TrendingUp, 
  Users, 
  DollarSign,
  CheckCircle2,
  Receipt,
  ShieldAlert,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  Wallet
} from 'lucide-react';
import { BazaarAssignment, BazaarExpense, MealMenu, User, BazaarPair } from '@/src/types';
import { showSuccessAlert, showErrorAlert, showWarningAlert } from '@/src/lib/alerts';

interface ManagerMealsTabProps {
  token: string;
  menus: MealMenu[];
  onRefreshMenus: () => void;
  onError?: (msg: string) => void;
}

export default function ManagerMealsTab({ token, menus, onRefreshMenus, onError }: ManagerMealsTabProps) {
  const [loading, setLoading] = useState(true);
  
  // KPI state
  const [mealKpis, setMealKpis] = useState({
    todayTotal: 0,
    todayLunch: 0,
    todayDinner: 0,
    weekTotal: 0,
    monthTotal: 0,
    totalMealCashCollected: 0,
    totalBazaarSpent: 0,
    liveMealRate: 0,
  });

  // Late meal off requests
  const [mealRequests, setMealRequests] = useState<any[]>([]);
  const [requestActionLoading, setRequestActionLoading] = useState<string | null>(null);

  // Bazaar state
  const [assignments, setAssignments] = useState<(BazaarAssignment & { userName?: string })[]>([]);
  const [expenses, setExpenses] = useState<(BazaarExpense & { userName?: string })[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [pairs, setPairs] = useState<BazaarPair[]>([]);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);

  // Force cancel modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelMealType, setCancelMealType] = useState<'lunch' | 'dinner' | 'both'>('both');
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState('');

  // Assign Bazaar Form
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignMember2Id, setAssignMember2Id] = useState('');
  const [assignBudget, setAssignBudget] = useState('');
  const [assignDate, setAssignDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignShoppingList, setAssignShoppingList] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Enlarged receipt modal
  const [enlargedReceipt, setEnlargedReceipt] = useState<string | null>(null);

  const fetchMealsData = async () => {
    try {
      setLoading(true);
      const [membersRes, assignRes, expRes, pairsRes, statsRes, recordsRes, reqRes] = await Promise.all([
        fetch('/api/members', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/bazaar/assign', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/bazaar/expense', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/bazaar/pairs', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/dashboard/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/records', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/records/request-meal-off', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (membersRes.ok) setMembers(await membersRes.json());
      if (assignRes.ok) setAssignments(await assignRes.json());
      if (expRes.ok) setExpenses(await expRes.json());
      if (reqRes.ok) setMealRequests(await reqRes.json());
      
      if (pairsRes.ok) {
        const pairData = await pairsRes.json();
        setPairs(pairData.pairs || []);
        setCurrentPairIndex(pairData.currentPairIndex || 0);
      }

      if (recordsRes.ok && statsRes.ok) {
        const records: any[] = await recordsRes.json();
        const stats = await statsRes.json();
        const mStats = stats.managerStats;

        const today = new Date().toISOString().split('T')[0];
        const todayRecords = records.filter(r => r.date === today);

        const todayLunch = todayRecords.filter(r => r.mealType === 'lunch').reduce((s, r) => s + (r.count || 0), 0);
        const todayDinner = todayRecords.filter(r => r.mealType === 'dinner').reduce((s, r) => s + (r.count || 0), 0);

        const currentMonth = today.slice(0, 7);
        const monthRecords = records.filter(r => r.date && r.date.startsWith(currentMonth));
        const monthTotal = monthRecords.reduce((s, r) => s + (r.count || 0), 0);

        setMealKpis({
          todayTotal: todayLunch + todayDinner,
          todayLunch,
          todayDinner,
          weekTotal: Math.round(monthTotal / 4),
          monthTotal,
          totalMealCashCollected: mStats?.totalSystemDeposits || 0,
          totalBazaarSpent: mStats?.totalBazaarExpenses || 0,
          liveMealRate: mStats?.liveMealRate || 0,
        });
      }
    } catch (err) {
      console.error('Error fetching meals tab data', err);
      onError?.('Failed to load meals data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMealsData();
  }, [token]);

  const handleMealRequestAction = async (recordId: string, action: 'accept' | 'reject') => {
    try {
      setRequestActionLoading(recordId);
      const res = await fetch('/api/records/request-meal-off', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recordId, action }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Action failed');
      }

      await fetchMealsData();
      onRefreshMenus();
    } catch (err: any) {
      showErrorAlert('Action Failed', err.message || 'Action failed');
    } finally {
      setRequestActionLoading(null);
    }
  };

  const handleForceCancelToday = async () => {
    try {
      setCancelling(true);
      const res = await fetch('/api/records/force-cancel-today', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mealType: cancelMealType }),
      });

      if (!res.ok) throw new Error('Force cancel failed');
      const data = await res.json();
      showSuccessAlert('Meals Cancelled', data.message || 'Cancelled successfully');
      setIsCancelModalOpen(false);
      setCancelSuccess('');
      fetchMealsData();
    } catch (err: any) {
      showErrorAlert('Error', err.message || 'Force cancel error');
    } finally {
      setCancelling(false);
    }
  };

  const handleAssignBazaar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUserId || !assignDate) {
      showWarningAlert('Incomplete Form', 'Select primary member and date');
      return;
    }

    try {
      setAssigning(true);
      const cash = Number(assignBudget || 0);
      const res = await fetch('/api/bazaar/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: assignUserId,
          member2Id: assignMember2Id || undefined,
          budget: cash,
          allocatedCash: cash,
          date: assignDate,
          shoppingList: assignShoppingList.split(',').map(i => i.trim()).filter(i => i),
        }),
      });

      if (!res.ok) throw new Error('Bazaar assignment failed');
      showSuccessAlert('Assigned', 'Bazaar duty assigned successfully!');
      setShowAssignForm(false);
      setAssignShoppingList('');
      setAssignBudget('');
      setAssignMember2Id('');
      fetchMealsData();
    } catch (err: any) {
      showErrorAlert('Error', err.message || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleExpenseStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/bazaar/expense/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Status update failed');
      showSuccessAlert('Status Updated', `Bazaar expense ${status}`);
      fetchMealsData();
      onRefreshMenus();
    } catch (err: any) {
      showErrorAlert('Action Failed', err.message || 'Action failed');
    }
  };

  const pendingRequests = mealRequests.filter(r => r.requestStatus === 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-xs text-zinc-400">Loading Meals & Bazaar Management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* === KPIS HEADER GRID === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Today's Total Meals with Breakdown */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-950/30 dark:to-zinc-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Total Meals Today
            </p>
            <ChefHat className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white">
            {mealKpis.todayTotal} <span className="text-xs font-normal text-zinc-400">meals</span>
          </p>
          <div className="mt-2 pt-2 border-t border-emerald-200/50 dark:border-emerald-800/40 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
            <span>Lunch: <strong className="font-extrabold">{mealKpis.todayLunch}</strong></span>
            <span>Dinner: <strong className="font-extrabold">{mealKpis.todayDinner}</strong></span>
          </div>
        </div>

        {/* KPI 2: Week & Month Meals */}
        <div className="bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent dark:from-blue-950/30 dark:to-zinc-900 p-4 rounded-xl border border-blue-200 dark:border-blue-800/60 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
              Month & Week Meals
            </p>
            <Utensils className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white">
            {mealKpis.monthTotal} <span className="text-xs font-normal text-zinc-400">month total</span>
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 pt-2 border-t border-blue-200/50 dark:border-blue-800/40 font-semibold">
            Avg ~{mealKpis.weekTotal} meals / week
          </p>
        </div>

        {/* KPI 3: Live Meal Rate & Bazaar Cost */}
        <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-950/30 dark:to-zinc-900 p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Live Meal Rate
            </p>
            <TrendingUp className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white font-mono">
            ৳{mealKpis.liveMealRate.toFixed(2)}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold mt-1">
            Bazaar Spent: ৳{mealKpis.totalBazaarSpent}
          </p>
        </div>

        {/* KPI 4: Total Meal Cash Collected */}
        <div className="bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-transparent dark:from-teal-950/30 dark:to-zinc-900 p-4 rounded-xl border border-teal-200 dark:border-teal-800/60 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
              Total Meal Cash
            </p>
            <Wallet className="w-5 h-5 text-teal-500" />
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white font-mono">
            ৳{mealKpis.totalMealCashCollected}
          </p>
          <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold mt-1">
            Approved member meal cash
          </p>
        </div>

        {/* KPI 5: Force Cancel Action Card */}
        <div className="bg-gradient-to-br from-red-500/10 via-rose-500/5 to-transparent dark:from-red-950/30 dark:to-zinc-900 p-4 rounded-xl border border-red-200 dark:border-red-800/60 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-300 mb-1">
              Emergency Meal Control
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Force cancel today's meals for mess
            </p>
          </div>
          <button
            onClick={() => setIsCancelModalOpen(true)}
            className="mt-3 w-full bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold text-xs py-2.5 px-3 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Force Cancel Today's Meals</span>
          </button>
        </div>
      </div>

      {/* === LATE MEAL-OFF REQUESTS (EMERGENCY ALERTS FOR MANAGER) === */}
      <div className={`rounded-xl border p-4 md:p-6 shadow-sm transition-all ${
        pendingRequests.length > 0 
          ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800' 
          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="text-base md:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className={`w-5 h-5 ${pendingRequests.length > 0 ? 'text-amber-500 animate-bounce' : 'text-zinc-400'}`} />
              Late Meal-Off Requests (কাট-অফ পরবর্তী মিল অফ রিকোয়েস্ট)
              {pendingRequests.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-500 text-white animate-pulse">
                  {pendingRequests.length} Pending Review
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Members requesting meal cancellation after 9:00 AM (lunch) or 3:00 PM (dinner). Accept to set count to 0 (no charge) or Reject to keep meal ON.
            </p>
          </div>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-400 flex flex-col items-center justify-center gap-1">
            <CheckCircle2 className="w-6 h-6 text-emerald-500/60" />
            <span>No pending late meal-off requests right now. All schedules are locked or normal.</span>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-amber-200 dark:border-amber-800/80 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-extrabold text-zinc-900 dark:text-white">
                      {req.userName}
                    </p>
                    <p className="text-xs text-zinc-400 font-mono">{req.userEmail}</p>
                  </div>
                  <span className="px-2 py-1 rounded-md text-[11px] font-extrabold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    {req.mealType} • {req.date}
                  </span>
                </div>

                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60">
                  <p className="text-[11px] text-zinc-400 font-bold uppercase mb-0.5">Member's Reason:</p>
                  <p className="text-xs text-zinc-800 dark:text-zinc-200 italic">
                    "{req.requestReason || 'No reason provided'}"
                  </p>
                  {req.requestedAt && (
                    <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Requested: {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>

                {/* Manager Decision Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    onClick={() => handleMealRequestAction(req.id, 'reject')}
                    disabled={requestActionLoading === req.id}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject (Keep ON)</span>
                  </button>

                  <button
                    onClick={() => handleMealRequestAction(req.id, 'accept')}
                    disabled={requestActionLoading === req.id}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept (Turn OFF)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === BAZAAR ASSIGNMENT & PAIRING SECTION === */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 md:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="text-base md:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-500" />
              Bazaar Assignment & Handover Cash (ফর্দ ও ক্যাশ হস্তান্তর)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Assign pairs of members with grocery checklist and handed over cash for live market mode
            </p>
          </div>
          <button
            onClick={() => setShowAssignForm(!showAssignForm)}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Bazaar Duty</span>
          </button>
        </div>

        {/* Assign Form */}
        {showAssignForm && (
          <form onSubmit={handleAssignBazaar} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Member 1 (Primary Duty Member)
                </label>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white"
                  required
                >
                  <option value="">-- Choose Member 1 --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Member 2 (Assigned Partner)
                </label>
                <select
                  value={assignMember2Id}
                  onChange={(e) => setAssignMember2Id(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white"
                >
                  <option value="">-- Optional Partner --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Date of Bazaar (বাজারের তারিখ)
                </label>
                <input
                  type="date"
                  value={assignDate}
                  onChange={(e) => setAssignDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Handover Cash / Allocated Budget (ক্যাশ টাকা হস্তান্তর ৳)
                </label>
                <input
                  type="number"
                  value={assignBudget}
                  onChange={(e) => setAssignBudget(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Draft Shopping Checklist (ফর্দ - কমা দিয়ে আলাদা করুন)
              </label>
              <input
                type="text"
                value={assignShoppingList}
                onChange={(e) => setAssignShoppingList(e.target.value)}
                placeholder="e.g. মুরগি ২ কেজি, চাল ৫ কেজি, সয়াবিন তেল ১ লিটার, আলু"
                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={assigning}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
            >
              {assigning ? 'Assigning...' : 'Save Double Member Bazaar Assignment'}
            </button>
          </form>
        )}

        {/* Desktop View: Assignments Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-bold">
                <th className="p-3">Assigned Members</th>
                <th className="p-3">Date</th>
                <th className="p-3">Handover Cash</th>
                <th className="p-3">Checklist</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-zinc-400 text-xs">
                    No bazaar assignments scheduled.
                  </td>
                </tr>
              ) : (
                assignments.slice(0, 10).map((a) => (
                  <tr key={a.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="p-3 font-bold text-zinc-900 dark:text-white">
                      {a.userName || 'Member 1'}
                      {a.member2Name && <span className="text-orange-500 font-bold"> & {a.member2Name}</span>}
                    </td>
                    <td className="p-3 font-medium text-zinc-600 dark:text-zinc-400">{a.date}</td>
                    <td className="p-3 font-extrabold text-amber-500 font-mono">৳{a.allocatedCash ?? a.budget ?? 0}</td>
                    <td className="p-3 text-xs text-zinc-500 max-w-[220px] truncate">
                      {a.shoppingList?.join(', ') || '--'}
                    </td>
                    <td className="p-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        a.status === 'verified' ? 'bg-emerald-500/10 text-emerald-500' : a.status === 'submitted' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: High-End Touch Cards */}
        <div className="md:hidden space-y-2.5">
          {assignments.length === 0 ? (
            <div className="p-4 text-center text-zinc-400 text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
              No bazaar assignments scheduled.
            </div>
          ) : (
            assignments.slice(0, 10).map((a) => (
              <div
                key={a.id}
                className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 space-y-2 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-xs text-zinc-900 dark:text-white">
                      {a.userName || 'Member 1'}
                      {a.member2Name && <span className="text-orange-400 font-bold"> & {a.member2Name}</span>}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{a.date}</p>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    a.status === 'verified' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : a.status === 'submitted' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  }`}>
                    {a.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-zinc-200/60 dark:border-zinc-700/60">
                  <span className="text-[11px] text-zinc-400">Handover Cash:</span>
                  <span className="font-mono font-bold text-amber-500">৳{a.allocatedCash ?? a.budget ?? 0}</span>
                </div>

                {a.shoppingList && a.shoppingList.length > 0 && (
                  <p className="text-[10px] text-zinc-400 truncate pt-1 border-t border-zinc-200/40 dark:border-zinc-700/40">
                    🛒 {a.shoppingList.join(', ')}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* === BAZAAR PURCHASE RECONCILIATION & VERIFICATION SECTION === */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 md:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="text-base md:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-500" />
              Live Bazaar Reconciliation & Verification (হিসাব মেলানো)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Reconcile cash out vs actual spend vs returned cash, review itemized grocery lists, and approve to recalculate live meal rate
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {expenses.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
              No bazaar expenses submitted for reconciliation yet.
            </div>
          ) : (
            expenses.map((exp) => {
              const matchingAssign = assignments.find(a => a.id === exp.assignmentId);
              const cashOut = exp.allocatedCash ?? matchingAssign?.allocatedCash ?? matchingAssign?.budget ?? exp.totalCost;
              const actualSpend = exp.totalCost;
              const cashReturn = exp.returnedCash !== undefined ? exp.returnedCash : Math.max(0, cashOut - actualSpend);
              const isExpanded = expandedExpenseId === exp.id;

              return (
                <div
                  key={exp.id}
                  className={`rounded-xl border transition-all overflow-hidden ${
                    exp.status === 'pending'
                      ? 'bg-amber-50/20 dark:bg-amber-950/10 border-amber-300 dark:border-amber-800/80 shadow-xs'
                      : 'bg-zinc-50/50 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  {/* Summary Bar */}
                  <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Member & Date */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-zinc-900 dark:text-white">
                          {exp.userName || 'Member'}
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">({exp.date})</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          exp.status === 'approved' 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                            : exp.status === 'rejected' 
                            ? 'bg-red-500/10 text-red-500' 
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/30 animate-pulse'
                        }`}>
                          {exp.status === 'approved' ? '✓ Verified' : exp.status === 'pending' ? '⏳ Awaiting Verification' : 'Rejected'}
                        </span>
                      </div>
                      {exp.remarks && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 italic mt-1">
                          "{exp.remarks}"
                        </p>
                      )}
                    </div>

                    {/* Middle: 3-Point Reconciliation Metrics */}
                    <div className="grid grid-cols-3 gap-2 text-center bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <div className="px-2">
                        <p className="text-[9px] uppercase font-bold text-zinc-400">Cash Out (দেওয়া হয়েছিল)</p>
                        <p className="text-xs sm:text-sm font-extrabold text-amber-600 dark:text-amber-400 font-mono">৳{cashOut}</p>
                      </div>
                      <div className="px-2 border-x border-zinc-100 dark:border-zinc-800">
                        <p className="text-[9px] uppercase font-bold text-zinc-400">Actual Spend (বাজার খরচ)</p>
                        <p className="text-xs sm:text-sm font-extrabold text-blue-600 dark:text-blue-400 font-mono">৳{actualSpend}</p>
                      </div>
                      <div className="px-2">
                        <p className="text-[9px] uppercase font-bold text-zinc-400">Cash Return (ফেরতযোগ্য)</p>
                        <p className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">৳{cashReturn}</p>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 justify-end">
                      {exp.receiptImage && (
                        <button
                          onClick={() => setEnlargedReceipt(exp.receiptImage!)}
                          className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      )}

                      <button
                        onClick={() => setExpandedExpenseId(isExpanded ? null : exp.id)}
                        className="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Items ({exp.items?.length || 0})</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {exp.status === 'pending' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleExpenseStatus(exp.id, 'approved')}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                            title="Verify Spend & Approve"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Verify & Approve</span>
                          </button>
                          <button
                            onClick={() => handleExpenseStatus(exp.id, 'rejected')}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors cursor-pointer"
                            title="Reject bill"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Itemized Checklist */}
                  {isExpanded && (
                    <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                      <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                        Itemized Purchase List (আইটেমভিত্তিক বিবরণ)
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {exp.items?.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                                  {item.name}
                                </span>
                                {item.isExtra && (
                                  <span className="text-[9px] px-1 py-0.2 bg-orange-500/10 text-orange-600 dark:text-orange-400 font-extrabold rounded">
                                    Extra
                                  </span>
                                )}
                              </div>
                              {item.qty && (
                                <p className="text-[10px] text-zinc-400">Qty: {item.qty}</p>
                              )}
                            </div>
                            <span className="text-xs font-extrabold text-zinc-900 dark:text-white font-mono">
                              ৳{item.cost}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FORCE CANCEL MODAL */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Force Cancel Today's Meals
              </h3>
              <button onClick={() => setIsCancelModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {cancelSuccess ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-center font-bold text-sm rounded-xl">
                {cancelSuccess}
              </div>
            ) : (
              <>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Select which meals to cancel for all members today:
                </p>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl border cursor-pointer text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    <input
                      type="radio"
                      name="cancelType"
                      value="both"
                      checked={cancelMealType === 'both'}
                      onChange={() => setCancelMealType('both')}
                    />
                    Cancel Both Lunch & Dinner
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl border cursor-pointer text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    <input
                      type="radio"
                      name="cancelType"
                      value="lunch"
                      checked={cancelMealType === 'lunch'}
                      onChange={() => setCancelMealType('lunch')}
                    />
                    Cancel Lunch Only
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl border cursor-pointer text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    <input
                      type="radio"
                      name="cancelType"
                      value="dinner"
                      checked={cancelMealType === 'dinner'}
                      onChange={() => setCancelMealType('dinner')}
                    />
                    Cancel Dinner Only
                  </label>
                </div>

                <button
                  onClick={handleForceCancelToday}
                  disabled={cancelling}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Force Cancel'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ENLARGED RECEIPT MODAL */}
      {enlargedReceipt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setEnlargedReceipt(null)}>
          <div className="max-w-xl w-full bg-zinc-900 p-2 rounded-2xl border border-zinc-700 relative">
            <button onClick={() => setEnlargedReceipt(null)} className="absolute top-4 right-4 p-1.5 bg-black/60 text-white rounded-full">
              <X className="w-5 h-5" />
            </button>
            <img src={enlargedReceipt} alt="Purchase receipt" className="max-h-[80vh] mx-auto rounded-xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
