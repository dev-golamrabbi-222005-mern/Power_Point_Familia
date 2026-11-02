import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/src/lib/auth';
import { getDb, ensureDbInit } from '@/src/lib/db';
import { getDhakaTime } from '@/src/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const { error, user } = authenticate(req);
    if (error) return error;

    await ensureDbInit();
    const db = getDb();
    if (!db.dailyMeals) db.dailyMeals = [];

    const userId = user!.id;
    const { today } = getDhakaTime();
    const currentMonth = today.slice(0, 7);
    const isMonthMealOff = Boolean(db.settings.closedMealMonths?.includes(currentMonth));

    // Active approved members
    const eligibleMembers = db.users.filter(
      (u) => u.status === 'approved' && ['member', 'manager', 'admin'].includes(u.role)
    );

    // 1. Calculate All Mess Meals and User's Meals for the current month
    // Priority: dailyMeals (locked sessions) + any records with count > 0
    let messTotalMeals = 0;
    let myTotalMeals = 0;

    const currentMonthDays = db.dailyMeals.filter((d) => d.date.startsWith(currentMonth));
    const processedSessionKeys = new Set<string>();

    for (const day of currentMonthDays) {
      if (day.lunch?.isLocked) {
        processedSessionKeys.add(`${day.date}_lunch`);
        messTotalMeals += day.lunch.totalCount || 0;
        if (day.lunch.activeMembers?.some((m) => m.userId === userId)) {
          myTotalMeals += 1;
        }
      }
      if (day.dinner?.isLocked) {
        processedSessionKeys.add(`${day.date}_dinner`);
        messTotalMeals += day.dinner.totalCount || 0;
        if (day.dinner.activeMembers?.some((m) => m.userId === userId)) {
          myTotalMeals += 1;
        }
      }
    }

    // Fallback: If any records exist that weren't captured in dailyMeals locked sessions
    for (const r of db.records) {
      if (r.date.startsWith(currentMonth) && r.count > 0) {
        const key = `${r.date}_${r.mealType}`;
        if (!processedSessionKeys.has(key)) {
          messTotalMeals += r.count;
          if (r.userId === userId) {
            myTotalMeals += r.count;
          }
        }
      }
    }

    // 2. Total month's bazaar expenses for live rate
    const totalBazaarExpenses = db.bazaarExpenses
      .filter((e) => (e.status === 'approved' || e.status === 'pending') && e.date.startsWith(currentMonth))
      .reduce((sum, e) => sum + e.totalCost, 0);

    const baseRate = db.settings?.mealRate || 45;
    const liveMealRate =
      !isMonthMealOff && messTotalMeals > 0 && totalBazaarExpenses > 0
        ? Math.round((totalBazaarExpenses / messTotalMeals) * 100) / 100
        : 0;

    // 3. Today's meals (Lunch and Dinner)
    const todayDaily = db.dailyMeals.find((d) => d.date === today);

    // Today Lunch
    let todayMyLunch = 0;
    let todayMessLunch = 0;
    if (todayDaily?.lunch?.isLocked) {
      todayMessLunch = todayDaily.lunch.totalCount;
      todayMyLunch = todayDaily.lunch.activeMembers?.some((m) => m.userId === userId) ? 1 : 0;
    } else {
      // Live preview before lock
      const lunchOffRec = db.records.find(
        (r) => r.userId === userId && r.date === today && r.mealType === 'lunch' && (r.count === 0 || r.requestStatus === 'accepted')
      );
      todayMyLunch = lunchOffRec ? 0 : 1;
      todayMessLunch = eligibleMembers.filter((m) => {
        const off = db.records.find(
          (r) => r.userId === m.id && r.date === today && r.mealType === 'lunch' && (r.count === 0 || r.requestStatus === 'accepted')
        );
        return !off;
      }).length;
    }

    // Today Dinner
    let todayMyDinner = 0;
    let todayMessDinner = 0;
    if (todayDaily?.dinner?.isLocked) {
      todayMessDinner = todayDaily.dinner.totalCount;
      todayMyDinner = todayDaily.dinner.activeMembers?.some((m) => m.userId === userId) ? 1 : 0;
    } else {
      // Live preview before lock
      const dinnerOffRec = db.records.find(
        (r) => r.userId === userId && r.date === today && r.mealType === 'dinner' && (r.count === 0 || r.requestStatus === 'accepted')
      );
      todayMyDinner = dinnerOffRec ? 0 : 1;
      todayMessDinner = eligibleMembers.filter((m) => {
        const off = db.records.find(
          (r) => r.userId === m.id && r.date === today && r.mealType === 'dinner' && (r.count === 0 || r.requestStatus === 'accepted')
        );
        return !off;
      }).length;
    }

    const todayMyMeals = todayMyLunch + todayMyDinner;
    const todayMessMeals = todayMessLunch + todayMessDinner;

    return NextResponse.json({
      myTotalMeals: isMonthMealOff ? 0 : myTotalMeals,
      todayMyMeals,
      todayMyLunch,
      todayMyDinner,
      messTotalMeals: isMonthMealOff ? 0 : messTotalMeals,
      todayMessMeals,
      todayMessLunch,
      todayMessDinner,
      liveMealRate,
      baseRate,
      hasActiveCalculation: messTotalMeals > 0 && totalBazaarExpenses > 0,
      today,
      todayDailyMeal: todayDaily || null,
      isMonthMealOff,
    });
  } catch (error) {
    console.error('Member overview fetch error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
