import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/src/lib/auth';
import { getDb, ensureDbInit } from '@/src/lib/db';

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function getMonthStart(date: Date): string {
  const d = new Date(date);
  d.setDate(1);
  return d.toISOString().split('T')[0];
}

function getDateRange(startDate: string, endDate: string): string[] {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export async function GET(req: NextRequest) {
  try {
    const { error, user } = authenticate(req);
    if (error) return error;

    await ensureDbInit();
    const db = getDb();
    const userId = user!.id;
    const today = new Date();

    const currentMonth = today.toISOString().slice(0, 7);
    const isMonthMealOff = Boolean(db.settings.closedMealMonths?.includes(currentMonth));

    const currentMonthBazaars = db.bazaarExpenses.filter(
      e => e.date.startsWith(currentMonth) && (e.status === 'approved' || e.status === 'pending')
    );
    const firstBazaarDate = currentMonthBazaars.length > 0
      ? currentMonthBazaars.map(e => e.date).sort()[0]
      : null;

    // Calculate LIVE meal rate
    const activeRecords = db.records.filter(r => {
      if (!r.date.startsWith(currentMonth)) return false;
      if (!firstBazaarDate) return false;
      return r.date >= firstBazaarDate;
    });

    const allMealsCount = isMonthMealOff ? 0 : activeRecords.reduce((sum, r) => sum + r.count, 0);
    const totalBazaarExpenses = db.bazaarExpenses
      .filter(e => e.status === 'approved' && e.date.startsWith(currentMonth))
      .reduce((sum, e) => sum + e.totalCost, 0);
    
    const baseRate = db.settings?.mealRate || 45;
    const liveMealRate = (!isMonthMealOff && allMealsCount > 0 && totalBazaarExpenses > 0)
      ? Math.round((totalBazaarExpenses / allMealsCount) * 100) / 100
      : baseRate;

    // Calculate all members count
    const activeMembers = db.users.filter(u => u.role === 'member' && u.status === 'approved');
    const memberCount = Math.max(activeMembers.length, 1);

    // Current month
    const monthStart = getMonthStart(today);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    const monthDates = getDateRange(monthStart, monthEnd);

    // Current week
    const weekStart = getWeekStart(today);
    const weekEnd = new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weekDates = getDateRange(weekStart, weekEnd);

    // === WEEKLY DATA ===
    const weeklyData = weekDates.map(date => {
      // My meal cost
      const myMeals = db.records
        .filter(r => r.userId === userId && r.date === date)
        .reduce((sum, r) => sum + r.count, 0);
      const myMealCost = Math.round(myMeals * liveMealRate * 100) / 100;

      // My living cost share (utilities)
      const myLivingCost = 0; // TODO: Calculate from shared bills if needed

      // Mess meal cost (all members for this day)
      const messMeals = db.records
        .filter(r => r.date === date)
        .reduce((sum, r) => sum + r.count, 0);
      const messMealCost = Math.round(messMeals * liveMealRate * 100) / 100;

      // Mess living cost share
      const messLivingCost = 0; // TODO: Calculate from shared bills if needed

      return {
        date,
        dayLabel: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
        myMealCost,
        myLivingCost,
        myTotalCost: Math.round((myMealCost + myLivingCost) * 100) / 100,
        messMealCost,
        messLivingCost,
        messTotalCost: Math.round((messMealCost + messLivingCost) * 100) / 100,
      };
    });

    // === MONTHLY DATA ===
    const monthlyData = monthDates.map(date => {
      // My meal cost
      const myMeals = db.records
        .filter(r => r.userId === userId && r.date === date)
        .reduce((sum, r) => sum + r.count, 0);
      const myMealCost = Math.round(myMeals * liveMealRate * 100) / 100;

      // Mess meal cost
      const messMeals = db.records
        .filter(r => r.date === date)
        .reduce((sum, r) => sum + r.count, 0);
      const messMealCost = Math.round(messMeals * liveMealRate * 100) / 100;

      return {
        date,
        week: `W${Math.ceil(parseInt(date.split('-')[2]) / 7)}`,
        myMealCost,
        myLivingCost: 0,
        myTotalCost: Math.round((myMealCost + 0) * 100) / 100,
        messMealCost,
        messLivingCost: 0,
        messTotalCost: Math.round((messMealCost + 0) * 100) / 100,
      };
    });

    // Weekly aggregates
    const weeklyAggregates = {
      myMealCost: Math.round(weeklyData.reduce((sum, d) => sum + d.myMealCost, 0) * 100) / 100,
      myLivingCost: Math.round(weeklyData.reduce((sum, d) => sum + d.myLivingCost, 0) * 100) / 100,
      myTotalCost: Math.round(weeklyData.reduce((sum, d) => sum + d.myTotalCost, 0) * 100) / 100,
      messMealCost: Math.round(weeklyData.reduce((sum, d) => sum + d.messMealCost, 0) * 100) / 100,
      messLivingCost: Math.round(weeklyData.reduce((sum, d) => sum + d.messLivingCost, 0) * 100) / 100,
      messTotalCost: Math.round(weeklyData.reduce((sum, d) => sum + d.messTotalCost, 0) * 100) / 100,
    };

    // Monthly aggregates
    const monthlyAggregates = {
      myMealCost: Math.round(monthlyData.reduce((sum, d) => sum + d.myMealCost, 0) * 100) / 100,
      myLivingCost: Math.round(monthlyData.reduce((sum, d) => sum + d.myLivingCost, 0) * 100) / 100,
      myTotalCost: Math.round(monthlyData.reduce((sum, d) => sum + d.myTotalCost, 0) * 100) / 100,
      messMealCost: Math.round(monthlyData.reduce((sum, d) => sum + d.messMealCost, 0) * 100) / 100,
      messLivingCost: Math.round(monthlyData.reduce((sum, d) => sum + d.messLivingCost, 0) * 100) / 100,
      messTotalCost: Math.round(monthlyData.reduce((sum, d) => sum + d.messTotalCost, 0) * 100) / 100,
    };

    return NextResponse.json({
      weekly: {
        data: weeklyData,
        aggregates: weeklyAggregates,
        dateRange: { start: weekStart, end: weekEnd },
      },
      monthly: {
        data: monthlyData,
        aggregates: monthlyAggregates,
        dateRange: { start: monthStart, end: monthEnd },
      },
    });
  } catch (error) {
    console.error('Meal costs breakdown fetch error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
