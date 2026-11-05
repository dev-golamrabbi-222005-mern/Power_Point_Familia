import React, { useState, useEffect } from 'react';
import { User, MonthlySummary, AdminChangeRequest } from '@/src/types';
import { ShieldCheck, CheckCircle2, Sliders, Save, AlertCircle, RefreshCw, Layers, Home, Zap, Wifi, Flame, Users, Receipt, CreditCard } from 'lucide-react';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '@/src/lib/alerts';

interface AdminPermissionsTabProps {
  token: string;
  mealRate: number;
  onRefreshSettings: () => void;
}

export default function AdminPermissionsTab({ token, mealRate, onRefreshSettings }: AdminPermissionsTabProps) {
  const [rateInput, setRateInput] = useState(mealRate.toString());
  const [autoBookEnabled, setAutoBookEnabled] = useState(true);
  const [autoBookLoading, setAutoBookLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [loadingRate, setLoadingRate] = useState(false);

  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummary[]>([]);
  const [changeRequests, setChangeRequests] = useState<AdminChangeRequest[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // 5 Main Fixed Utility Targets (Admin Configurable)
  const [rentTarget, setRentTarget] = useState('19000');
  const [electricityTarget, setElectricityTarget] = useState('3800');
  const [wifiTarget, setWifiTarget] = useState('650');
  const [gasTarget, setGasTarget] = useState('2060');
  const [servantTarget, setServantTarget] = useState('4000');
  const [savingTargets, setSavingTargets] = useState(false);

  const fetchPermissionsData = async () => {
    try {
      const settingsRes = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        setAutoBookEnabled(sData.autoBookMeals ?? true);
        if (sData.fixedUtilityTargets) {
          if (sData.fixedUtilityTargets.rent !== undefined) setRentTarget(sData.fixedUtilityTargets.rent.toString());
          if (sData.fixedUtilityTargets.electricity !== undefined) setElectricityTarget(sData.fixedUtilityTargets.electricity.toString());
          if (sData.fixedUtilityTargets.wifi !== undefined) setWifiTarget(sData.fixedUtilityTargets.wifi.toString());
          if (sData.fixedUtilityTargets.gas !== undefined) setGasTarget(sData.fixedUtilityTargets.gas.toString());
          if (sData.fixedUtilityTargets.servant !== undefined) setServantTarget(sData.fixedUtilityTargets.servant.toString());
        }
      }

      const monthRes = await fetch('/api/month-end', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (monthRes.ok) setMonthlySummaries(await monthRes.json());

      const reqRes = await fetch('/api/admin/change-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (reqRes.ok) setChangeRequests(await reqRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPermissionsData();
  }, [token]);

  useEffect(() => {
    setRateInput(mealRate.toString());
  }, [mealRate]);

  const handleToggleAutoBook = async () => {
    setAutoBookLoading(true);
    try {
      const res = await fetch('/api/settings/auto-book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ autoBookMeals: !autoBookEnabled })
      });
      const data = await res.json();
      if (res.ok) {
        setAutoBookEnabled(data.autoBookMeals);
        onRefreshSettings();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAutoBookLoading(false);
    }
  };

  const handleUpdateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess('');
    setSettingsError('');
    setLoadingRate(true);

    if (Number(rateInput) <= 0) {
      setSettingsError('Meal rate must be a positive value.');
      setLoadingRate(false);
      return;
    }

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ mealRate: Number(rateInput) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update.');
      setSettingsSuccess('Meal rate saved globally!');
      onRefreshSettings();
    } catch (err: any) {
      setSettingsError(err.message || 'Error occurred.');
    } finally {
      setLoadingRate(false);
    }
  };

  const handleSaveUtilityTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingTargets(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fixedUtilityTargets: {
            rent: Number(rentTarget || 19000),
            electricity: Number(electricityTarget || 3800),
            wifi: Number(wifiTarget || 650),
            gas: Number(gasTarget || 2060),
            servant: Number(servantTarget || 4000),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update targets');
      showSuccessAlert('Saved!', 'Fixed utility budget targets updated successfully.');
      onRefreshSettings();
      fetchPermissionsData();
    } catch (err: any) {
      showErrorAlert('Error', err.message || 'Error updating fixed utility targets');
    } finally {
      setSavingTargets(false);
    }
  };

  const handleProcessChangeRequest = async (requestId: string, action: 'approved' | 'rejected') => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/change-requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ requestId, action })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccessAlert('Success', data.message);
        fetchPermissionsData();
      } else {
        showErrorAlert('Action Failed', data.message || 'Action failed');
      }
    } catch (e: any) {
      console.error(e);
      showErrorAlert('Error', e.message || 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveMonthEnd = async (summaryId: string, action: 'approve' | 'reject') => {
    if (action === 'approve') {
      const confirmed = await showConfirmAlert(
        'Approve Month-End Reset?',
        'This will clear active daily meals/expenses and carry forward member ending balances.',
        'Yes, Approve'
      );
      if (!confirmed) return;
    }
    
    setActionLoading(true);
    try {
      const res = await fetch('/api/month-end', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ summaryId, action })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccessAlert('Success', data.message);
        fetchPermissionsData();
      } else {
        showErrorAlert('Action Failed', data.message || 'Action failed.');
      }
    } catch (e: any) {
      console.error(e);
      showErrorAlert('Error', e.message || 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingRequests = changeRequests.filter(r => r.status === 'pending');
  const pendingMonthEnds = monthlySummaries.filter(s => s.status === 'pending_approval');

  return (
    <div className="space-y-6">
      {/* Global System Variables & Auto-Book Switch */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global Auto Meal Booking Switch */}
        <div className="bg-[#111111] border border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-zinc-100">Global Auto Meal Booking</h3>
                <p className="text-xs text-zinc-400">Automatically book 1 meal daily for all active members</p>
              </div>
            </div>
            {/* Toggle Switch */}
            <button
              onClick={handleToggleAutoBook}
              disabled={autoBookLoading}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 cursor-pointer focus:outline-none disabled:opacity-50 ${
                autoBookEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
              }`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 ${
                autoBookEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs text-zinc-400 leading-relaxed">
            Status: <strong className={autoBookEnabled ? 'text-emerald-400' : 'text-amber-400'}>{autoBookEnabled ? 'Enabled' : 'Disabled'}</strong>. When enabled, all verified members receive 1 automatic meal entry every morning unless manually opted out.
          </div>
        </div>

        {/* Live Meal Rate Display (Auto Generated) */}
        <div className="bg-[#111111] border border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-zinc-100">Live Meal Rate (Auto Calculated)</h3>
              <p className="text-xs text-zinc-400">Formula: Mess Verified Bajar Expenses / Total Mess Meals</p>
            </div>
          </div>

          <div className="p-4 bg-zinc-900/80 rounded-xl border border-zinc-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Current Live Rate</p>
              <p className="text-2xl font-black text-purple-400 mt-1">৳{mealRate} <span className="text-xs text-zinc-400 font-normal">/ plate</span></p>
            </div>
            <span className="text-xs font-bold px-3 py-1.5 bg-purple-500/15 text-purple-300 rounded-lg border border-purple-500/20">
              Automated
            </span>
          </div>
        </div>
      </div>

      {/* Main 5 Fixed Utility Costs Budget Setting (Admin Controlled) */}
      <div className="bg-[#111111] border border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-4">
          <div>
            <h3 className="font-display font-bold text-lg text-zinc-100 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-indigo-400" />
              Fixed Utility Costs Budget Settings (ফিক্সড ইউটিলিটি বিল বাজেট)
            </h3>
            <p className="text-xs text-zinc-400">
              Set the monthly target amounts for the 5 core mess utility bills. Managers will collect towards these targets and request disbursement.
            </p>
          </div>
          <div className="px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-right">
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Total Monthly Budget</p>
            <p className="text-base font-black text-indigo-400">
              ৳{(Number(rentTarget || 0) + Number(electricityTarget || 0) + Number(wifiTarget || 0) + Number(gasTarget || 0) + Number(servantTarget || 0)).toLocaleString()}
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveUtilityTargets} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. House Rent */}
            <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-emerald-400" />
                <span>House Rent (বাড়ি ভাড়া)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-500 font-bold text-sm">৳</span>
                <input
                  type="number"
                  min="0"
                  required
                  value={rentTarget}
                  onChange={(e) => setRentTarget(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-zinc-950 border border-zinc-700/80 rounded-lg text-sm font-bold text-zinc-100 focus:border-indigo-500 focus:outline-none"
                  placeholder="19000"
                />
              </div>
              <p className="text-[10px] text-zinc-500 font-mono">Default: ৳19,000</p>
            </div>

            {/* 2. Electricity Bill */}
            <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Current Bill (বিদ্যুৎ বিল)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-500 font-bold text-sm">৳</span>
                <input
                  type="number"
                  min="0"
                  required
                  value={electricityTarget}
                  onChange={(e) => setElectricityTarget(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-zinc-950 border border-zinc-700/80 rounded-lg text-sm font-bold text-zinc-100 focus:border-indigo-500 focus:outline-none"
                  placeholder="3800"
                />
              </div>
              <p className="text-[10px] text-zinc-500 font-mono">Default: ৳3,800</p>
            </div>

            {/* 3. WiFi Bill */}
            <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-blue-400" />
                <span>WiFi Bill (ইন্টারনেট বিল)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-500 font-bold text-sm">৳</span>
                <input
                  type="number"
                  min="0"
                  required
                  value={wifiTarget}
                  onChange={(e) => setWifiTarget(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-zinc-950 border border-zinc-700/80 rounded-lg text-sm font-bold text-zinc-100 focus:border-indigo-500 focus:outline-none"
                  placeholder="650"
                />
              </div>
              <p className="text-[10px] text-zinc-500 font-mono">Default: ৳650</p>
            </div>

            {/* 4. Gas Bill */}
            <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>Gas Bill (গ্যাস বিল)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-500 font-bold text-sm">৳</span>
                <input
                  type="number"
                  min="0"
                  required
                  value={gasTarget}
                  onChange={(e) => setGasTarget(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-zinc-950 border border-zinc-700/80 rounded-lg text-sm font-bold text-zinc-100 focus:border-indigo-500 focus:outline-none"
                  placeholder="2060"
                />
              </div>
              <p className="text-[10px] text-zinc-500 font-mono">Default: ৳2,060</p>
            </div>

            {/* 5. Servant Fee */}
            <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>Servant Fee (বুয়া বিল)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-500 font-bold text-sm">৳</span>
                <input
                  type="number"
                  min="0"
                  required
                  value={servantTarget}
                  onChange={(e) => setServantTarget(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-zinc-950 border border-zinc-700/80 rounded-lg text-sm font-bold text-zinc-100 focus:border-indigo-500 focus:outline-none"
                  placeholder="4000"
                />
              </div>
              <p className="text-[10px] text-zinc-500 font-mono">Default: ৳4,000</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingTargets}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingTargets ? 'Saving Budgets...' : 'Save Fixed Utility Budgets'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Pending Manager Significant Change Requests */}
      <div className="bg-[#111111] border border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-lg text-zinc-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" /> Manager Significant Change Requests ({pendingRequests.length})
          </h3>
          <button onClick={fetchPermissionsData} className="p-1.5 text-zinc-400 hover:text-zinc-200">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="p-8 text-center bg-zinc-900/40 rounded-xl border border-zinc-800/80">
            <p className="text-xs text-zinc-500 font-medium">No pending significant change requests from Managers.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div key={req.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  {req.type === 'pay_fixed_bill' ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                          <CreditCard className="w-3 h-3" /> Bill Payment Request
                        </span>
                        <p className="text-sm font-bold text-zinc-100">
                          {req.newValue?.label || 'Fixed Bill'}: ৳{req.newValue?.amount?.toLocaleString()} ({req.newValue?.month})
                        </p>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Manager <strong className="text-purple-400">{req.managerName}</strong> requests to disburse{' '}
                        <strong className="text-emerald-400">৳{req.newValue?.amount?.toLocaleString()}</strong> via{' '}
                        <strong className="text-indigo-400">{req.newValue?.paymentMethod || 'Cash'}</strong>
                        {req.newValue?.trxId && ` (TrxID: ${req.newValue.trxId})`}.
                      </p>
                      {req.newValue?.remarks && (
                        <p className="text-[11px] text-zinc-500 mt-0.5 italic">Note: "{req.newValue.remarks}"</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded uppercase">
                          {req.type}
                        </span>
                        <p className="text-sm font-bold text-zinc-100">{req.details}</p>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Requested by Manager <strong className="text-purple-400">{req.managerName}</strong> for Member <strong className="text-emerald-400">{req.targetUserName}</strong>
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleProcessChangeRequest(req.id, 'rejected')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-red-500/15 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/25 cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleProcessChangeRequest(req.id, 'approved')}
                    disabled={actionLoading}
                    className="px-4 py-1.5 bg-emerald-500 text-zinc-950 text-xs font-black rounded-lg hover:bg-emerald-400 cursor-pointer shadow-md"
                  >
                    Approve Request
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Month-End Reset Requests */}
      {pendingMonthEnds.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-purple-600/10 border-2 border-amber-500/30 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-amber-400 animate-pulse" />
            <div>
              <h3 className="font-display font-bold text-lg text-zinc-100">Pending Month-End Reset Approvals</h3>
              <p className="text-xs text-zinc-400">Review final calculations before archiving the month</p>
            </div>
          </div>

          {pendingMonthEnds.map(summary => (
            <div key={summary.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-zinc-300">
                <span>Month: {summary.month}</span>
                <span>Total Bazaar: {summary.totalBazaarExpense}৳</span>
                <span>Total Meals: {summary.totalMealsCount} Plates</span>
                <span className="text-emerald-400">Final Meal Rate: {summary.finalMealRate}৳</span>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => handleApproveMonthEnd(summary.id, 'reject')}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-500/15 text-red-400 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleApproveMonthEnd(summary.id, 'approve')}
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-500 text-zinc-950 text-xs font-black rounded-lg cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve & Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
