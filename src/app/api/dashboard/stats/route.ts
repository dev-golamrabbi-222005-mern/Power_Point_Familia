import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/src/lib/auth';
import { getDb, ensureDbInit } from '@/src/lib/db';
import { FixedUtilityType } from '@/src/types';

function getCurrentWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d.toISOString().split('T')[0];
}

export async function GET(req: NextRequest) {
  try {
    const { error, user } = authenticate(req);
    if (error) return error;

    await ensureDbInit();
    const db = getDb();
    const userId = user!.id;
    const userRole = user!.role;
    const baseRate = db.settings?.mealRate || 45;
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    const isMonthMealOff = Boolean(db.settings.closedMealMonths?.includes(currentMonth));

    // Helper to determine if a deposit is for fixed costs vs meal cash
    const isFixedCostDeposit = (d: any) =>
      d.type === 'fixed_cost' ||
      Boolean(d.utilityType) ||
      /rent|vara|electricity|current|wifi|gas|servant|fixed/i.test(d.remarks || '');

    // Earliest bazaar in current month — meal countdown only begins once first bazaar is held!
    const currentMonthBazaars = db.bazaarExpenses.filter(
      e => e.date.startsWith(currentMonth) && e.status === 'approved'
    );
    const firstBazaarDate = currentMonthBazaars.length > 0
      ? currentMonthBazaars.map(e => e.date).sort()[0]
      : null;

    // Helper to calculate total locked meals in currentMonth for any user (or all users)
    const computeMonthMeals = (targetUserId?: string) => {
      let count = 0;
      const currentMonthDays = (db.dailyMeals || []).filter((d) => d.date.startsWith(currentMonth));
      const processedSessionKeys = new Set<string>();

      for (const day of currentMonthDays) {
        if (day.lunch?.isLocked) {
          processedSessionKeys.add(`${day.date}_lunch`);
          if (targetUserId) {
            if (day.lunch.activeMembers?.some((m) => m.userId === targetUserId)) count += 1;
          } else {
            count += day.lunch.totalCount || 0;
          }
        }
        if (day.dinner?.isLocked) {
          processedSessionKeys.add(`${day.date}_dinner`);
          if (targetUserId) {
            if (day.dinner.activeMembers?.some((m) => m.userId === targetUserId)) count += 1;
          } else {
            count += day.dinner.totalCount || 0;
          }
        }
      }

      for (const r of db.records) {
        if (r.date.startsWith(currentMonth) && r.count > 0) {
          const key = `${r.date}_${r.mealType}`;
          if (!processedSessionKeys.has(key)) {
            if (targetUserId) {
              if (r.userId === targetUserId) count += r.count;
            } else {
              count += r.count;
            }
          }
        }
      }

      return count;
    };

    const allMealsCount = isMonthMealOff ? 0 : computeMonthMeals();
    const totalBazaarExpenses = db.bazaarExpenses
      .filter(e => e.status === 'approved' && e.date.startsWith(currentMonth))
      .reduce((sum, e) => sum + e.totalCost, 0);
      
    const liveMealRate = (!isMonthMealOff && allMealsCount > 0 && totalBazaarExpenses > 0)
      ? Math.round((totalBazaarExpenses / allMealsCount) * 100) / 100
      : 0;
    const calculationRate = liveMealRate > 0 ? liveMealRate : baseRate;

    // A: Calculate Member statistics (approved meal cash deposits, consumed/booked meals, carry forward)
    const dbUser = db.users.find(u => u.id === userId);
    const carryForward = dbUser?.previousMonthCarryForward || 0;

    // Filter user meal cash deposits strictly excluding fixed costs
    const userDeposits = db.deposits.filter(d => d.userId === userId && !isFixedCostDeposit(d));
    const totalDeposits = isMonthMealOff ? 0 : userDeposits
      .filter(d => d.status === 'approved' && d.date.startsWith(currentMonth))
      .reduce((sum, d) => sum + d.amount, 0);
    
    const pendingDeposits = isMonthMealOff ? 0 : userDeposits
      .filter(d => d.status === 'pending' && d.date.startsWith(currentMonth))
      .reduce((sum, d) => sum + d.amount, 0);

    const totalMealsCount = isMonthMealOff ? 0 : computeMonthMeals(userId);
    const totalMealCost = Math.round(totalMealsCount * liveMealRate * 100) / 100;
    const totalBalance = Math.round((carryForward + totalDeposits - totalMealCost) * 100) / 100;

    // Get current week's payment status
    const currentWeek = getCurrentWeekStart();
    const weeklyPaymentStatus = db.weeklyPayments.find(
      w => w.userId === userId && w.weekStart === currentWeek
    ) || null;

    // Calculate utility bill data (shared bills / member count)
    const activeMembers = db.users.filter(
      u => u.role === 'member' && u.status === 'approved'
    );
    const memberCount = Math.max(activeMembers.length, 1);
    
    const currentBills = db.sharedBills.filter(b => b.month === currentMonth);
    
    // Calculate share and paid amounts for each bill type
    const calcUtility = (type: FixedUtilityType) => {
      const bill = currentBills.find(b => b.type === type);
      let share = bill ? Math.round(bill.totalAmount / memberCount) : 0;

      // If user has custom fixed costs assigned
      if (dbUser?.fixedCosts) {
        if (type === 'rent' && dbUser.fixedCosts.rent !== undefined) share = dbUser.fixedCosts.rent;
        if (type === 'electricity' && dbUser.fixedCosts.electricity !== undefined) share = dbUser.fixedCosts.electricity;
        if (type === 'wifi' && dbUser.fixedCosts.wifi !== undefined) share = dbUser.fixedCosts.wifi;
        if (type === 'gas' && dbUser.fixedCosts.gas !== undefined) share = dbUser.fixedCosts.gas;
        if (type === 'servant_fee' && dbUser.fixedCosts.servant !== undefined) share = dbUser.fixedCosts.servant;
      }

      // During Meal-Off month, Servant fee, WiFi, and Gas are 0 / excluded!
      if (isMonthMealOff && (type === 'servant_fee' || type === 'wifi')) {
        share = 0;
      }

      const paid = db.memberBillPayments
        .filter(p => p.userId === userId && p.month === currentMonth && p.type === type)
        .reduce((sum, p) => sum + p.amount, 0);
      return { share, paid, percentage: share > 0 ? Math.min(Math.round((paid / share) * 100), 100) : 0 };
    };

    const rent = calcUtility('rent');
    const electricity = calcUtility('electricity');
    const wifi = calcUtility('wifi');
    const servantFee = calcUtility('servant_fee');
    
    const totalShare = rent.share + electricity.share + wifi.share + servantFee.share;
    const totalPaid = rent.paid + electricity.paid + wifi.paid + servantFee.paid;

    const stats: any = {
      userStats: {
        totalBalance,
        totalDeposits,
        totalMealsCount,
        totalMealCost,
        pendingDeposits,
        liveMealRate,
        previousMonthCarryForward: carryForward,
        weeklyPaymentStatus,
        isMonthMealOff,
        firstBazaarDate,
        utilities: {
          rent,
          electricity,
          wifi,
          servantFee,
          totalShare,
          totalPaid,
          overallPercentage: totalShare > 0 ? Math.min(Math.round((totalPaid / totalShare) * 100), 100) : 0,
        },
      }
    };

    // B: Calculate System-wide Manager/Admin aggregates if role fits
    if (userRole === 'manager' || userRole === 'admin') {
      // Only meal cash deposits for manager meal cash KPI
      const allApprovedDeposits = db.deposits
        .filter(d => d.status === 'approved' && !isFixedCostDeposit(d) && d.date.startsWith(currentMonth))
        .reduce((sum, d) => sum + d.amount, 0);

      const allPendingDepositsCount = db.deposits.filter(d => d.status === 'pending').length;
      
      const allMealCost = Math.round(allMealsCount * liveMealRate * 100) / 100;
      const totalSystemBalance = Math.round((allApprovedDeposits - allMealCost) * 100) / 100;

      const membersCount = db.users.filter(u => u.role === 'member' && u.status === 'approved').length;
      const activeMenuCount = db.menus.length;

      // Cash in hand = Sum of all approved member meal deposits - Sum of all approved bazaar expenses
      const totalCashInHand = allApprovedDeposits - totalBazaarExpenses;
      const pendingBazaarCount = db.bazaarExpenses.filter(e => e.status === 'pending').length;

      // Calculate deficit members (balance < 0)
      const deficitMembers = db.users
        .filter(u => u.role === 'member' && u.status === 'approved')
        .map(u => {
          const uCarryForward = u.previousMonthCarryForward || 0;
          const memberDeposits = db.deposits
            .filter(d => d.userId === u.id && d.status === 'approved' && !isFixedCostDeposit(d) && d.date.startsWith(currentMonth))
            .reduce((sum, d) => sum + d.amount, 0);
          const memberMeals = computeMonthMeals(u.id);
          const memberCost = Math.round(memberMeals * liveMealRate * 100) / 100;
          const balance = Math.round((uCarryForward + memberDeposits - memberCost) * 100) / 100;
          return { userId: u.id, name: u.name, balance };
        })
        .filter(m => m.balance < 0);

      // Bazaar rotation data
      const approvedMembers = db.users
        .filter(u => u.role === 'member' && u.status === 'approved')
        .sort((a, b) => (a.bazaarCount || 0) - (b.bazaarCount || 0));

      const weekStart = getCurrentWeekStart();
      const weekEnd = getWeekEnd(weekStart);
      const weekBazaarCount = db.bazaarAssignments.filter(
        a => a.date >= weekStart && a.date <= weekEnd
      ).length;

      const pendingResetRequest = (db.monthlySummaries || []).find(s => s.status === 'pending_approval') || null;

      stats.managerStats = {
        totalSystemBalance,
        totalSystemDeposits: allApprovedDeposits,
        totalSystemMealsCount: allMealsCount,
        totalSystemMealCost: allMealCost,
        liveMealRate,
        totalCashInHand,
        pendingDepositsCount: allPendingDepositsCount,
        membersCount,
        activeMenuCount,
        totalBazaarExpenses,
        pendingBazaarCount,
        deficitMembers,
        pendingResetRequest,
        autoBookEnabled: db.settings.autoBookMeals ?? true,
        currentMonthFixedCost: currentBills.reduce((sum, bill) => sum + bill.totalAmount, 0),
        currentMonthFixedCostShare: totalShare,
        currentMonthMealCashAdded: db.deposits
          .filter(d => d.status === 'approved' && !d.remarks?.includes('Fixed Expense') && d.date && d.date.startsWith(currentMonth))
          .reduce((sum, d) => sum + (d.amount || 0), 0),
        financeVisibilityUntil: db.settings.financeVisibilityUntil,
        bazaarRotationOrder: approvedMembers.map(m => ({
          userId: m.id,
          name: m.name,
          bazaarCount: m.bazaarCount || 0,
        })),
        weekBazaarCount,
      };
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Stats fetch error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
