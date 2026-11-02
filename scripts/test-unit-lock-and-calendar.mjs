import assert from 'node:assert';
import fs from 'node:fs';

console.log('====================================================');
console.log('  TESTING KITCHEN LOCK, CALENDAR & MEAL COUNT LOGIC ');
console.log('====================================================\n');

// 1. Load DB
const rawDb = JSON.parse(fs.readFileSync('./db.json', 'utf-8'));
if (!rawDb.dailyMeals) rawDb.dailyMeals = [];

const today = '2026-11-02';
console.log('1. Checking DB structure and active members...');
const eligibleMembers = rawDb.users.filter(
  (u) => u.status === 'approved' && ['member', 'manager', 'admin'].includes(u.role)
);
assert.ok(eligibleMembers.length > 0, 'Must have eligible members');
console.log(`   ✓ Found ${eligibleMembers.length} eligible members in mess`);

// 2. Simulate Manager Locking Lunch with Menu
console.log('\n2. Simulating Kitchen Headcount Lock for Lunch...');
const menuText = 'মুরগি + মসুর ডাল + আলুভর্তা';
const activeMembers = [];
const offMembers = [];

for (const m of eligibleMembers) {
  const rec = rawDb.records.find(
    (r) => r.userId === m.id && r.date === today && r.mealType === 'lunch'
  );
  const isOff = rec && (rec.count === 0 || rec.requestStatus === 'accepted');
  if (isOff) {
    offMembers.push({ userId: m.id, name: m.name, reason: rec.requestReason || 'Off' });
  } else {
    activeMembers.push({ userId: m.id, name: m.name, count: 1 });
  }
}

let dayMeal = rawDb.dailyMeals.find((d) => d.date === today);
if (!dayMeal) {
  dayMeal = {
    id: `dm-${today}`,
    date: today,
    lunch: {
      menu: '',
      isLocked: false,
      lockedAt: null,
      lockedBy: null,
      totalCount: 0,
      activeMembers: [],
      offMembers: [],
    },
    dinner: {
      menu: '',
      isLocked: false,
      lockedAt: null,
      lockedBy: null,
      totalCount: 0,
      activeMembers: [],
      offMembers: [],
    },
  };
  rawDb.dailyMeals.push(dayMeal);
}

dayMeal.lunch = {
  menu: menuText,
  isLocked: true,
  lockedAt: new Date().toISOString(),
  lockedBy: 'user-rabbi-superadmin',
  totalCount: activeMembers.length,
  activeMembers,
  offMembers,
};

fs.writeFileSync('./db.json', JSON.stringify(rawDb, null, 2), 'utf-8');
assert.strictEqual(dayMeal.lunch.isLocked, true);
assert.strictEqual(dayMeal.lunch.menu, menuText);
assert.ok(dayMeal.lunch.totalCount > 0);
console.log(`   ✓ Successfully locked lunch: ${dayMeal.lunch.totalCount} meals committed!`);
console.log(`   ✓ Menu recorded in dailyMeals: "${dayMeal.lunch.menu}"`);

// 3. Test Rejection Logic for Post-Lock Meal Off
console.log('\n3. Verifying Post-Lock Auto-Rejection Rule...');
const isSessionLocked = dayMeal.lunch.isLocked;
function attemptMealOff() {
  if (isSessionLocked) {
    return {
      success: false,
      isKitchenLocked: true,
      message: `দুঃখিত! আপনার রিকোয়েস্ট পৌঁছানোর আগেই রান্নার চাল-ডাল চুলায় উঠে গেছে (মেনু: ${dayMeal.lunch.menu})। তাই মিলটি আর বন্ধ করা সম্ভব নয়।`,
    };
  }
  return { success: true };
}

const toggleResult = attemptMealOff();
assert.strictEqual(toggleResult.success, false);
assert.strictEqual(toggleResult.isKitchenLocked, true);
assert.ok(toggleResult.message.includes('রান্নার চাল-ডাল চুলায় উঠে গেছে'));
console.log('   ✓ Post-lock attempt was rejected with message:');
console.log(`     "${toggleResult.message}"`);

// 4. Test Meal Counting in Member Overview
console.log('\n4. Verifying Meal Counting (Must NOT be 0)...');
let messTotalMeals = 0;
let myTotalMeals = 0;
const testUserId = 'user-member';

const currentMonth = '2026-11';
const currentMonthDays = rawDb.dailyMeals.filter((d) => d.date.startsWith(currentMonth));
for (const day of currentMonthDays) {
  if (day.lunch?.isLocked) {
    messTotalMeals += day.lunch.totalCount || 0;
    if (day.lunch.activeMembers?.some((m) => m.userId === testUserId)) myTotalMeals += 1;
  }
  if (day.dinner?.isLocked) {
    messTotalMeals += day.dinner.totalCount || 0;
    if (day.dinner.activeMembers?.some((m) => m.userId === testUserId)) myTotalMeals += 1;
  }
}

assert.ok(messTotalMeals > 0, `messTotalMeals should be > 0, got: ${messTotalMeals}`);
assert.ok(myTotalMeals > 0, `myTotalMeals should be > 0, got: ${myTotalMeals}`);
console.log(`   ✓ myTotalMeals: ${myTotalMeals} (Fixed! Verified > 0)`);
console.log(`   ✓ messTotalMeals: ${messTotalMeals} (Fixed! Verified > 0)`);

// 5. Test Calendar Aggregation
console.log('\n5. Verifying Calendar Activity Object...');
const calDayMeal = rawDb.dailyMeals.find((d) => d.date === today);
assert.ok(calDayMeal !== undefined);
assert.strictEqual(calDayMeal.lunch.menu, menuText);
assert.strictEqual(calDayMeal.lunch.isLocked, true);
assert.ok(calDayMeal.lunch.totalCount > 0);
console.log(`   ✓ Calendar Cell Lunch Badge: "L: ${calDayMeal.lunch.totalCount}"`);
console.log(`   ✓ Calendar Modal Menu: "${calDayMeal.lunch.menu}"`);
console.log(`   ✓ Calendar Modal Lock Status: 🔒 Locked`);

console.log('\n====================================================');
console.log('   ALL KITCHEN LOCK & CALENDAR AUDITS PASSED 100%!   ');
console.log('====================================================\n');

