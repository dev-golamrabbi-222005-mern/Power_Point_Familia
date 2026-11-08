import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/src/lib/auth';
import { getDb, saveDb, ensureDbInit } from '@/src/lib/db';
import { getDhakaTime } from '@/src/lib/utils';
import { DailyMealDay, MealSessionDetail, MealSessionMember, MealSessionOffMember } from '@/src/types';

// Helper to create empty session
function createEmptySession(): MealSessionDetail {
  return {
    menu: '',
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    totalCount: 0,
    activeMembers: [],
    offMembers: [],
  };
}

// GET: Fetch session lock status & live headcount preview for a specific date
export async function GET(req: NextRequest) {
  try {
    const { error, user } = authenticate(req);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const { today } = getDhakaTime();
    const date = searchParams.get('date') || today;

    await ensureDbInit();
    const db = getDb();
    if (!db.dailyMeals) db.dailyMeals = [];

    // Find existing daily meal record or prepare a virtual one
    let dayMeal = db.dailyMeals.find((d) => d.date === date);

    // Eligible mess members (approved members, managers, admins who participate in meals)
    const eligibleMembers = db.users.filter(
      (u) => u.status === 'approved' && ['member', 'manager', 'admin'].includes(u.role)
    );

    // Helper to calculate live preview for a mealType
    const computeSessionPreview = (mealType: 'lunch' | 'dinner', savedSession?: MealSessionDetail) => {
      if (savedSession && savedSession.isLocked) {
        return savedSession;
      }

      // Live calculation if not locked yet
      const active: MealSessionMember[] = [];
      const off: MealSessionOffMember[] = [];

      for (const m of eligibleMembers) {
        const mEmail = m.email?.toLowerCase().trim();
        const rec = db.records.find(
          (r) =>
            ((mEmail && r.userEmail && r.userEmail.toLowerCase().trim() === mEmail) ||
              (mEmail && r.userId && r.userId.toLowerCase().trim() === mEmail) ||
              r.userId === m.id) &&
            r.date === date &&
            r.mealType === mealType
        );

        const isOff = rec && (rec.count === 0 || rec.requestStatus === 'accepted');
        if (isOff) {
          off.push({
            userId: m.id,
            userEmail: mEmail,
            name: m.name || m.email,
            reason: rec.requestReason || 'Manually turned off',
          });
        } else {
          active.push({
            userId: m.id,
            userEmail: mEmail,
            name: m.name || m.email,
            count: 1,
          });
        }
      }

      return {
        menu: savedSession?.menu || '',
        isLocked: false,
        lockedAt: null,
        lockedBy: null,
        totalCount: active.length,
        activeMembers: active,
        offMembers: off,
      };
    };

    const lunchPreview = computeSessionPreview('lunch', dayMeal?.lunch);
    const dinnerPreview = computeSessionPreview('dinner', dayMeal?.dinner);

    return NextResponse.json({
      date,
      lunch: lunchPreview,
      dinner: dinnerPreview,
    });
  } catch (err: any) {
    console.error('Fetch lock-session error:', err);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}

// POST: Manager locks a meal session, registers menu, and commits headcounts
export async function POST(req: NextRequest) {
  try {
    const { error, user } = authenticate(req, ['manager', 'admin']);
    if (error) return error;

    const body = await req.json();
    const { date, mealType, menu } = body;

    if (!date || !mealType || !menu?.trim()) {
      return NextResponse.json(
        { message: 'Date, mealType ("lunch" | "dinner"), and menu are required.' },
        { status: 400 }
      );
    }

    if (!['lunch', 'dinner'].includes(mealType)) {
      return NextResponse.json({ message: 'Invalid mealType.' }, { status: 400 });
    }

    await ensureDbInit();
    const db = getDb();
    if (!db.dailyMeals) db.dailyMeals = [];

    // Find or create the DailyMealDay object
    let dayMeal = db.dailyMeals.find((d) => d.date === date);
    if (!dayMeal) {
      dayMeal = {
        id: `dm-${date}`,
        date,
        lunch: createEmptySession(),
        dinner: createEmptySession(),
        updatedAt: new Date().toISOString(),
      };
      db.dailyMeals.push(dayMeal);
    }

    // Get eligible members
    const eligibleMembers = db.users.filter(
      (u) => u.status === 'approved' && ['member', 'manager', 'admin'].includes(u.role)
    );

    const activeMembers: MealSessionMember[] = [];
    const offMembers: MealSessionOffMember[] = [];

    const nowIso = new Date().toISOString();

    for (const m of eligibleMembers) {
      const mEmail = m.email?.toLowerCase().trim();
      let recIndex = db.records.findIndex(
        (r) =>
          ((mEmail && r.userEmail && r.userEmail.toLowerCase().trim() === mEmail) ||
            (mEmail && r.userId && r.userId.toLowerCase().trim() === mEmail) ||
            r.userId === m.id) &&
          r.date === date &&
          r.mealType === mealType
      );

      let rec = recIndex !== -1 ? db.records[recIndex] : null;
      const isOff = rec && (rec.count === 0 || rec.requestStatus === 'accepted');

      if (isOff) {
        offMembers.push({
          userId: m.id,
          userEmail: mEmail,
          name: m.name || m.email,
          reason: rec?.requestReason || 'Turned off',
        });
      } else {
        activeMembers.push({
          userId: m.id,
          userEmail: mEmail,
          name: m.name || m.email,
          count: 1,
        });

        // Ensure a permanent record exists in db.records with count = 1
        if (!rec) {
          db.records.push({
            id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            userId: m.id,
            userEmail: mEmail,
            date,
            mealType,
            count: 1,
          });
        } else {
          rec.count = 1;
          rec.userEmail = mEmail || rec.userEmail;
        }
      }
    }

    // Update the session in dailyMeals
    const sessionDetail: MealSessionDetail = {
      menu: menu.trim(),
      isLocked: true,
      lockedAt: nowIso,
      lockedBy: user!.id,
      totalCount: activeMembers.length,
      activeMembers,
      offMembers,
    };

    if (mealType === 'lunch') {
      dayMeal.lunch = sessionDetail;
    } else {
      dayMeal.dinner = sessionDetail;
    }
    dayMeal.updatedAt = nowIso;

    await saveDb(db);

    return NextResponse.json({
      message: `Successfully locked ${mealType} for ${date} with menu "${menu.trim()}" (${activeMembers.length} meals confirmed).`,
      dayMeal,
    });
  } catch (err: any) {
    console.error('Lock session error:', err);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}

