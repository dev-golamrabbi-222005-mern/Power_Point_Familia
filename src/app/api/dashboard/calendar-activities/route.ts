import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/src/lib/auth';
import { getDb, ensureDbInit } from '@/src/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { error, user } = authenticate(req);
    if (error) return error;

    await ensureDbInit();
    const db = getDb();
    if (!db.dailyMeals) db.dailyMeals = [];

    const userId = user!.id;
    const cleanEmail = user?.email?.toLowerCase().trim();

    // Get unique dates with activities (bazaar, meals, or daily locked sessions)
    const activityDates = new Set<string>();
    
    db.bazaarExpenses.forEach(exp => activityDates.add(exp.date));
    db.bazaarAssignments.forEach(assign => activityDates.add(assign.date));
    db.records.forEach(rec => activityDates.add(rec.date));
    db.dailyMeals.forEach(dm => activityDates.add(dm.date));

    // For each date, aggregate activities
    const activitiesByDate = Array.from(activityDates).reduce((acc, date) => {
      // 1. Bazaar Assignments for this date
      const assignments = db.bazaarAssignments.filter(a => a.date === date);
      const assignmentsData = assignments.map(a => {
        const u1 = db.users.find(u => u.id === a.userId);
        const u2 = db.users.find(u => u.id === a.member2Id);
        return {
          id: a.id,
          userId: a.userId,
          userName: u1 ? u1.name : 'Shopper',
          member2Id: a.member2Id,
          member2Name: u2 ? u2.name : undefined,
          budget: a.budget || a.allocatedCash || 0,
          shoppingList: a.shoppingList || [],
          status: a.status || 'pending',
        };
      });

      // 2. Bazaar expenses for this date (both approved and pending/submitted)
      const bazaarExpenses = db.bazaarExpenses.filter(exp => exp.date === date);

      const bazaarData = bazaarExpenses.map(exp => {
        const userData = db.users.find(u => u.id === exp.userId);
        const itemsInfo = (exp.items || []).map(i => `${i.name} (৳${i.cost})`).join(', ');
        return {
          id: exp.id,
          userId: exp.userId,
          userName: userData?.name || 'Unknown',
          totalCost: exp.totalCost,
          items: itemsInfo,
          itemsList: exp.items || [],
          status: exp.status,
          remarks: exp.remarks,
        };
      });

      // 3. Meal records & Daily Session for this date
      const dayMeal = db.dailyMeals?.find(d => d.date === date);
      const mealRecords = db.records.filter(r => r.date === date);

      let lunchCount = 0;
      let dinnerCount = 0;
      let lunchMenu = '';
      let dinnerMenu = '';
      let isLunchLocked = false;
      let isDinnerLocked = false;
      let myLunch = false;
      let myDinner = false;

      // Lunch
      if (dayMeal?.lunch?.isLocked) {
        lunchCount = dayMeal.lunch.totalCount || 0;
        lunchMenu = dayMeal.lunch.menu || '';
        isLunchLocked = true;
        myLunch = Boolean(dayMeal.lunch.activeMembers?.some(m => m.userId === userId || (cleanEmail && (m as any).userEmail === cleanEmail)));
      } else {
        const lunchRecs = mealRecords.filter(r => r.mealType === 'lunch');
        lunchCount = lunchRecs.reduce((sum, r) => sum + r.count, 0);
        const myRec = lunchRecs.find(r => r.userId === userId || (cleanEmail && r.userId === cleanEmail));
        myLunch = myRec ? myRec.count > 0 : false;
      }

      // Dinner
      if (dayMeal?.dinner?.isLocked) {
        dinnerCount = dayMeal.dinner.totalCount || 0;
        dinnerMenu = dayMeal.dinner.menu || '';
        isDinnerLocked = true;
        myDinner = Boolean(dayMeal.dinner.activeMembers?.some(m => m.userId === userId || (cleanEmail && (m as any).userEmail === cleanEmail)));
      } else {
        const dinnerRecs = mealRecords.filter(r => r.mealType === 'dinner');
        dinnerCount = dinnerRecs.reduce((sum, r) => sum + r.count, 0);
        const myRec = dinnerRecs.find(r => r.userId === userId || (cleanEmail && r.userId === cleanEmail));
        myDinner = myRec ? myRec.count > 0 : false;
      }

      const mealSummary = {
        totalMeals: lunchCount + dinnerCount,
        lunch: lunchCount,
        dinner: dinnerCount,
        lunchMenu,
        dinnerMenu,
        isLunchLocked,
        isDinnerLocked,
        myLunch,
        myDinner,
      };

      acc[date] = {
        date,
        dayName: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }),
        assignments: assignmentsData,
        hasAssignment: assignmentsData.length > 0,
        bazaarCount: bazaarData.length,
        bazaarDetails: bazaarData,
        totalBazaarCost: bazaarData.reduce((sum, b) => sum + b.totalCost, 0),
        mealSummary,
        dailyMealDetail: dayMeal || null,
      };

      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      activitiesByDate,
      datesWithActivity: Array.from(activityDates).sort(),
    });
  } catch (error) {
    console.error('Calendar activities fetch error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
