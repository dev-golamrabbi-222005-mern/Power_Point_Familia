"use client";

import React, { useState } from "react";
import {
  Home,
  Zap,
  Wifi,
  Flame,
  Users,
  CreditCard,
  CheckCircle2,
  Clock,
  Lock,
  ArrowRight,
  Receipt,
  Sparkles,
  Plus,
  X,
  ShieldCheck,
} from "lucide-react";
import { SharedBill, MemberBillPayment, FixedUtilityType } from "@/src/types";
import { showSuccessAlert, showErrorAlert } from "@/src/lib/alerts";

interface UtilityConfigItem {
  type: FixedUtilityType;
  label: string;
  defaultTarget: number;
  icon: React.ElementType;
  gradient: string;
  accentColor: string;
}

const UTILITY_CONFIGS: UtilityConfigItem[] = [
  {
    type: "rent",
    label: "House Rent",
    defaultTarget: 19000,
    icon: Home,
    gradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
    accentColor: "text-emerald-400",
  },
  {
    type: "electricity",
    label: "Current Bill",
    defaultTarget: 3800,
    icon: Zap,
    gradient: "from-amber-500/10 via-orange-500/5 to-transparent",
    accentColor: "text-amber-400",
  },
  {
    type: "wifi",
    label: "WiFi Bill",
    defaultTarget: 650,
    icon: Wifi,
    gradient: "from-blue-500/10 via-indigo-500/5 to-transparent",
    accentColor: "text-blue-400",
  },
  {
    type: "gas",
    label: "Gas Bill",
    defaultTarget: 2060,
    icon: Flame,
    gradient: "from-orange-500/10 via-red-500/5 to-transparent",
    accentColor: "text-orange-400",
  },
  {
    type: "servant_fee",
    label: "Servant Fee",
    defaultTarget: 4000,
    icon: Users,
    gradient: "from-purple-500/10 via-pink-500/5 to-transparent",
    accentColor: "text-purple-400",
  },
];

interface FixedUtilitiesPoolCardProps {
  sharedBills: SharedBill[];
  billPayments: MemberBillPayment[];
  approvedDeposits: any[];
  currentMonth: string;
  fixedTargets?: {
    rent?: number;
    electricity?: number;
    wifi?: number;
    gas?: number;
    servant?: number;
  };
  pendingChangeRequests: any[];
  token?: string;
  onRefresh?: () => void;
  onOpenPayModal: (
    bill: { type: string; label: string; totalAmount: number; month: string },
    collected: number
  ) => void;
}

