"use client";

import React, { useState } from "react";
import { X, CreditCard, Send, ShieldCheck, CheckCircle2 } from "lucide-react";

interface PayFixedBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: {
    type: string;
    label: string;
    totalAmount: number;
    month: string;
  } | null;
  collectedAmount: number;
  onSubmit: (details: {
    paymentMethod: string;
    trxId: string;
    remarks: string;
  }) => Promise<void>;
  submitting: boolean;
}

export function PayFixedBillModal({
  isOpen,
  onClose,
  bill,
  collectedAmount,
  onSubmit,
  submitting,
}: PayFixedBillModalProps) {
  const [paymentMethod, setPaymentMethod] = useState("bKash");
  const [trxId, setTrxId] = useState("");
  const [remarks, setRemarks] = useState("");

  if (!isOpen || !bill) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      paymentMethod,
      trxId: trxId.trim(),
      remarks: remarks.trim(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Pay Bill: {bill.label}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Month: {bill.month}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount Summary Pill */}
        <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Disbursal Amount
            </p>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
              ৳{bill.totalAmount.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Fund Raised (৳{collectedAmount.toLocaleString()})
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white"
            >
              <option value="bKash">bKash</option>
              <option value="Nagad">Nagad</option>
              <option value="Rocket">Rocket</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash Handover">Cash Handover</option>
            </select>
          </div>

          {/* TrxID / Reference */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Transaction ID / Receipt No. (Optional)
            </label>
            <input
              type="text"
              value={trxId}
              onChange={(e) => setTrxId(e.target.value)}
              placeholder="e.g. 9J4K829L or Receipt #104"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Payment Notes / Remarks (Optional)
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Paid to landlord personal bKash number"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white resize-none"
            />
          </div>

          {/* Notice Alert */}
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-400 font-medium flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              This disbursement request will be submitted to Admin for approval. Once approved, the bill is marked as paid and added to the &quot;Total Fixed Utilities Given&quot; KPI.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-1/3 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? "Submitting Request..." : `Submit Payment Request (৳${bill.totalAmount.toLocaleString()})`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

