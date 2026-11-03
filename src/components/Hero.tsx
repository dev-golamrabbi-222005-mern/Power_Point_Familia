import React, { useState, useEffect } from "react";
import { HeroBanner } from "./hero/HeroBanner";
import { HeroBazaarPairBanner } from "./hero/HeroBazaarPairBanner";
import { HeroFeaturesGrid } from "./hero/HeroFeaturesGrid";
import {
  Utensils,
  Shield,
  CheckCircle2,
  TrendingUp,
  Users,
  ArrowRight,
  Sparkles,
  BookOpen,
  ShoppingCart,
  X,
  CalendarDays,
  Receipt,
  Eye,
  Image as ImageIcon,
  Sun,
  Moon,
} from "lucide-react";

import { MealMenu, BazaarAssignment, BazaarExpense } from "../types";

interface HeroProps {
  onLoginClick: () => void;
  onRegisterClick?: () => void;
  menus: MealMenu[];
  mealRate: number;
}

export default function Hero({
  onLoginClick,
  onRegisterClick = onLoginClick,
  menus,
  mealRate,
}: HeroProps) {
  const todayDate = new Date().toISOString().split("T")[0];
  const todayMenus = menus.filter((m) => m.date === todayDate);

  const [bazaarAssignments, setBazaarAssignments] = useState<
    (BazaarAssignment & { userName?: string })[]
  >([]);
  const [bazaarExpenses, setBazaarExpenses] = useState<
    (BazaarExpense & { userName?: string })[]
  >([]);
  const [bazaarPairData, setBazaarPairData] = useState<any>(null);
  const [mealSummary, setMealSummary] = useState<
    { date: string; lunch: number; dinner: number }[]
  >([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    // Fetch public calendar data
    const fetchCalendarData = async () => {
      try {
        const res = await fetch("/api/public/calendar");
        if (res.ok) {
          const data = await res.json();
          setBazaarAssignments(data.assignments || []);
          setBazaarExpenses(data.expenses || []);
          setBazaarPairData(
            data.currentPair
              ? {
                  currentPair: data.currentPair,
                  nextPair: data.nextPair,
                  pairs: data.pairs,
                  currentPairIndex: data.currentPairIndex,
                }
              : null,
          );
          setMealSummary(data.mealSummary || []);
        }
      } catch (e) {
        // Silent fail
      }
    };
    fetchCalendarData();
  }, []);

  // Full Month Calendar helpers
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const monthDates = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });

  // Get full activity info for a specific date
  const getDayInfo = (date: string) => {
    const assignments = bazaarAssignments.filter((a) => a.date === date);
    const expenses = bazaarExpenses.filter((e) => e.date === date);
    const dayMenus = menus.filter((m) => m.date === date);
    const totalSpent = expenses.reduce((s, e) => s + e.totalCost, 0);
    const dayNames = assignments.map((a) => a.userName).filter(Boolean);
    const dayMealSummary = mealSummary.find((m) => m.date === date);
    const hasReceipt = expenses.some((e) => !!e.receiptImage);
    return {
      assignments,
      expenses,
      menus: dayMenus,
      totalSpent,
      assignedTo: dayNames,
      mealCounts: dayMealSummary,
      hasReceipt,
    };
  };

  // Enlarge popup for receipt images
  const [enlargedReceipt, setEnlargedReceipt] = useState<string | null>(null);

  return (
    <div
      id="home-landing"
      className="relative overflow-hidden bg-[#0a0a0a]"
    >
      {/* Decorative background lights */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10" />

      {/* Hero Section Banner */}
      <HeroBanner
        mealRate={mealRate}
        onLoginClick={onLoginClick}
        onRegisterClick={onRegisterClick}
      />

      {/* Current Bazaar Pair */}
      <HeroBazaarPairBanner bazaarPairData={bazaarPairData} />

      {/* Bazaar Calendar Section */}
      <div className="container-custom section-gap">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="section-title flex items-center justify-center gap-3">
            <ShoppingCart className="w-8 h-8 text-emerald-500" />
            Bazaar & Expenses Calendar
          </h2>
          <p className="mt-3 text-zinc-400">
            View upcoming bazaar schedules, expenses, and purchase details at a
            glance. Click on any date to see what was bought and how much was
            spent.
          </p>
        </div>

        {/* Calendar Grid */}
        <div className="bg-[#111111] border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <CalendarDays className="w-5 h-5 text-emerald-500" />
            <h3 className="font-display font-bold text-lg text-zinc-100">
              Activity Calendar
            </h3>
            <span className="ml-auto text-xs text-zinc-500">
              {new Date().toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          <div className="overflow-x-auto -mx-2 px-2 pb-1">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2 min-w-[420px] sm:min-w-0">
              {weekdays.map((day) => (
                <div
                  key={day}
                  className="text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Full Month Grid */}
            <div className="grid grid-cols-7 gap-1 min-w-[420px] sm:min-w-0">
              {/* Empty cells for days before the 1st */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {monthDates.map((date) => {
                const dayNum = new Date(date).getDate();
                const info = getDayInfo(date);
                const isPast =
                  new Date(date) < new Date(new Date().toDateString());
                const isToday = date === new Date().toISOString().split("T")[0];
                const hasActivity =
                  info.assignments.length > 0 ||
                  info.expenses.length > 0 ||
                  info.menus.length > 0 ||
                  (info.mealCounts &&
                    (info.mealCounts.lunch > 0 || info.mealCounts.dinner > 0));

                return (
                  <button
                    key={date}
                    onClick={() =>
                      setSelectedDate(selectedDate === date ? null : date)
                    }
                    className={`relative p-1.5 rounded-lg border text-left transition-all duration-200 min-h-[60px] sm:min-h-[72px] cursor-pointer ${
                      isToday
                        ? "bg-emerald-500/15 border-emerald-500/40 ring-1 ring-emerald-500/20"
                        : isPast && !hasActivity
                          ? "bg-zinc-900/10 border-transparent opacity-30"
                          : "bg-zinc-900/40 border-zinc-800/60 hover:border-emerald-500/30 hover:bg-zinc-900/60"
                    } ${selectedDate === date ? "ring-2 ring-emerald-500/30" : ""} ${!hasActivity ? "pointer-events-none" : ""}`}
                  >
                    <span
                      className={`text-[10px] sm:text-[11px] font-bold ${isToday ? "text-emerald-400" : "text-zinc-400"}`}
                    >
                      {dayNum}
                    </span>
                    <div className="flex flex-col gap-px mt-0.5">
                      {info.assignments.length > 0 && (
                        <span className="text-[6px] sm:text-[7px] text-emerald-400 font-bold leading-tight truncate">
                          🛒 {info.assignments.length}
                        </span>
                      )}
                      {info.totalSpent > 0 && (
                        <span className="text-[6px] sm:text-[7px] text-amber-400 font-bold leading-tight truncate">
                          💰{info.totalSpent}৳{info.hasReceipt && "📎"}
                        </span>
                      )}
                      {info.menus.length > 0 && (
                        <span className="text-[6px] sm:text-[7px] text-teal-400 font-bold leading-tight truncate">
                          🍽️{" "}
                          {info.menus.filter((m) => m.mealType === "lunch")
                            .length > 0
                            ? "L"
                            : ""}
                          {info.menus.filter((m) => m.mealType === "lunch")
                            .length > 0 &&
                          info.menus.filter((m) => m.mealType === "dinner")
                            .length > 0
                            ? "+"
                            : ""}
                          {info.menus.filter((m) => m.mealType === "dinner")
                            .length > 0
                            ? "D"
                            : ""}
                        </span>
                      )}
                      {info.mealCounts &&
                        (info.mealCounts.lunch > 0 ||
                          info.mealCounts.dinner > 0) && (
                          <span className="text-[6px] sm:text-[7px] text-purple-400 font-bold leading-tight truncate">
                            📊{" "}
                            {info.mealCounts.lunch > 0
                              ? info.mealCounts.lunch
                              : ""}
                            {info.mealCounts.lunch > 0 &&
                            info.mealCounts.dinner > 0
                              ? "/"
                              : ""}
                            {info.mealCounts.dinner > 0
                              ? info.mealCounts.dinner
                              : ""}
                          </span>
                        )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Enlarged Receipt Modal */}
      {enlargedReceipt && (
        <div
          className="fixed inset-0 bg-[#0a0a0a]/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
          onClick={() => setEnlargedReceipt(null)}
        >
          <div
            className="relative max-w-2xl w-full max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setEnlargedReceipt(null)}
              className="absolute -top-3 -right-3 p-1.5 bg-zinc-900 border border-zinc-700 rounded-full text-zinc-400 hover:text-zinc-200 transition-colors z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={enlargedReceipt}
              alt="Receipt full size"
              className="w-full h-auto rounded-2xl shadow-2xl border border-zinc-800"
            />
          </div>
        </div>
      )}

      {/* Bazaar Detail Popup */}
      {selectedDate && (
        <div
          className="fixed inset-0 bg-[#0a0a0a]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedDate(null)}
        >
          <div
            className="bg-[#111111] border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800">
              <div>
                <h3 className="font-display font-bold text-lg text-zinc-100">
                  {new Date(selectedDate).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h3>
                <p className="text-xs text-zinc-500">
                  Bazaar & Purchase Details
                </p>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {(() => {
                const info = getDayInfo(selectedDate);
                const hasActivity =
                  info.assignments.length > 0 ||
                  info.expenses.length > 0 ||
                  info.menus.length > 0;

                if (!hasActivity) {
                  return (
                    <div className="text-center py-8">
                      <CalendarDays className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                      <p className="text-zinc-400 font-medium">
                        No activity on this date
                      </p>
                    </div>
                  );
                }

                return (
                  <>
                    {/* Meal Booking Counts */}
                    {info.mealCounts &&
                      (info.mealCounts.lunch > 0 ||
                        info.mealCounts.dinner > 0) && (
                        <div className="p-4 bg-gradient-to-r from-purple-600/10 to-indigo-600/5 border border-purple-500/20 rounded-xl mb-4">
                          <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                            <Utensils className="w-4 h-4" /> Meal Bookings
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800 text-center">
                              <Sun className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                              <p className="text-lg font-black text-zinc-100">
                                {info.mealCounts.lunch}
                              </p>
                              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                                Lunch
                              </p>
                            </div>
                            <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800 text-center">
                              <Moon className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                              <p className="text-lg font-black text-zinc-100">
                                {info.mealCounts.dinner}
                              </p>
                              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                                Dinner
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Today's Menus */}
                    {info.menus.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
                          <Utensils className="w-4 h-4" /> Daily Menus — Lunch &
                          Dinner
                        </h4>
                        {info.menus.map((menu) => (
                          <div
                            key={menu.id}
                            className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span
                                className={`capitalize text-[10px] font-bold px-2 py-0.5 rounded ${menu.mealType === "lunch" ? "bg-emerald-500/20 text-emerald-400" : "bg-teal-500/20 text-teal-400"}`}
                              >
                                {menu.mealType}
                              </span>
                              <span className="text-xs font-semibold text-emerald-400">
                                Est: {menu.estimatedCost}৳
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {menu.items.map((item, i) => (
                                <span
                                  key={i}
                                  className="text-[11px] bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-0.5 rounded-lg"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bazaar Assignments */}
                    {info.assignments.length > 0 && (
                      <div className="space-y-3 mt-4">
                        <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4" /> Bazaar
                          Assignments
                        </h4>
                        {info.assignments.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-bold text-zinc-200 text-sm">
                                Assigned to: {assignment.userName || "Member"}
                              </h5>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  assignment.status === "verified"
                                    ? "bg-emerald-500/15 text-emerald-400"
                                    : assignment.status === "submitted"
                                      ? "bg-amber-500/15 text-amber-400"
                                      : "bg-zinc-800 text-zinc-400"
                                }`}
                              >
                                {assignment.status}
                              </span>
                            </div>
                            {assignment.shoppingList.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {assignment.shoppingList.map((item, i) => (
                                  <span
                                    key={i}
                                    className="text-[11px] bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-0.5 rounded-lg"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            )}
                            {assignment.delegatedFrom && (
                              <p className="text-[10px] text-amber-400 mt-2">
                                🔄 Delegated from original assignee
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Expenses */}
                    {info.expenses.length > 0 && (
                      <div className="space-y-3 mt-4">
                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                          <Receipt className="w-4 h-4" /> Expenses (
                          {info.totalSpent}৳ total)
                        </h4>
                        {info.expenses.map((expense) => (
                          <div
                            key={expense.id}
                            className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-bold text-zinc-200 text-sm">
                                Purchases by: {expense.userName || "Member"}
                              </h5>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-emerald-400">
                                  {expense.totalCost}৳
                                </span>
                                {expense.receiptImage && (
                                  <span
                                    className="text-[10px] bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 border border-blue-500/20"
                                    title="Receipt uploaded"
                                  >
                                    <ImageIcon className="w-3 h-3" /> Receipt
                                  </span>
                                )}
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    expense.status === "approved"
                                      ? "bg-emerald-500/15 text-emerald-400"
                                      : expense.status === "rejected"
                                        ? "bg-red-500/15 text-red-400"
                                        : "bg-amber-500/15 text-amber-400"
                                  }`}
                                >
                                  {expense.status}
                                </span>
                              </div>
                            </div>
                            {/* Itemized expense breakdown */}
                            <div className="space-y-1.5 mb-3">
                              {expense.items.map((item, i) => (
                                <div
                                  key={i}
                                  className="flex justify-between items-center py-1.5 px-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50"
                                >
                                  <span className="text-xs text-zinc-300 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    {item.name}
                                  </span>
                                  <span className="text-xs font-mono font-bold text-zinc-200">
                                    {item.cost}৳
                                  </span>
                                </div>
                              ))}
                            </div>
                            {/* Receipt image */}
                            {expense.receiptImage && (
                              <div className="mt-2 pt-3 border-t border-zinc-800">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                                    <ImageIcon className="w-3.5 h-3.5" />{" "}
                                    Receipt
                                  </span>
                                  <button
                                    onClick={() =>
                                      setEnlargedReceipt(expense.receiptImage!)
                                    }
                                    className="text-[10px] text-blue-400 hover:text-blue-300 font-bold cursor-pointer"
                                  >
                                    View Full Size
                                  </button>
                                </div>
                                <div className="relative">
                                  <img
                                    src={expense.receiptImage}
                                    alt="Purchase receipt"
                                    className="w-full max-h-32 object-contain rounded-lg bg-zinc-900/70 border border-zinc-800 cursor-pointer"
                                    onClick={() =>
                                      setEnlargedReceipt(expense.receiptImage!)
                                    }
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Feature Section */}
      <HeroFeaturesGrid />
    </div>
  );
}