export function FixedUtilitiesPoolCard({
  sharedBills,
  billPayments,
  approvedDeposits,
  currentMonth,
  fixedTargets,
  pendingChangeRequests,
  token,
  onRefresh,
  onOpenPayModal,
}: FixedUtilitiesPoolCardProps) {
  // Modal for Proposing an Extra Utility
  const [isProposeModalOpen, setIsProposeModalOpen] = useState(false);
  const [proposeTitle, setProposeTitle] = useState("");
  const [proposeAmount, setProposeAmount] = useState("");
  const [proposeReason, setProposeReason] = useState("");
  const [submittingProposal, setSubmittingProposal] = useState(false);

  // 1. Calculate stats for the 5 core utilities
  const coreItems = UTILITY_CONFIGS.map((cfg) => {
    const matchedBill = sharedBills.find(
      (b) => b.month === currentMonth && b.type === cfg.type
    );
    let target = cfg.defaultTarget;
    if (fixedTargets) {
      if (cfg.type === "rent" && fixedTargets.rent) target = fixedTargets.rent;
      if (cfg.type === "electricity" && fixedTargets.electricity)
        target = fixedTargets.electricity;
      if (cfg.type === "wifi" && fixedTargets.wifi) target = fixedTargets.wifi;
      if (cfg.type === "gas" && fixedTargets.gas) target = fixedTargets.gas;
      if (cfg.type === "servant_fee" && fixedTargets.servant)
        target = fixedTargets.servant;
    }
    if (matchedBill?.totalAmount) {
      target = matchedBill.totalAmount;
    }

    const fromBillPayments = billPayments
      .filter(
        (p) =>
          p.month === currentMonth &&
          (p.type === cfg.type ||
            (cfg.type === "servant_fee" && (p.type as any) === "servant"))
      )
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const fromDeposits = approvedDeposits
      .filter(
        (d) =>
          d.status === "approved" &&
          d.date?.startsWith(currentMonth) &&
          (d.utilityType === cfg.type ||
            (cfg.type === "servant_fee" && d.utilityType === "servant") ||
            (d.type === "fixed_cost" &&
              (d.remarks || "")
                .toLowerCase()
                .includes(cfg.type.replace("_fee", ""))))
      )
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    const collected = Math.max(fromBillPayments, fromDeposits);
    const isPaid = matchedBill?.paidStatus === "paid";
    const isPendingApproval =
      matchedBill?.paidStatus === "pending_approval" ||
      pendingChangeRequests.some(
        (r) =>
          r.type === "pay_fixed_bill" &&
          r.status === "pending" &&
          (r.newValue?.billType === cfg.type ||
            (cfg.type === "servant_fee" && r.newValue?.billType === "servant"))
      );

    const remaining = Math.max(0, target - collected);
    const percent = target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 100;
    const isReadyToPay = !isPaid && !isPendingApproval && collected >= target;

    return {
      ...cfg,
      target,
      collected,
      remaining,
      percent,
      isPaid,
      isPendingApproval,
      isReadyToPay,
      isCustom: false,
      matchedBill,
    };
  });

  // 2. Extra/Custom Utilities approved by Admin for this month
  const customBills = sharedBills.filter(
    (b) =>
      b.month === currentMonth &&
      !["rent", "electricity", "wifi", "gas", "servant_fee"].includes(b.type)
  );

  const customItems = customBills.map((cb) => {
    const target = cb.totalAmount || 0;
    const label = cb.label || "Extra Utility";

    const fromBillPayments = billPayments
      .filter(
        (p) =>
          p.month === currentMonth &&
          (p.type === cb.type ||
            (p.type === "extra" &&
              ((p as any).remarks || "").toLowerCase().includes(label.toLowerCase())))
      )
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const fromDeposits = approvedDeposits
      .filter(
        (d) =>
          d.status === "approved" &&
          d.date?.startsWith(currentMonth) &&
          (d.utilityType === cb.type ||
            (d.remarks || "").toLowerCase().includes(label.toLowerCase()) ||
            ((d.utilityType === "extra_cost" || d.type === "fixed_cost") &&
              (d.remarks || "").toLowerCase().includes(label.toLowerCase())))
      )
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    const collected = Math.max(fromBillPayments, fromDeposits);
    const isPaid = cb.paidStatus === "paid";
    const isPendingApproval =
      cb.paidStatus === "pending_approval" ||
      pendingChangeRequests.some(
        (r) =>
          r.type === "pay_fixed_bill" &&
          r.status === "pending" &&
          r.newValue?.billType === cb.type
      );

    const remaining = Math.max(0, target - collected);
    const percent = target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 100;
    const isReadyToPay = !isPaid && !isPendingApproval && collected >= target;

    return {
      type: cb.type,
      label,
      defaultTarget: target,
      target,
      collected,
      remaining,
      percent,
      isPaid,
      isPendingApproval,
      isReadyToPay,
      isCustom: true,
      icon: Sparkles,
      gradient: "from-purple-500/10 via-fuchsia-500/5 to-transparent",
      accentColor: "text-purple-400",
      matchedBill: cb,
    };
  });

  const allItems = [...coreItems, ...customItems];

  const totalFixedBudget = allItems.reduce((sum, i) => sum + i.target, 0);
  const totalFixedCollected = allItems.reduce((sum, i) => sum + i.collected, 0);
  const totalFixedDisbursed = allItems
    .filter((i) => i.isPaid)
    .reduce((sum, i) => sum + i.target, 0);

  // Pending custom utility proposals awaiting Admin review
  const pendingCustomProposals = pendingChangeRequests.filter(
    (r) =>
      r.type === "add_custom_utility" &&
      r.status === "pending" &&
      (!r.newValue?.month || r.newValue?.month === currentMonth)
  );

  const handleProposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposeTitle.trim() || !proposeAmount) return;
    try {
      setSubmittingProposal(true);
      const res = await fetch("/api/admin/change-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: "add_custom_utility",
          targetUserId: "mess_utility",
          targetUserName: `Extra Utility: ${proposeTitle.trim()}`,
          details: `Manager proposed adding new utility cost: ${proposeTitle.trim()} with target ৳${Number(
            proposeAmount
          ).toLocaleString()} (${currentMonth})`,
          newValue: {
            label: proposeTitle.trim(),
            amount: Number(proposeAmount),
            month: currentMonth,
            reason: proposeReason.trim(),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit proposal");

      setIsProposeModalOpen(false);
      setProposeTitle("");
      setProposeAmount("");
      setProposeReason("");
      await showSuccessAlert(
        "Proposal Submitted!",
        "Your proposal for this extra utility has been sent to Admin for approval."
      );
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showErrorAlert("Error", err.message || "Failed to submit proposal");
    } finally {
      setSubmittingProposal(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 md:p-6 shadow-sm space-y-6">
      {/* Top Header & Overview Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <Receipt className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                Fixed Costs Collection & Settlement Hub
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Month:{" "}
                <strong className="text-zinc-700 dark:text-zinc-200">
                  {currentMonth}
                </strong>{" "}
                • Track individual utility funds raised from members and request disbursal once 100% full.
              </p>
            </div>
          </div>
        </div>

        {/* Global Mini Stats & Propose Extra Cost Button */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-left">
            <p className="text-[10px] text-zinc-400 font-bold uppercase">
              Total Budget
            </p>
            <p className="text-sm font-black text-zinc-900 dark:text-white">
              ৳{totalFixedBudget.toLocaleString()}
            </p>
          </div>
          <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-left">
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">
              Total Collected
            </p>
            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              ৳{totalFixedCollected.toLocaleString()}
            </p>
          </div>
          <div className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-left">
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase">
              Total Disbursed
            </p>
            <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">
              ৳{totalFixedDisbursed.toLocaleString()}
            </p>
          </div>

          {/* Add Extra Utility Cost Button */}
          {token && (
            <button
              onClick={() => setIsProposeModalOpen(true)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              title="Propose an Extra Utility / Cost with Admin Approval"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Propose Extra Utility</span>
            </button>
          )}
        </div>
      </div>

      {/* Pending Custom Proposals Banner */}
      {pendingCustomProposals.length > 0 && (
        <div className="space-y-2">
          {pendingCustomProposals.map((req) => (
            <div
              key={req.id}
              className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">
                    Pending Extra Utility Proposal:{" "}
                    <span className="text-purple-600 dark:text-purple-300 font-extrabold">
                      {req.newValue?.label || "Custom Utility"}
                    </span>{" "}
                    (৳{Number(req.newValue?.amount || 0).toLocaleString()})
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Awaiting Admin review and approval before becoming active in this pool.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-purple-500/20 text-purple-600 dark:text-purple-300 font-extrabold text-[10px] rounded uppercase">
                In Review
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Grid of All Utilities (Core 5 + Approved Extra Utilities) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allItems.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.type}
              className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between space-y-3 bg-gradient-to-br ${
                item.gradient
              } ${
                item.isPaid
                  ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20"
                  : item.isReadyToPay
                  ? "border-emerald-400 dark:border-emerald-500/60 ring-2 ring-emerald-500/20"
                  : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40"
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 ${item.accentColor}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <span>{item.label}</span>
                        {item.isCustom && (
                          <span className="px-1.5 py-0.2 bg-purple-500/15 text-purple-600 dark:text-purple-300 text-[9px] font-extrabold rounded">
                            Extra Cost
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-medium">
                        Target: ৳{item.target.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {item.isPaid ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold rounded-md border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Paid
                      </span>
                    ) : item.isPendingApproval ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold rounded-md border border-amber-500/20 animate-pulse">
                        <Clock className="w-3 h-3" /> In Review
                      </span>
                    ) : item.isReadyToPay ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-500 text-[10px] font-black rounded-md border border-emerald-500/30">
                        <Sparkles className="w-3 h-3" /> Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold rounded-md">
                        <Lock className="w-3 h-3" /> Collecting
                      </span>
                    )}
                  </div>
                </div>

                {/* Target & Collected Numbers */}
                <div className="flex items-baseline justify-between mt-1">
                  <div>
                    <span className="text-lg font-black text-zinc-900 dark:text-white">
                      ৳{item.collected.toLocaleString()}
                    </span>
                    <span className="text-xs text-zinc-400 font-semibold ml-1">
                      / ৳{item.target.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">
                    {item.percent}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      item.isPaid
                        ? "bg-emerald-500"
                        : item.percent >= 100
                        ? "bg-emerald-400 animate-pulse"
                        : item.percent >= 50
                        ? "bg-indigo-500"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>

                {/* Countdown Note */}
                <div className="mt-2 text-[11px] font-medium">
                  {item.isPaid ? (
                    <p className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      ✓ Disbursed to Landlord/Provider
                    </p>
                  ) : item.isPendingApproval ? (
                    <p className="text-amber-500 font-semibold">
                      ⏳ Admin Approval Pending (Disbursal in review)
                    </p>
                  ) : item.remaining > 0 ? (
                    <p className="text-zinc-500 dark:text-zinc-400 font-mono">
                      <strong className="text-amber-500 font-bold">
                        ৳{item.remaining.toLocaleString()}
                      </strong>{" "}
                      remaining to collect
                    </p>
                  ) : (
                    <p className="text-emerald-500 font-bold">
                      🎉 100% Collected (৳{item.target.toLocaleString()})! Ready to Disburse
                    </p>
                  )}
                </div>
              </div>

              {/* Action Button Footer */}
              <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                {item.isPaid ? (
                  <button
                    disabled
                    className="w-full py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20 flex items-center justify-center gap-1.5 cursor-not-allowed opacity-90"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Paid to Provider (৳{item.target.toLocaleString()})</span>
                  </button>
                ) : item.isPendingApproval ? (
                  <button
                    disabled
                    className="w-full py-2 bg-amber-500/15 text-amber-500 text-xs font-bold rounded-lg border border-amber-500/30 flex items-center justify-center gap-1.5 cursor-not-allowed"
                  >
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Admin Approval Pending...</span>
                  </button>
                ) : item.isReadyToPay ? (
                  <button
                    onClick={() =>
                      onOpenPayModal(
                        {
                          type: item.type,
                          label: item.label,
                          totalAmount: item.target,
                          month: currentMonth,
                        },
                        item.collected
                      )
                    }
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-lg shadow-md hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>
                      Pay {item.label} (৳{item.target.toLocaleString()})
                    </span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-2 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center gap-1.5 cursor-not-allowed opacity-75"
                    title={`Remaining to collect: ৳${item.remaining.toLocaleString()}`}
                  >
                    <Lock className="w-3 h-3 text-zinc-400" />
                    <span>
                      Pay {item.label} (৳{item.remaining.toLocaleString()} left)
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* PROPOSE EXTRA UTILITY MODAL */}
      {isProposeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Propose Extra Utility / Cost
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Month: {currentMonth} • Requires Admin Approval
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProposeModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProposeSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Utility / Cost Title
                </label>
                <input
                  type="text"
                  required
                  value={proposeTitle}
                  onChange={(e) => setProposeTitle(e.target.value)}
                  placeholder="e.g. Water Purifier Filter, Fridge Repair, Deep Cleaning"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Target Amount (৳)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={proposeAmount}
                  onChange={(e) => setProposeAmount(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Purpose / Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={proposeReason}
                  onChange={(e) => setProposeReason(e.target.value)}
                  placeholder="e.g. Replaced water filter cartridges and serviced pump"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white resize-none"
                />
              </div>

              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-300 font-medium">
                🛡️ Once submitted, this proposal will be reviewed by Admin. Upon approval, it will appear as an active utility card in this pool.
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProposeModalOpen(false)}
                  disabled={submittingProposal}
                  className="w-1/3 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProposal}
                  className="w-2/3 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {submittingProposal
                      ? "Submitting Proposal..."
                      : "Submit Proposal to Admin"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
