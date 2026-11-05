import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/src/lib/auth';
import { getDb, saveDb, ensureDbInit } from '@/src/lib/db';

export async function GET(req: NextRequest) {
  try {
    await ensureDbInit();
    const db = getDb();
    return NextResponse.json(db.settings || { mealRate: 45 });
  } catch (error) {
    console.error('Fetch settings error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { error, user } = authenticate(req, ['admin', 'manager']);
    if (error) return error;

    const body = await req.json();
    const { mealRate, weeklyPayment, initialWeekPayment, monthlyFlatRate, startWeekDate, autoBookMeals, bazaarRotationIndex } = body;

    await ensureDbInit(true);
    const db = getDb();
    
    // Update only the provided settings fields
    if (mealRate !== undefined && Number(mealRate) > 0) {
      db.settings.mealRate = Number(mealRate);
    }
    if (weeklyPayment !== undefined && Number(weeklyPayment) > 0) {
      db.settings.weeklyPayment = Number(weeklyPayment);
    }
    if (initialWeekPayment !== undefined && Number(initialWeekPayment) > 0) {
      db.settings.initialWeekPayment = Number(initialWeekPayment);
    }
    if (monthlyFlatRate !== undefined && Number(monthlyFlatRate) > 0) {
      db.settings.monthlyFlatRate = Number(monthlyFlatRate);
    }
    if (startWeekDate !== undefined) {
      db.settings.startWeekDate = startWeekDate;
    }
    if (autoBookMeals !== undefined) {
      db.settings.autoBookMeals = Boolean(autoBookMeals);
    }
    if (bazaarRotationIndex !== undefined) {
      db.settings.currentPairIndex = Number(bazaarRotationIndex);
    }
    if (body.financeVisibilityUntil !== undefined) {
      db.settings.financeVisibilityUntil = body.financeVisibilityUntil;
    }
    if (body.financeVisibilityDurationMinutes !== undefined) {
      db.settings.financeVisibilityDurationMinutes = Number(body.financeVisibilityDurationMinutes);
    }
    if (body.fixedUtilityTargets !== undefined) {
      const prev = db.settings.fixedUtilityTargets || {
        rent: 19000,
        electricity: 3800,
        wifi: 650,
        gas: 2060,
        servant: 4000,
      };
      db.settings.fixedUtilityTargets = {
        rent: body.fixedUtilityTargets.rent !== undefined ? Number(body.fixedUtilityTargets.rent) : prev.rent,
        electricity: body.fixedUtilityTargets.electricity !== undefined ? Number(body.fixedUtilityTargets.electricity) : prev.electricity,
        wifi: body.fixedUtilityTargets.wifi !== undefined ? Number(body.fixedUtilityTargets.wifi) : prev.wifi,
        gas: body.fixedUtilityTargets.gas !== undefined ? Number(body.fixedUtilityTargets.gas) : prev.gas,
        servant: body.fixedUtilityTargets.servant !== undefined ? Number(body.fixedUtilityTargets.servant) : prev.servant,
      };

      // Also sync current month's sharedBills with these targets
      const currentMonth = new Date().toISOString().slice(0, 7);
      const targets = [
        { type: 'rent', label: 'House Rent', amount: db.settings.fixedUtilityTargets.rent },
        { type: 'electricity', label: 'Current Bill', amount: db.settings.fixedUtilityTargets.electricity },
        { type: 'wifi', label: 'WiFi Bill', amount: db.settings.fixedUtilityTargets.wifi },
        { type: 'gas', label: 'Gas Bill', amount: db.settings.fixedUtilityTargets.gas },
        { type: 'servant_fee', label: 'Servant Fee', amount: db.settings.fixedUtilityTargets.servant },
      ];
      for (const t of targets) {
        let bill = db.sharedBills.find(b => b.month === currentMonth && b.type === t.type);
        if (bill) {
          bill.totalAmount = t.amount;
        } else {
          db.sharedBills.push({
            id: `bill-${t.type}-${Date.now()}`,
            month: currentMonth,
            type: t.type as any,
            label: t.label,
            totalAmount: t.amount,
            dueDate: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            paidStatus: 'unpaid',
          });
        }
      }
    }
    await saveDb(db);

    return NextResponse.json({
      settings: db.settings,
      message: 'System settings updated successfully.'
    });
  } catch (error) {
    console.error('Settings update error', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
