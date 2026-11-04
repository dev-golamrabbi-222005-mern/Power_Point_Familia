"use client";

import React, { useState, useEffect } from "react";
import { ManagerFixedCostsModal } from "./ManagerFixedCostsModal";
import {
  DollarSign,
  Wallet,
  Receipt,
  AlertCircle,
  Send,
  User,
  CheckCircle2,
  Clock,
  Edit3,
  ShieldCheck,
  X,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { User as UserType, FixedUtilityType } from "@/src/types";
import { showSuccessAlert, showErrorAlert, showWarningAlert } from "@/src/lib/alerts";

interface ManagerFinanceTabProps {
  token: string;
  onNavigateToTickets: (targetUserId?: string) => void;
  onError?: (msg: string) => void;
}

interface MemberFinanceRow {
  userId: string;
  name: string;
  email: string;
  role: string;
  fixedTotalShare: number;
  fixedTotalPaid: number;
  fixedStatus: "paid" | "unpaid" | "partial";
  mealCashDeposited: number;
  mealsEatenCount: number;
  weeklyDueAmount: number;
  isAbsent7Days: boolean;
}

export default function ManagerFinanceTab({
  token,
  onNavigateToTickets,
  onError,
}: ManagerFinanceTabProps) {
  const [loading, setLoading] = useState(true);

  // Financial KPIs
  const [totalMessMealCost, setTotalMessMealCost] = useState(0);
  const [totalRemainingMealCash, setTotalRemainingMealCash] = useState(0);
  const [totalFixedPaymentAmount, setTotalFixedPaymentAmount] = useState(0);
  const [totalPendingDues, setTotalPendingDues] = useState(0);

  // Member Rows
  const [memberRows, setMemberRows] = useState<MemberFinanceRow[]>([]);
  const [rawUsers, setRawUsers] = useState<UserType[]>([]);

  // Edit Member Modal
  const [editingMember, setEditingMember] = useState<UserType | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<"member" | "manager" | "admin">(
    "member",
  );
  const [editStatus, setEditStatus] = useState<
    "approved" | "pending" | "rejected"
  >("approved");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Assign Fixed Costs & Dues Modal State
  const [fixedAssignUser, setFixedAssignUser] = useState<UserType | null>(null);
  const [assignRent, setAssignRent] = useState("");
  const [assignElectricity, setAssignElectricity] = useState("");
  const [assignWifi, setAssignWifi] = useState("");
  const [assignGas, setAssignGas] = useState("");
  const [assignServant, setAssignServant] = useState("");
  const [assignExtraCost, setAssignExtraCost] = useState("");
  const [assignExtraReason, setAssignExtraReason] = useState("");
  const [assignPastDue, setAssignPastDue] = useState("");
  const [assigningFixed, setAssigningFixed] = useState(false);

  const openAssignFixedModal = (usr: UserType) => {
    setFixedAssignUser(usr);
    setAssignRent(usr.fixedCosts?.rent !== undefined && usr.fixedCosts.rent > 0 ? usr.fixedCosts.rent.toString() : "");
    setAssignElectricity(usr.fixedCosts?.electricity !== undefined && usr.fixedCosts.electricity > 0 ? usr.fixedCosts.electricity.toString() : "");
    setAssignWifi(usr.fixedCosts?.wifi !== undefined && usr.fixedCosts.wifi > 0 ? usr.fixedCosts.wifi.toString() : "");
    setAssignGas(usr.fixedCosts?.gas !== undefined && usr.fixedCosts.gas > 0 ? usr.fixedCosts.gas.toString() : "");
    setAssignServant(usr.fixedCosts?.servant !== undefined && usr.fixedCosts.servant > 0 ? usr.fixedCosts.servant.toString() : "");
    setAssignExtraCost(usr.fixedCosts?.extraCost !== undefined && usr.fixedCosts.extraCost > 0 ? usr.fixedCosts.extraCost.toString() : "");
    setAssignExtraReason(usr.fixedCosts?.extraCostReason || "");
    setAssignPastDue(usr.pastMonthDue !== undefined && usr.pastMonthDue > 0 ? usr.pastMonthDue.toString() : "");
  };

  const handleSaveFixedAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixedAssignUser) return;
    try {
      setAssigningFixed(true);
      const res = await fetch("/api/finance/assign-fixed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: fixedAssignUser.id,
          fixedCosts: {
            rent: Number(assignRent || 0),
            electricity: Number(assignElectricity || 0),
            wifi: Number(assignWifi || 0),
            gas: Number(assignGas || 0),
            servant: Number(assignServant || 0),
            extraCost: Number(assignExtraCost || 0),
            extraCostReason: assignExtraReason.trim(),
          },
          pastMonthDue: Number(assignPastDue || 0),
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to assign fixed costs");
      
      setFixedAssignUser(null);
      await showSuccessAlert(
        "Fixed Costs Assigned!",
        data.message || `Fixed costs & dues assigned successfully for ${fixedAssignUser.name}`
      );
      fetchFinanceData();
    } catch (err: any) {
      showErrorAlert("Assignment Error", err.message || "Error assigning fixed costs");
    } finally {
      setAssigningFixed(false);
    }
  };

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const [
        membersRes,
        statsRes,
        recordsRes,
        depositsRes,
        expensesRes,
        billsRes,
        paymentsRes,
      ] = await Promise.all([
        fetch("/api/members", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/dashboard/stats", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/records", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/deposits", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/bazaar/expense", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/utilities", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/utilities/pay", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/settings", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!membersRes.ok) throw new Error("Failed to load members");
      const users: UserType[] = await membersRes.json();
      setRawUsers(users);

      const records: any[] = recordsRes.ok ? await recordsRes.json() : [];
      const deposits: any[] = depositsRes.ok ? await depositsRes.json() : [];
      const expenses: any[] = expensesRes.ok ? await expensesRes.json() : [];
      const utilitiesData = billsRes.ok ? await billsRes.json() : { bills: [] };
      const billPayments: any[] = paymentsRes.ok ? await paymentsRes.json() : [];
      const settingsData = await statsRes.json(); // settings can also be fetched

      const currentMonth = new Date().toISOString().split("T")[0].slice(0, 7);
      const todayObj = new Date();

      const settingsRes = await fetch("/api/settings", { headers: { Authorization: `Bearer ${token}` } });
      const settingsObj = settingsRes.ok ? await settingsRes.json() : {};
      const isMonthMealOff = Boolean(settingsObj?.closedMealMonths?.includes(currentMonth));

      // 1. Mess Meal Cost (Approved Bazaar Expenses)
      const approvedExpenses = expenses.filter(
        (e) => e.status === "approved" && e.date.startsWith(currentMonth),
      );
      const messMealCost = approvedExpenses.reduce(
        (sum, e) => sum + e.totalCost,
        0,
      );
      setTotalMessMealCost(messMealCost);

      // 2. Meal Cash Deposited
      const approvedDeposits = deposits.filter(
        (d) => d.status === "approved" && d.date.startsWith(currentMonth),
      );
      const totalMealCashCollected = approvedDeposits
        .filter((d) => d.type !== "fixed_cost" && !d.remarks?.toLowerCase().includes("fixed"))
        .reduce((sum, d) => sum + d.amount, 0);
      setTotalRemainingMealCash(totalMealCashCollected - messMealCost);

      // 3. Fixed Payments
      const sharedBills: any[] = utilitiesData.bills || [];
      const totalFixedMessCost = sharedBills
        .filter((b) => b.month === currentMonth)
        .reduce((sum, b) => sum + b.totalAmount, 0);
      setTotalFixedPaymentAmount(totalFixedMessCost);

      // Member Count
      const memberCount = Math.max(
        users.filter((u) => u.status === "approved").length,
        1,
      );

      // Construct Member Rows
      let accumPendingDues = 0;

      const rows: MemberFinanceRow[] = users.map((member) => {
        // Fixed costs share & paid
        let assignedTotal: number | undefined = undefined;
        if (member.fixedCosts) {
          if (isMonthMealOff) {
            // During Meal-Off month: Only Rent and Electricity apply! WiFi, Gas, Servant are 0!
            assignedTotal = Number(member.fixedCosts.rent || 0) + Number(member.fixedCosts.electricity || 0);
          } else if (typeof member.fixedCosts.customFixedTotal === 'number' && member.fixedCosts.customFixedTotal > 0) {
            assignedTotal = member.fixedCosts.customFixedTotal;
          } else {
            const sumIndividual =
              Number(member.fixedCosts.rent || 0) +
              Number(member.fixedCosts.electricity || 0) +
              Number(member.fixedCosts.wifi || 0) +
              Number(member.fixedCosts.gas || 0) +
              Number(member.fixedCosts.servant || 0) +
              Number(member.fixedCosts.extraCost || 0);
            if (sumIndividual > 0) assignedTotal = sumIndividual;
          }
        }

        const fixedShare = assignedTotal !== undefined
          ? assignedTotal
          : Math.round(totalFixedMessCost / memberCount);

        const isFixedDeposit = (d: any) =>
          d.type === "fixed_cost" ||
          Boolean(d.utilityType) ||
          /rent|vara|electricity|current|wifi|gas|servant|fixed/i.test(d.remarks || "");

        const depositFixedPayments = deposits.filter(
          (d) =>
            d.userId === member.id &&
            d.status === "approved" &&
            isFixedDeposit(d)
        );
        const depositFixedPaid = depositFixedPayments.reduce((sum, d) => sum + (d.amount || 0), 0);

        const billPaymentsPaid = billPayments
          .filter((p) => p.userId === member.id && p.month === currentMonth)
          .reduce((sum, p) => sum + (p.amount || 0), 0);

        const fixedPaid = Math.max(depositFixedPaid, billPaymentsPaid);
        const fixedStatus =
          fixedPaid >= fixedShare && fixedShare > 0
            ? "paid"
            : fixedPaid > 0
              ? "partial"
              : "unpaid";

        // Meal Cash Deposited (strictly excluding fixed costs)
        const memberMealCash = deposits
          .filter(
            (d) =>
              d.userId === member.id &&
              d.status === "approved" &&
              !isFixedDeposit(d),
          )
          .reduce((sum, d) => sum + (d.amount || 0), 0);

        // Meals Eaten
        const memberMeals = records
          .filter(
            (r) => r.userId === member.id && r.date.startsWith(currentMonth),
          )
          .reduce((sum, r) => sum + (r.count || 0), 0);

        // 7-Day Absence Rule Check
        // Check past 7 days records for this user
        const past7Days: string[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(todayObj.getDate() - i);
          past7Days.push(d.toISOString().split("T")[0]);
        }

        const mealsPast7Days = records
          .filter((r) => r.userId === member.id && past7Days.includes(r.date))
          .reduce((sum, r) => sum + (r.count || 0), 0);

        const isAbsent7Days = mealsPast7Days === 0;

        // Weekly Due Calculation
        const currentDay = todayObj.getDate();
        const weekNum = Math.min(Math.ceil(currentDay / 7), 4);
        const expectedWeeklyCash = weekNum === 1 ? 1000 : weekNum * 500;

        let weeklyDue = 0;
        if (isAbsent7Days) {
          weeklyDue = 0; // Exemption rule!
        } else {
          weeklyDue = Math.max(0, expectedWeeklyCash - memberMealCash);
        }

        const unpaidFixed = Math.max(0, fixedShare - fixedPaid);
        accumPendingDues += unpaidFixed + weeklyDue;

        return {
          userId: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          fixedTotalShare: fixedShare,
          fixedTotalPaid: fixedPaid,
          fixedStatus,
          mealCashDeposited: memberMealCash,
          mealsEatenCount: memberMeals,
          weeklyDueAmount: weeklyDue,
          isAbsent7Days,
        };
      });

      setMemberRows(rows);
      setTotalPendingDues(accumPendingDues);
    } catch (err) {
      console.error("Error fetching manager finance overview", err);
      onError?.("Failed to load financial overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, [token]);

  const openEditModal = (member: UserType) => {
    setEditingMember(member);
    setEditName(member.name);
    setEditPhone(member.phone || "");
    setEditRole(member.role as any);
    setEditStatus(member.status as any);
  };

  const handleSaveMemberEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      setEditSubmitting(true);
      const res = await fetch("/api/admin/change-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId: editingMember.id,
          type: "edit_cost",
          details: `Manager ${editingMember.name} member detail update request`,
          oldValue: {
            name: editingMember.name,
            phone: editingMember.phone,
            status: editingMember.status,
          },
          newValue: { name: editName, phone: editPhone, status: editStatus },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit request");

      showSuccessAlert(
        "Request Submitted",
        data.message ||
          "Waiting for Admin approval for making significant change."
      );
      setEditingMember(null);
      fetchFinanceData();
    } catch (err: any) {
      showErrorAlert("Error", err.message || "Error submitting change request");
    } finally {
      setEditSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-xs text-zinc-400">
            Loading Manager Finance Overview...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* === TOP FINANCIAL KPIS GRID === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Mess Meal Cost */}
        <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-950/30 dark:to-zinc-900 p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Total Mess Meal Cost
            </p>
            <DollarSign className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white">
            ৳{totalMessMealCost}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Approved bazaar spend this month
          </p>
        </div>

        {/* KPI 2: Remaining Meal Cash */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-950/30 dark:to-zinc-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Remaining Meal Cash
            </p>
            <Wallet className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white">
            ৳{totalRemainingMealCash}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            Collected minus bazaar spend
          </p>
        </div>

        {/* KPI 3: Fixed Payment Amount */}
        <div className="bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent dark:from-indigo-950/30 dark:to-zinc-900 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/60 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              Total Fixed Utilities
            </p>
            <Receipt className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white">
            ৳{totalFixedPaymentAmount}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            5 fixed utility bills total
          </p>
        </div>

        {/* KPI 4: Total Pending Dues */}
        <div className="bg-gradient-to-br from-red-500/10 via-rose-500/5 to-transparent dark:from-red-950/30 dark:to-zinc-900 p-4 rounded-xl border border-red-200 dark:border-red-800/60 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
              Total Pending Dues
            </p>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white">
            ৳{totalPendingDues}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1">
            Unpaid fixed + weekly dues
          </p>
        </div>
      </div>

      {/* === DETAILED MEMBERS FINANCIAL LIST TABLE === */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 md:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-500" />
              Members Financial Status & Dues Breakdown
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Detailed list of all members with fixed costs, meal cash given,
              meals eaten & 7-day absence due rule
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg">
            {memberRows.length} Members List
          </span>
        </div>

        {/* Desktop View: Wide Data Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-bold">
                <th className="p-3">Member</th>
                <th className="p-3">Fixed Costs Share</th>
                <th className="p-3">Meal Cash Given</th>
                <th className="p-3">Meals Eaten</th>
                <th className="p-3">Current Week Meal Cash Due</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {memberRows.map((row) => (
                <tr
                  key={row.userId}
                  className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="p-3">
                    <p className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      {row.name}
                      {row.role === "manager" && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded">
                          Manager
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      {row.email}
                    </p>
                  </td>

                  <td className="p-3">
                    <p className="font-bold text-zinc-900 dark:text-white">
                      ৳{row.fixedTotalPaid} / ৳{row.fixedTotalShare}
                    </p>
                    {row.fixedStatus === "paid" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        <Clock className="w-3 h-3" /> Unpaid
                      </span>
                    )}
                  </td>

                  <td className="p-3 font-extrabold text-emerald-600 dark:text-emerald-400">
                    ৳{row.mealCashDeposited}
                  </td>

                  <td className="p-3 font-bold text-zinc-900 dark:text-white">
                    {row.mealsEatenCount} meals
                  </td>

                  <td className="p-3">
                    {row.isAbsent7Days ? (
                      <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] rounded-full border border-emerald-500/20">
                        ৳0 Due (7-Day Absent Exemption)
                      </span>
                    ) : row.weeklyDueAmount > 0 ? (
                      <span className="px-2.5 py-1 bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-[11px] rounded-full border border-red-500/20">
                        ৳{row.weeklyDueAmount} Due
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] rounded-full border border-emerald-500/20">
                        Up-to-date
                      </span>
                    )}
                  </td>

                  <td className="p-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      {/* Assign Fixed Costs Button */}
                      <button
                        onClick={() => {
                          const mObj = rawUsers.find(
                            (u) => u.id === row.userId,
                          );
                          if (mObj) openAssignFixedModal(mObj);
                        }}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                        title="Assign Fixed Costs & Dues"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Assign Costs</span>
                      </button>

                      {/* Send Warning Button */}
                      <button
                        onClick={() => onNavigateToTickets(row.userId)}
                        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                        title="Send Warning Ticket"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Warn</span>
                      </button>

                      {/* Edit Details Button */}
                      <button
                        onClick={() => {
                          const mObj = rawUsers.find(
                            (u) => u.id === row.userId,
                          );
                          if (mObj) openEditModal(mObj);
                        }}
                        className="p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-all cursor-pointer"
                        title="Edit Member Details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View: High-End Responsive Touch Cards */}
        <div className="md:hidden space-y-3">
          {memberRows.map((row) => (
            <div
              key={row.userId}
              className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 space-y-3 shadow-xs"
            >
              {/* Card Header: User Info & Status Badge */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-sm text-zinc-900 dark:text-white">{row.name}</p>
                    {row.role === 'manager' && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-teal-500/20 text-teal-400 rounded">
                        Manager
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{row.email}</p>
                </div>

                {/* Due status pill */}
                <div>
                  {row.isAbsent7Days ? (
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-extrabold rounded-full border border-emerald-500/20 whitespace-nowrap">
                      7-Day Exemption
                    </span>
                  ) : row.weeklyDueAmount > 0 ? (
                    <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-extrabold rounded-full border border-red-500/20 whitespace-nowrap">
                      ৳{row.weeklyDueAmount} Due
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold rounded-full border border-emerald-500/20 whitespace-nowrap">
                      Up-to-date ✓
                    </span>
                  )}
                </div>
              </div>

              {/* 2x2 Mini Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-200/60 dark:border-zinc-700/60">
                <div className="p-2.5 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Fixed Share</p>
                  <p className="text-xs font-bold text-zinc-900 dark:text-white mt-0.5">
                    ৳{row.fixedTotalPaid} / ৳{row.fixedTotalShare}
                  </p>
                  <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold mt-0.5 ${
                    row.fixedStatus === 'paid' ? 'text-emerald-500' : 'text-amber-500'
                  }`}>
                    {row.fixedStatus === 'paid' ? '✓ Paid' : '⏳ Unpaid'}
                  </span>
                </div>

                <div className="p-2.5 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Meal Cash Given</p>
                  <p className="text-xs font-extrabold text-emerald-500 mt-0.5">
                    ৳{row.mealCashDeposited}
                  </p>
                  <p className="text-[9px] text-zinc-400 mt-0.5">
                    Eaten: <span className="font-bold text-zinc-200">{row.mealsEatenCount} meals</span>
                  </p>
                </div>
              </div>

              {/* Card Actions Footer */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
                <button
                  onClick={() => {
                    const mObj = rawUsers.find((u) => u.id === row.userId);
                    if (mObj) openAssignFixedModal(mObj);
                  }}
                  className="py-1.5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
                >
                  <Receipt className="w-3 h-3" />
                  <span>Costs</span>
                </button>

                <button
                  onClick={() => onNavigateToTickets(row.userId)}
                  className="py-1.5 px-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
                >
                  <Send className="w-3 h-3" />
                  <span>Warn</span>
                </button>

                <button
                  onClick={() => {
                    const mObj = rawUsers.find((u) => u.id === row.userId);
                    if (mObj) openEditModal(mObj);
                  }}
                  className="py-1.5 px-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ASSIGN FIXED COSTS & DUES MODAL */}
      <ManagerFixedCostsModal
        user={fixedAssignUser}
        onClose={() => setFixedAssignUser(null)}
        onSubmit={handleSaveFixedAssignment}
        assignRent={assignRent}
        setAssignRent={setAssignRent}
        assignElectricity={assignElectricity}
        setAssignElectricity={setAssignElectricity}
        assignWifi={assignWifi}
        setAssignWifi={setAssignWifi}
        assignGas={assignGas}
        setAssignGas={setAssignGas}
        assignServant={assignServant}
        setAssignServant={setAssignServant}
        assignExtraCost={assignExtraCost}
        setAssignExtraCost={setAssignExtraCost}
        assignExtraReason={assignExtraReason}
        setAssignExtraReason={setAssignExtraReason}
        assignPastDue={assignPastDue}
        setAssignPastDue={setAssignPastDue}
        assigningFixed={assigningFixed}
      />

      {/* EDIT MEMBER DETAILS MODAL */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-500" />
                Edit Member Details ({editingMember.name})
              </h3>
              <button
                onClick={() => setEditingMember(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMemberEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Registration Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e: any) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white"
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400 font-medium">
                ⚠️ Edits made by Manager require Admin approval before taking
                effect.
              </div>

              <button
                type="submit"
                disabled={editSubmitting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {editSubmitting
                  ? "Requesting Approval..."
                  : "Submit Edit Request to Admin"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
