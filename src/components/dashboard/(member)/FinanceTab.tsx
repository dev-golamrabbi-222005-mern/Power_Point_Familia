'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Receipt, 
  DollarSign, 
  PlusCircle, 
  Home, 
  Zap, 
  Wifi, 
  Flame, 
  UserCheck, 
  CheckCircle2, 
  Clock, 
  Lock, 
  X, 
  CreditCard,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { FinanceOverviewData, FixedExpenseItem, FixedUtilityType } from '@/src/types';
import { showSuccessAlert, showErrorAlert, showWarningAlert } from '@/src/lib/alerts';

interface FinanceTabProps {
  token: string;
  onError?: (msg: string) => void;
}

export default function FinanceTab({ token, onError }: FinanceTabProps) {
  const [data, setData] = useState<FinanceOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Payment Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'meal_cash' | FixedUtilityType>('meal_cash');
  const [selectedUtility, setSelectedUtility] = useState<FixedExpenseItem | null>(null);
  
  // Form fields
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bKash');
  const [transactionId, setTransactionId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchFinanceOverview = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/finance/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        onError?.('Failed to load finance data');
      }
    } catch (error) {
      console.error('Error fetching finance overview', error);
      onError?.('Failed to load finance overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceOverview();
  }, [token]);

  const openMealCashModal = () => {
    setModalType('meal_cash');
    setSelectedUtility(null);
    setAmount(data?.weeklyMealCashGuidance?.suggestedAmount?.toString() || '500');
    setPaymentMethod('bKash');
    setTransactionId('');
    setRemarks('');
    setIsModalOpen(true);
  };

  const openUtilityModal = (item: FixedExpenseItem) => {
    setModalType(item.type);
    setSelectedUtility(item);
    setAmount(item.share.toString());
    setPaymentMethod('bKash');
    setTransactionId('');
    setRemarks(`Fixed expense payment for ${item.label}`);
    setIsModalOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      showWarningAlert('Invalid Amount', 'Please enter a valid payment amount greater than 0');
      return;
    }
    if (!transactionId.trim()) {
      showWarningAlert('Missing Reference', 'Please enter Transaction ID or reference number');
      return;
    }

    try {
      setSubmitting(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const currentMonth = todayStr.slice(0, 7);
      
      const payload: any = {
        amount: Number(amount),
        date: todayStr,
        month: currentMonth,
        paymentMethod,
        transactionId: transactionId.trim(),
        remarks: modalType === 'meal_cash' 
          ? `Meal Cash Deposit${remarks ? ` (${remarks})` : ''}`
          : `Fixed Expense Payment: ${selectedUtility?.label || modalType}${remarks ? ` - ${remarks}` : ''}`,
        type: modalType === 'meal_cash' ? 'meal_cash' : 'fixed_cost',
        utilityType: selectedUtility?.type,
      };

      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || 'Payment ticket submission failed');
      }

      setIsModalOpen(false);
      await showSuccessAlert(
        'Ticket Submitted!',
        'Your payment ticket has been submitted for manager verification.'
      );
      fetchFinanceOverview();
    } catch (err: any) {
      showErrorAlert('Submission Failed', err.message || 'Error submitting payment ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const getUtilityIcon = (type: FixedUtilityType) => {
    switch (type) {
      case 'rent':
        return <Home className="w-5 h-5 text-indigo-500" />;
      case 'electricity':
        return <Zap className="w-5 h-5 text-amber-500" />;
      case 'wifi':
        return <Wifi className="w-5 h-5 text-blue-500" />;
      case 'gas':
        return <Flame className="w-5 h-5 text-orange-500" />;
      case 'servant_fee':
        return <UserCheck className="w-5 h-5 text-emerald-500" />;
      case 'extra_cost':
        return <Sparkles className="w-5 h-5 text-purple-400" />;
      default:
        return <Receipt className="w-5 h-5 text-zinc-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-xs text-zinc-400">Loading Finance Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Meal Closed Banner */}
      {data?.isMonthMealOff && (
        <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
          <div>
            <h3 className="font-extrabold text-sm text-amber-400">
              Meal Closed for This Month (এই মাসের জন্য মিল সার্ভিস বন্ধ রয়েছে)
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Only House Rent and Electricity apply. WiFi, Gas, and Servant fees are excluded (৳0) for this month.
            </p>
          </div>
        </div>
      )}

      {/* === TOP 4 CARDS GRID === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Assigned Fixed Costs */}
        <div className="bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent dark:from-indigo-900/30 dark:via-blue-900/20 dark:to-zinc-900 p-4 rounded-xl border border-indigo-200/70 dark:border-indigo-800/60 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              Assigned Fixed Costs
            </p>
            <div className="p-2 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white">
            ৳{data?.totalAssignedFixed || data?.fixedCostPaid || 0}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Paid: <span className="font-bold text-emerald-500">৳{data?.fixedCostPaid || 0}</span> for {data?.currentMonthName}
          </p>
        </div>

        {/* Card 2: Meal Cash Added */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-900/30 dark:via-teal-900/20 dark:to-zinc-900 p-4 rounded-xl border border-emerald-200/70 dark:border-emerald-800/60 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Meal Cash Added
            </p>
            <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white">
            ৳{data?.mealCashAdded || 0}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Approved meal cash balance
          </p>
        </div>

        {/* Card 3: Estimated Total Cash Spent */}
        <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-900/30 dark:via-orange-900/20 dark:to-zinc-900 p-4 rounded-xl border border-amber-200/70 dark:border-amber-800/60 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Estimated Total Cash
            </p>
            <div className="p-2 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white">
            ৳{data?.estimatedTotalCost || 0}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Fixed + Meal Cash spent this month
          </p>
        </div>

        {/* Card 4: Add Meal Cash Action Button */}
        <div className="bg-gradient-to-br from-emerald-600/15 to-emerald-500/5 dark:from-emerald-950/40 dark:to-zinc-900 p-4 rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-wider">
                Meal Cash System
              </p>
              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-500/30">
                Week {data?.weeklyMealCashGuidance?.currentWeekNumber || 1}
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Suggested: <span className="font-bold text-emerald-600 dark:text-emerald-400">৳{data?.weeklyMealCashGuidance?.suggestedAmount || 500}</span>
            </p>
          </div>

          {data?.isMonthMealOff ? (
            <div className="mt-3 p-2 bg-amber-500/10 text-amber-400 text-xs font-bold rounded-lg text-center border border-amber-500/20">
              Meal Closed This Month
            </div>
          ) : (
            <button
              onClick={openMealCashModal}
              className="mt-3 w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-bold text-xs md:text-sm py-2.5 px-4 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Meal Cash</span>
            </button>
          )}
        </div>
      </div>

      {/* === FIXED EXPENSES BREAKDOWN SECTION === */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 md:p-6 shadow-sm">
        {data?.assignedPastDue && data.assignedPastDue > 0 ? (
          <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <div>
                <p className="font-bold text-red-400">Past Month Due Assigned by Manager</p>
                <p className="text-zinc-400">Please clear your past month pending balance with the Manager.</p>
              </div>
            </div>
            <span className="text-sm font-extrabold text-red-400">৳{data.assignedPastDue}</span>
          </div>
        ) : null}

        <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-indigo-500" />
              Fixed Monthly Expenses
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Assigned by manager per person for {data?.currentMonthName}
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg">
            5 Utility Bills
          </span>
        </div>

        {/* Expenses List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data?.fixedExpenses?.map((item) => (
            <div 
              key={item.type}
              className="p-4 bg-zinc-50/80 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-xs">
                    {getUtilityIcon(item.type)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                      {item.label}
                    </h3>
                    <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                      ৳{item.share} <span className="text-[10px] font-normal text-zinc-400">/ person</span>
                    </p>
                  </div>
                </div>
                
                {/* Status Badge */}
                {item.share === 0 && (item.type === 'servant_fee' || item.type === 'wifi' || item.type === 'gas') ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-zinc-500/10 text-zinc-400 rounded-full border border-zinc-500/20">
                    Excluded (Meal Off)
                  </span>
                ) : item.status === 'paid' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Paid
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-full border border-amber-500/30">
                    <Clock className="w-3 h-3 text-amber-500" />
                    Pending
                  </span>
                )}
              </div>

              {/* Action Button */}
              {item.status !== 'paid' && item.share > 0 && (
                <button
                  onClick={() => openUtilityModal(item)}
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-xs py-2 px-3 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Pay Now (৳{item.share})</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* === BOTTOM ACTUAL MEAL & TOTAL COST SUMMARY SECTION === */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Actual Month-End Cost Calculation
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Live calculation based on individual meal count * live meal rate
            </p>
          </div>

          {data?.isCalculationVisible ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Calculation Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-full border border-amber-500/30">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              Locked (Pending Release)
            </span>
          )}
        </div>

        {/* Calculation Content */}
        {!data?.isCalculationVisible ? (
          <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 text-center space-y-3">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Month-End Calculation Pending
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              Actual meal calculations are published on the last day of the month or when released by the manager for a 1-hour window.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">Total Meals Consumed</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{data.myTotalMeals} meals</p>
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">Live Meal Rate</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">৳{data.liveMealRate}</p>
            </div>
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">Actual Meal Cost</p>
              <p className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-100 mt-1">৳{data.actualMealCost}</p>
            </div>
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <p className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold">Total Month Cost</p>
              <p className="text-2xl font-extrabold text-indigo-900 dark:text-indigo-100 mt-1">৳{data.actualTotalCost}</p>
            </div>
          </div>
        )}
      </div>

      {/* === PAYMENT TICKET MODAL === */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 md:p-5 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    {modalType === 'meal_cash' ? 'Add Meal Cash Request' : `Pay ${selectedUtility?.label}`}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Submit payment ticket for manager approval
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handlePaymentSubmit} className="p-4 md:p-5 space-y-4">
              {successMsg ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">{successMsg}</p>
                </div>
              ) : (
                <>
                  {/* Amount Field */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Payment Amount (BDT)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm font-bold text-zinc-400">৳</span>
                      <input
                        type="number"
                        min="1"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                        placeholder="Enter amount"
                      />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="bKash">bKash</option>
                      <option value="Nagad">Nagad</option>
                      <option value="Rocket">Rocket</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Hand Cash</option>
                    </select>
                  </div>

                  {/* Transaction ID */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Transaction ID / Reference
                    </label>
                    <input
                      type="text"
                      required
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      placeholder="e.g. TRX12345678"
                    />
                  </div>

                  {/* Remarks */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      placeholder="Additional notes"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? 'Submitting Ticket...' : 'Submit Payment Ticket'}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
