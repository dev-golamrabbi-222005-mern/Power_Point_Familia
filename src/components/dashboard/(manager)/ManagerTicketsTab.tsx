'use client';

import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Check, 
  X, 
  Search, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Receipt, 
  Wallet,
  AlertTriangle,
  User,
  ShoppingBag,
  Eye,
} from 'lucide-react';
import { Deposit, RefundRequest, User as UserType, BazaarExpense } from '@/src/types';
import EmergencyMealRequestCard from './emergency-meal-request-card';
import { showSuccessAlert, showErrorAlert, showWarningAlert } from '@/src/lib/alerts';

interface ManagerTicketsTabProps {
  token: string;
  onError?: (msg: string) => void;
  onRefreshData?: () => void;
  prefillWarnUserId?: string | null;
}

export default function ManagerTicketsTab({ token, onError, onRefreshData, prefillWarnUserId }: ManagerTicketsTabProps) {
  const [deposits, setDeposits] = useState<(Deposit & { userEmail?: string })[]>([]);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [lateRequests, setLateRequests] = useState<any[]>([]);
  const [bazaarExpenses, setBazaarExpenses] = useState<BazaarExpense[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceiptImage, setSelectedReceiptImage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filters
  const [ticketFilter, setTicketFilter] = useState<'pending' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Warning modal state
  const [isWarnModalOpen, setIsWarnModalOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [warnTitle, setWarnTitle] = useState('Payment Deadline Warning');
  const [warnMessage, setWarnMessage] = useState('');
  const [warnDeadline, setWarnDeadline] = useState('');
  const [warnCategory, setWarnCategory] = useState<'Payment Overdue' | 'Meal Cash Dues' | 'Bazaar Notice'>('Payment Overdue');
  const [warnSubmitting, setWarnSubmitting] = useState(false);
  const [warnSuccess, setWarnSuccess] = useState('');

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const [depRes, refRes, usersRes, lateRes, expRes] = await Promise.all([
        fetch('/api/deposits', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/refunds', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/members', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/records/request-meal-off', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/bazaar/expense', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (depRes.ok) setDeposits(await depRes.json());
      if (refRes.ok) setRefunds(await refRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (lateRes.ok) setLateRequests(await lateRes.json());
      if (expRes.ok) setBazaarExpenses(await expRes.json());
    } catch (err) {
      console.error('Error fetching tickets', err);
      onError?.('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [token]);

  useEffect(() => {
    if (prefillWarnUserId) {
      setTargetUserId(prefillWarnUserId);
      setIsWarnModalOpen(true);
    }
  }, [prefillWarnUserId]);

  const handleDepositAction = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/deposits/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Status update failed');
      showSuccessAlert('Success', `Deposit status updated to ${status}`);
      fetchTickets();
      onRefreshData?.();
    } catch (err: any) {
      showErrorAlert('Action Failed', err.message || 'Action failed');
    }
  };

  const handleRefundAction = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/refunds/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Refund status update failed');
      showSuccessAlert('Success', `Refund request ${status}`);
      fetchTickets();
      onRefreshData?.();
    } catch (err: any) {
      showErrorAlert('Action Failed', err.message || 'Action failed');
    }
  };

  const handleBazaarAction = async (id: string, status: 'approved' | 'rejected') => {
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/bazaar/expense/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Action failed');
      }
      showSuccessAlert(
        status === 'approved' ? 'বাজার বিল সফলভাবে অনুমোদিত হয়েছে!' : 'বাজার বিল বাতিল করা হয়েছে',
        status === 'approved'
          ? 'মেসের মিল ক্যাশ থেকে বিলের টাকা সমন্বয় করা হয়েছে এবং পেয়ার রোটেশন আপডেট হয়েছে।'
          : 'মেম্বার বিলটি সংশোধন করতে পারবেন।'
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bazaar-updated'));
      }
      fetchTickets();
      onRefreshData?.();
    } catch (err: any) {
      showErrorAlert('অ্যাকশন ব্যর্থ হয়েছে', err.message || 'Action failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) {
      showWarningAlert('Missing Member', 'Please select a member to warn');
      return;
    }
    if (!warnMessage.trim()) {
      showWarningAlert('Missing Message', 'Please enter warning message');
      return;
    }

    try {
      setWarnSubmitting(true);
      const res = await fetch('/api/tickets/warn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId,
          title: warnTitle,
          message: warnMessage,
          deadlineDate: warnDeadline,
          category: warnCategory,
        }),
      });

      if (!res.ok) throw new Error('Failed to issue warning ticket');

      showSuccessAlert('Ticket Issued', 'Warning ticket issued successfully to member!');
      setIsWarnModalOpen(false);
      setWarnMessage('');
      fetchTickets();
    } catch (err: any) {
      showErrorAlert('Error', err.message || 'Error sending warning ticket');
    } finally {
      setWarnSubmitting(false);
    }
  };

  const filteredDeposits = deposits.filter((d) => {
    const matchesFilter = ticketFilter === 'all' || d.status === 'pending';
    const userName = users.find(u => u.id === d.userId)?.name || d.userName || '';
    const matchesSearch = !searchQuery || userName.toLowerCase().includes(searchQuery.toLowerCase()) || d.transactionId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-xs text-zinc-400">Loading Tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Warning Issuer Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 md:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-500" />
            Member Tickets & Payment Requests
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Verify payment tickets, deposits, fixed utility payments, and issue warnings
          </p>
        </div>

        <button
          onClick={() => {
            setTargetUserId(users[0]?.id || '');
            setIsWarnModalOpen(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <Send className="w-4 h-4" />
          <span>Issue Warning / Deadline Ticket</span>
        </button>
      </div>

      {/* Emergency Meal-Off Requests Section */}
      {lateRequests.filter(r => r.requestStatus === 'pending').length > 0 && (
        <div className="space-y-3 p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>Urgent Meal-Off Requests ({lateRequests.filter(r => r.requestStatus === 'pending').length})</span>
            </h3>
            <span className="text-[10px] text-amber-300">Action needed before meal cooking</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lateRequests
              .filter(r => r.requestStatus === 'pending')
              .map(req => (
                <EmergencyMealRequestCard
                  key={req.id}
                  request={req}
                  token={token}
                  onResolved={() => {
                    fetchTickets();
                    onRefreshData?.();
                  }}
                />
              ))}
          </div>
        </div>
      )}

      {/* Bazaar Expense Verification Tickets Section */}
      {bazaarExpenses.filter(e => ticketFilter === 'all' ? true : e.status === 'pending').length > 0 && (
        <div className="space-y-3 p-4 md:p-5 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-zinc-900 border border-orange-500/30 rounded-2xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-orange-500/20">
            <div>
              <h3 className="text-sm md:text-base font-extrabold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-400" />
                <span>Bazaar Expense Verification Tickets (বাজার ভেরিফিকেশন টিকিট)</span>
                {bazaarExpenses.filter(e => e.status === 'pending').length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-500 text-white animate-pulse">
                    {bazaarExpenses.filter(e => e.status === 'pending').length} Action Needed
                  </span>
                )}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Verify shopper item checklist & bill amount. Approving deducts from mess cash and settles the pair.
              </p>
            </div>
            <span className="text-xs font-bold text-orange-300">
              Total Pending: ৳{bazaarExpenses.filter(e => e.status === 'pending').reduce((s, e) => s + (e.totalCost || 0), 0)}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pt-1">
            {bazaarExpenses
              .filter(e => ticketFilter === 'all' ? true : e.status === 'pending')
              .map(exp => {
                const userObj = users.find(u => u.id === exp.userId);
                const shopperName = exp.userName || userObj?.name || 'Shopper';
                const shopperEmail = exp.userEmail || userObj?.email || '';
                const handover = exp.allocatedCash ?? 0;
                const returnCash = exp.returnedCash ?? Math.max(0, handover - exp.totalCost);

                return (
                  <div
                    key={exp.id}
                    className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-3 shadow-md hover:border-orange-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-white">{shopperName}</span>
                          {exp.partnerName && (
                            <span className="text-[11px] text-zinc-400 font-medium">
                              (Partner: <strong className="text-zinc-300">{exp.partnerName}</strong>)
                            </span>
                          )}
                        </div>
                        {shopperEmail && (
                          <p className="text-[11px] text-zinc-400 font-mono">{shopperEmail}</p>
                        )}
                        <p className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Date: {exp.date}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-base md:text-lg font-black text-amber-400 font-mono">
                          ৳{exp.totalCost}
                        </span>
                        <p className="text-[10px] text-zinc-400">Total Spent</p>
                      </div>
                    </div>

                    {/* Cash Allocation & Return Summary */}
                    <div className="grid grid-cols-3 gap-2 p-2 bg-zinc-800/60 rounded-lg text-center text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Handover</span>
                        <strong className="text-emerald-400 font-mono">৳{handover}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Spent Bill</span>
                        <strong className="text-amber-400 font-mono">৳{exp.totalCost}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Returned</span>
                        <strong className="text-teal-400 font-mono">৳{returnCash}</strong>
                      </div>
                    </div>

                    {/* Itemized Checklist Preview */}
                    {exp.items && exp.items.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                          Purchased Items ({exp.items.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                          {exp.items.map((it, idx) => (
                            <span
                              key={idx}
                              className={`text-[11px] px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 ${
                                it.isExtra
                                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                  : 'bg-zinc-800 text-zinc-200 border border-zinc-700/60'
                              }`}
                            >
                              <span>{it.name}</span>
                              {it.qty && <span className="text-zinc-400">({it.qty})</span>}
                              <strong className="font-mono text-amber-300">৳{it.cost}</strong>
                              {it.isExtra && (
                                <span className="text-[9px] bg-orange-500 text-white px-1 py-0.2 rounded font-black">
                                  Extra
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Remarks & Receipt Button */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      {exp.remarks ? (
                        <p className="text-xs text-zinc-400 italic truncate max-w-[200px]" title={exp.remarks}>
                          "{exp.remarks}"
                        </p>
                      ) : (
                        <span className="text-[10px] text-zinc-500">No remarks</span>
                      )}

                      {exp.receiptImage && (
                        <button
                          onClick={() => setSelectedReceiptImage(exp.receiptImage!)}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                          <span>View Receipt</span>
                        </button>
                      )}
                    </div>

                    {/* Status & Actions */}
                    <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          exp.status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : exp.status === 'rejected'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse'
                        }`}
                      >
                        {exp.status === 'approved' ? '✓ Approved & Settle' : exp.status === 'rejected' ? '✕ Rejected' : '● Pending Manager Review'}
                      </span>

                      {exp.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleBazaarAction(exp.id, 'rejected')}
                            disabled={actionLoadingId === exp.id}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                          <button
                            onClick={() => handleBazaarAction(exp.id, 'approved')}
                            disabled={actionLoadingId === exp.id}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve & Deduct Cash</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-2">
          <button
            onClick={() => setTicketFilter('pending')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              ticketFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            Pending Tickets ({deposits.filter(d => d.status === 'pending').length})
          </button>
          <button
            onClick={() => setTicketFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              ticketFilter === 'all'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            All Tickets
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search member or Trx ID..."
            className="pl-9 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 w-full sm:w-60"
          />
        </div>
      </div>

      {/* Tickets List / Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 md:p-6 shadow-sm">
        {/* Desktop View: Wide Data Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-bold">
                <th className="p-3">Member</th>
                <th className="p-3">Ticket Type / Date</th>
                <th className="p-3">Payment Method</th>
                <th className="p-3">Trx ID / Ref</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Remarks / Details</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-zinc-400 text-xs">
                    No tickets found matching the filter.
                  </td>
                </tr>
              ) : (
                filteredDeposits.map((dep) => {
                  const member = users.find((u) => u.id === dep.userId);
                  const isNotice = dep.paymentMethod === 'Notice / Warning';

                  return (
                    <tr key={dep.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-zinc-900 dark:text-white">
                          {member ? member.name : dep.userName || 'Member'}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          {member?.email || dep.userEmail || ''}
                        </p>
                      </td>

                      <td className="p-3 font-semibold text-zinc-700 dark:text-zinc-300">
                        {isNotice ? (
                          <span className="text-amber-500 font-bold">Warning Notice</span>
                        ) : dep.remarks?.includes('Fixed Expense') ? (
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold">Fixed Utility Ticket</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Meal Cash Ticket</span>
                        )}
                        <p className="text-[10px] text-zinc-400 font-normal">
                          {new Date(dep.date).toLocaleDateString()}
                        </p>
                      </td>

                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 font-bold text-[11px] rounded text-zinc-700 dark:text-zinc-300">
                          {dep.paymentMethod}
                        </span>
                      </td>

                      <td className="p-3 font-mono text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                        {dep.transactionId}
                      </td>

                      <td className="p-3 font-extrabold text-zinc-900 dark:text-white">
                        ৳{dep.amount}
                      </td>

                      <td className="p-3 text-xs text-zinc-500 dark:text-zinc-400 max-w-[200px] truncate" title={dep.remarks}>
                        {dep.remarks || '--'}
                      </td>

                      <td className="p-3 text-center">
                        {dep.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Approved
                          </span>
                        ) : dep.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full border border-red-500/20">
                            <X className="w-3 h-3" />
                            Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full border border-amber-500/20">
                            <Clock className="w-3 h-3 animate-pulse" />
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        {dep.status === 'pending' ? (
                          <div className="inline-flex gap-1.5">
                            <button
                              onClick={() => handleDepositAction(dep.id, 'approved')}
                              className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all cursor-pointer shadow-xs"
                              title="Accept & Add to Cash / Paid Status"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDepositAction(dep.id, 'rejected')}
                              className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all cursor-pointer shadow-xs"
                              title="Reject Ticket"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-400 font-mono">Processed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: High-End Responsive Touch Cards */}
        <div className="md:hidden space-y-3">
          {filteredDeposits.length === 0 ? (
            <div className="p-6 text-center text-zinc-400 text-xs">
              No tickets found matching the filter.
            </div>
          ) : (
            filteredDeposits.map((dep) => {
              const member = users.find((u) => u.id === dep.userId);
              const isNotice = dep.paymentMethod === 'Notice / Warning';

              return (
                <div
                  key={dep.id}
                  className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 space-y-3 shadow-xs"
                >
                  {/* Card Header: Member + Amount + Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm text-zinc-900 dark:text-white">
                        {member ? member.name : dep.userName || 'Member'}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        {member?.email || dep.userEmail || ''}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-base font-black text-zinc-900 dark:text-white">
                        ৳{dep.amount}
                      </p>
                      <div className="mt-0.5">
                        {dep.status === 'approved' ? (
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-extrabold rounded-full border border-emerald-500/20">
                            Approved ✓
                          </span>
                        ) : dep.status === 'rejected' ? (
                          <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-extrabold rounded-full border border-red-500/20">
                            Rejected ✕
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] font-extrabold rounded-full border border-amber-500/20 animate-pulse">
                            Pending ⏳
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ticket Details Pill & Info */}
                  <div className="p-2.5 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300">
                        {isNotice ? (
                          <span className="text-amber-500 font-bold">Warning Notice</span>
                        ) : dep.remarks?.includes('Fixed Expense') ? (
                          <span className="text-indigo-400 font-bold">Fixed Utility Ticket</span>
                        ) : (
                          <span className="text-emerald-400 font-bold">Meal Cash Ticket</span>
                        )}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {new Date(dep.date).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-100 dark:border-zinc-800">
                      <span className="text-zinc-400">Method: <strong className="text-zinc-200">{dep.paymentMethod}</strong></span>
                      <span className="text-zinc-400 font-mono text-[10px]">Trx: <strong className="text-zinc-200">{dep.transactionId || '--'}</strong></span>
                    </div>

                    {dep.remarks && (
                      <p className="text-[11px] text-zinc-400 italic pt-1 border-t border-zinc-100 dark:border-zinc-800">
                        "{dep.remarks}"
                      </p>
                    )}
                  </div>

                  {/* Actions for Pending Tickets */}
                  {dep.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleDepositAction(dep.id, 'approved')}
                        className="py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve Deposit</span>
                      </button>
                      <button
                        onClick={() => handleDepositAction(dep.id, 'rejected')}
                        className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs rounded-xl border border-red-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* WARNING MODAL */}
      {isWarnModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            <div className="p-4 md:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Issue Warning / Deadline Ticket
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Send warning notice to member
                  </p>
                </div>
              </div>
              <button onClick={() => setIsWarnModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendWarning} className="p-4 md:p-5 space-y-4">
              {warnSuccess ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">{warnSuccess}</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Target Member
                    </label>
                    <select
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Category
                    </label>
                    <select
                      value={warnCategory}
                      onChange={(e: any) => setWarnCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Payment Overdue">Payment Overdue</option>
                      <option value="Meal Cash Dues">Meal Cash Dues</option>
                      <option value="Bazaar Notice">Bazaar Notice</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Warning Title
                    </label>
                    <input
                      type="text"
                      required
                      value={warnTitle}
                      onChange={(e) => setWarnTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Payment Deadline Date
                    </label>
                    <input
                      type="date"
                      value={warnDeadline}
                      onChange={(e) => setWarnDeadline(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Message / Notice Details
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={warnMessage}
                      onChange={(e) => setWarnMessage(e.target.value)}
                      placeholder="Enter warning instructions for member..."
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={warnSubmitting}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {warnSubmitting ? 'Sending Warning...' : 'Send Warning Ticket'}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}
      {/* Receipt Image Modal */}
      {selectedReceiptImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-lg w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" /> Bazaar Receipt Voucher
              </h4>
              <button
                onClick={() => setSelectedReceiptImage(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-xl bg-black flex items-center justify-center p-2">
              <img
                src={selectedReceiptImage}
                alt="Receipt Voucher"
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
