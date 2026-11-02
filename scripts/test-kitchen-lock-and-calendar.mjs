import assert from 'node:assert';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'power_point_familia_super_secure_jwt_secret_key_2026';
const BASE_URL = 'http://localhost:3000';

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name, status: user.status },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

const adminToken = makeToken({
  id: 'user-rabbi-superadmin',
  email: 'g.rabbi.dev@gmail.com',
  name: 'Golam Rabbi (Admin)',
  role: 'admin',
  status: 'approved',
});

const memberToken = makeToken({
  id: 'user-member',
  email: 'member1@familia.com',
  name: 'Sadik Member',
  role: 'member',
  status: 'approved',
});

async function runTests() {
  console.log('====================================================');
  console.log('  TESTING KITCHEN LOCK, CALENDAR & MEAL COUNT FIX   ');
  console.log('====================================================\n');

  const today = '2026-11-02';

  // 1. Check Lock Session Preview
  console.log('1. Checking Live Lock Session Preview...');
  const previewRes = await fetch(`${BASE_URL}/api/records/lock-session?date=${today}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const previewData = await previewRes.json();
  assert.strictEqual(previewRes.status, 200, 'Preview endpoint must return 200');
  assert.ok(previewData.lunch !== undefined, 'Lunch session must exist in preview');
  console.log(`   ✓ Active members preview for Lunch: ${previewData.lunch.activeMembers.length} members`);

  // 2. Manager locks today's Lunch with menu "মুরগি + মসুর ডাল + আলুভর্তা"
  console.log('\n2. Locking Today\'s Lunch with Menu...');
  const lockRes = await fetch(`${BASE_URL}/api/records/lock-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      date: today,
      mealType: 'lunch',
      menu: 'মুরগি + মসুর ডাল + আলুভর্তা',
    }),
  });
  const lockData = await lockRes.json();
  assert.strictEqual(lockRes.status, 200, 'Lock endpoint must return 200');
  assert.strictEqual(lockData.dayMeal.lunch.isLocked, true, 'Lunch must be marked locked');
  assert.strictEqual(lockData.dayMeal.lunch.menu, 'মুরগি + মসুর ডাল + আলুভর্তা', 'Menu must match');
  assert.ok(lockData.dayMeal.lunch.totalCount > 0, 'Total count must be > 0');
  console.log(`   ✓ Lunch locked successfully: ${lockData.dayMeal.lunch.totalCount} meals committed!`);
  console.log(`   ✓ Menu recorded: "${lockData.dayMeal.lunch.menu}"`);

  // 3. Member attempts to turn meal OFF after lock (Should be REJECTED)
  console.log('\n3. Testing Post-Lock Meal Off Attempt by Member (Must be rejected)...');
  const toggleRes = await fetch(`${BASE_URL}/api/records/toggle-meal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${memberToken}`,
    },
    body: JSON.stringify({
      date: today,
      mealType: 'lunch',
      action: 'off',
    }),
  });
  const toggleData = await toggleRes.json();
  assert.strictEqual(toggleRes.status, 400, 'Toggle meal off on locked session must return 400');
  assert.strictEqual(toggleData.isKitchenLocked, true, 'isKitchenLocked flag must be true');
  assert.ok(toggleData.message.includes('রান্নার চাল-ডাল চুলায় উঠে গেছে'), 'Must contain cook in progress message');
  console.log('   ✓ Post-lock meal off was successfully REJECTED with message:');
  console.log(`     "${toggleData.message}"`);

  // 4. Verify Member Overview meal counts are NO LONGER 0
  console.log('\n4. Verifying Member Overview Meal Counts...');
  const memRes = await fetch(`${BASE_URL}/api/dashboard/member-overview`, {
    headers: { Authorization: `Bearer ${memberToken}` },
  });
  const memData = await memRes.json();
  assert.strictEqual(memRes.status, 200);
  assert.ok(memData.myTotalMeals >= 1, `myTotalMeals should be >= 1, got: ${memData.myTotalMeals}`);
  assert.ok(memData.messTotalMeals >= 1, `messTotalMeals should be >= 1, got: ${memData.messTotalMeals}`);
  assert.strictEqual(memData.todayMyLunch, 1, 'Today my lunch must be 1');
  console.log(`   ✓ myTotalMeals: ${memData.myTotalMeals} (Fixed! No longer 0)`);
  console.log(`   ✓ messTotalMeals: ${memData.messTotalMeals} (Fixed! No longer 0)`);
  console.log(`   ✓ todayMyMeals: ${memData.todayMyMeals}`);

  // 5. Verify Calendar Activities API returns menu and counts
  console.log('\n5. Verifying Calendar Activities API...');
  const calRes = await fetch(`${BASE_URL}/api/dashboard/calendar-activities`, {
    headers: { Authorization: `Bearer ${memberToken}` },
  });
  const calData = await calRes.json();
  assert.strictEqual(calRes.status, 200);
  const todayAct = calData.activitiesByDate[today];
  assert.ok(todayAct, 'Today must be present in activities');
  assert.strictEqual(todayAct.mealSummary.lunchMenu, 'মুরগি + মসুর ডাল + আলুভর্তা', 'Calendar must have lunch menu');
  assert.strictEqual(todayAct.mealSummary.isLunchLocked, true, 'Calendar must show lunch is locked');
  assert.ok(todayAct.mealSummary.lunch > 0, 'Calendar lunch count must be > 0');
  assert.strictEqual(todayAct.mealSummary.myLunch, true, 'User must have myLunch = true');
  console.log(`   ✓ Calendar Day Lunch Menu: "${todayAct.mealSummary.lunchMenu}"`);
  console.log(`   ✓ Calendar Day Lunch Count: ${todayAct.mealSummary.lunch} meals`);
  console.log(`   ✓ Calendar User Lunch Status: ${todayAct.mealSummary.myLunch ? 'Eaten (+1)' : 'Off'}`);

  console.log('\n====================================================');
  console.log('   ALL KITCHEN LOCK & CALENDAR AUDITS PASSED 100%!   ');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});

