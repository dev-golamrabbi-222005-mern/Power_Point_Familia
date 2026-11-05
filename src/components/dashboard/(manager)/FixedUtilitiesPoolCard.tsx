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
} from "lucide-react";
import { SharedBill, MemberBillPayment, FixedUtilityType } from "@/src/types";

interface UtilityConfigItem {
  type: FixedUtilityType;
  label: string;
  banglaLabel: string;
  defaultTarget: number;
  icon: React.ElementType;
  gradient: string;
  accentColor: string;
}

const UTILITY_CONFIGS: UtilityConfigItem[] = [
  {
    type: "rent",
    label: "House Rent",
    banglaLabel: "বাড়ি ভাড়া",
    defaultTarget: 19000,
    icon: Home,
    gradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
    accentColor: "text-emerald-400",
  },
  {
    type: "electricity",
    label: "Current Bill",
    banglaLabel: "বিদ্যুৎ বিল",
    defaultTarget: 3800,
    icon: Zap,
    gradient: "from-amber-500/10 via-orange-500/5 to-transparent",
    accentColor: "text-amber-400",
  },
  {
    type: "wifi",
    label: "WiFi Bill",
    banglaLabel: "ওয়াইফাই বিল",
    defaultTarget: 650,
    icon: Wifi,
    gradient: "from-blue-500/10 via-indigo-500/5 to-transparent",
    accentColor: "text-blue-400",
  },
  {
    type: "gas",
    label: "Gas Bill",
    banglaLabel: "গ্যাস বিল",
    defaultTarget: 2060,
    icon: Flame,
    gradient: "from-orange-500/10 via-red-500/5 to-transparent",
    accentColor: "text-orange-400",
  },
  {
    type: "servant_fee",
    label: "Servant Fee",
    banglaLabel: "বুয়া বিল",
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
  onOpenPayModal,
}: FixedUtilitiesPoolCardProps) {
  const [selectedFilter, setSelectedFilter] = useState<"all" | "rent">("all");

  // Calculate stats for all 5 utilities
  const items = UTILITY_CONFIGS.map((cfg) => {
    // 1. Target Amount
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

    // 2. Collected Amount from Members
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

    // 3. Status
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
    const percent = Math.min(100, Math.round((collected / target) * 100));
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
      matchedBill,
    };
  });

  const totalFixedBudget = items.reduce((sum, i) => sum + i.target, 0);
  const totalFixedCollected = items.reduce((sum, i) => sum + i.collected, 0);
  const totalFixedDisbursed = items
    .filter((i) => i.isPaid)
    .reduce((sum, i) => sum + i.target, 0);

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
                Fixed Costs Collection & Settlement Hub (ফিক্সড বিল সংগ্রহ ও পরিশোধ)
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Month: <strong className="text-zinc-700 dark:text-zinc-200">{currentMonth}</strong> • Track individual utility funds raised from members and request disbursal once 100% full.
              </p>
            </div>
          </div>
        </div>

        {/* Global Mini Stats */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-left">
            <p className="text-[10px] text-zinc-400 font-bold uppercase">Total Budget</p>
            <p className="text-sm font-black text-zinc-900 dark:text-white">
              ৳{totalFixedBudget.toLocaleString()}
            </p>
          </div>
          <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-left">
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Total Collected</p>
            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              ৳{totalFixedCollected.toLocaleString()}
            </p>
          </div>
          <div className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-left">
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase">Total Disbursed</p>
            <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">
              ৳{totalFixedDisbursed.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Grid of All 5 Utilities */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.type}
              className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between space-y-3 bg-gradient-to-br ${item.gradient} ${
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
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {item.banglaLabel}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-medium">
                        {item.label}
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
                      ✓ বাড়িওয়ালা/প্রোভাইডারকে পরিশোধিত (Disbursed)
                    </p>
                  ) : item.isPendingApproval ? (
                    <p className="text-amber-500 font-semibold">
                      ⏳ অ্যাডমিন অনুমোদনের অপেক্ষায় (Admin will disburse soon)
                    </p>
                  ) : item.remaining > 0 ? (
                    <p className="text-zinc-500 dark:text-zinc-400 font-mono">
                      আর মাত্র <strong className="text-amber-500 font-bold">৳{item.remaining.toLocaleString()}</strong> বাকি আছে
                    </p>
                  ) : (
                    <p className="text-emerald-500 font-bold">
                      🎉 সম্পূর্ণ ৳{item.target.toLocaleString()} সংগৃহীত! এখন পরিশোধ করুন
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
                          label: item.banglaLabel,
                          totalAmount: item.target,
                          month: currentMonth,
                        },
                        item.collected
                      )
                    }
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-lg shadow-md hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay {item.banglaLabel} (৳{item.target.toLocaleString()})</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-2 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center gap-1.5 cursor-not-allowed opacity-75"
                    title={`সংগ্রহ বাকি: ৳${item.remaining.toLocaleString()}`}
                  >
                    <Lock className="w-3 h-3 text-zinc-400" />
                    <span>Pay {item.banglaLabel} (আর ৳{item.remaining.toLocaleString()} বাকি)</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

