import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { MongoClient } from 'mongodb';
import { User, MealMenu, MealRecord, Deposit, SystemSettings, BazaarAssignment, BazaarExpense, BazaarPair, WeeklyPayment, ContactMessage, SharedBill, MemberBillPayment, RefundRequest, MonthlySummary, MealToggleLog, AdminChangeRequest, EmergencyMealRequest, DailyMealDay } from '../../src/types';

export interface DatabaseSchema {
  users: (User & { passwordHash: string })[];
  menus: MealMenu[];
  records: MealRecord[];
  deposits: Deposit[];
  bazaarAssignments: BazaarAssignment[];
  bazaarExpenses: BazaarExpense[];
  bazaarPairs: BazaarPair[];
  weeklyPayments: WeeklyPayment[];
  contactMessages: ContactMessage[];
  sharedBills: SharedBill[];
  memberBillPayments: MemberBillPayment[];
  refundRequests: RefundRequest[];
  monthlySummaries: MonthlySummary[];
  dailyMeals?: DailyMealDay[];
  mealToggleLog?: MealToggleLog[];
  adminChangeRequests?: AdminChangeRequest[];
  emergencyMealRequests?: EmergencyMealRequest[];
  settings: SystemSettings;
}

const DB_FILE = path.join(process.cwd(), 'db.json');

const DEFAULT_SETTINGS: SystemSettings = {
  mealRate: 45,
  weeklyPayment: 500,
  initialWeekPayment: 1000,
  monthlyFlatRate: 2500,
  startWeekDate: new Date().toISOString().split('T')[0],
  autoBookMeals: true,
  currentPairIndex: 0,
  financeVisibilityDurationMinutes: 60,
};

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'Power-Point-Famila';

let client: MongoClient | null = null;
let dbInstance: any = null;
let memoryDb: DatabaseSchema | null = null;
let isDbInitialized = false;

export async function connectMongo() {
  if (dbInstance) return dbInstance;
  if (!MONGODB_URI) return null;
  try {
    if (!client) {
      client = new MongoClient(MONGODB_URI);
      await client.connect();
    }
    dbInstance = client.db(DB_NAME);
    return dbInstance;
  } catch (err) {
    console.error('MongoDB Connection Error:', err);
    return null;
  }
}

export function getInitialDb(): DatabaseSchema {
  const initialUser: User & { passwordHash: string } = {
    id: 'user_admin_001',
    email: 'admin@familia.com',
    name: 'System Admin',
    phone: '+8801700000000',
    role: 'admin',
    status: 'approved',
    createdAt: new Date().toISOString(),
    passwordHash: bcrypt.hashSync('admin123', 10),
    bazaarCount: 0,
  };

  const rabbiAdmin: User & { passwordHash: string } = {
    id: 'user_admin_rabbi',
    email: 'g.rabbi.dev@gmail.com',
    name: 'Golam Rabbi (Admin)',
    phone: '+8801700000000',
    role: 'admin',
    status: 'approved',
    createdAt: new Date().toISOString(),
    passwordHash: bcrypt.hashSync('admin123', 10),
    bazaarCount: 0,
  };

  return {
    users: [initialUser, rabbiAdmin],
    menus: [],
    records: [],
    deposits: [],
    bazaarAssignments: [],
    bazaarExpenses: [],
    bazaarPairs: [],
    weeklyPayments: [],
    contactMessages: [],
    sharedBills: [],
    memberBillPayments: [],
    refundRequests: [],
    monthlySummaries: [],
    dailyMeals: [],
    mealToggleLog: [],
    adminChangeRequests: [],
    emergencyMealRequests: [],
    settings: DEFAULT_SETTINGS,
  };
}

export function getDb(): DatabaseSchema {
  if (memoryDb) return memoryDb;

  if (!fs.existsSync(DB_FILE)) {
    const initialData = getInitialDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    memoryDb = initialData;
    return memoryDb;
  }

  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    memoryDb = {
      ...parsed,
      dailyMeals: parsed.dailyMeals || [],
      mealToggleLog: parsed.mealToggleLog || [],
      adminChangeRequests: parsed.adminChangeRequests || [],
      emergencyMealRequests: parsed.emergencyMealRequests || [],
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
    return memoryDb!;
  } catch (e) {
    console.error('Error reading JSON DB file:', e);
    memoryDb = getInitialDb();
    return memoryDb!;
  }
}

export async function ensureDbInit(forceRefresh = false): Promise<DatabaseSchema> {
  // Fast path: if already in memory and initialized, return immediately (<1ms)
  if (memoryDb && isDbInitialized && !forceRefresh) {
    return memoryDb;
  }

  const db = await connectMongo();

  if (db) {
    try {
      const usersCol = db.collection('users');
      const menusCol = db.collection('menus');
      const recordsCol = db.collection('records');
      const depositsCol = db.collection('deposits');
      const bazaarAssignmentsCol = db.collection('bazaarAssignments');
      const bazaarExpensesCol = db.collection('bazaarExpenses');
      const bazaarPairsCol = db.collection('bazaarPairs');
      const weeklyPaymentsCol = db.collection('weeklyPayments');
      const contactMessagesCol = db.collection('contactMessages');
      const sharedBillsCol = db.collection('sharedBills');
      const memberBillPaymentsCol = db.collection('memberBillPayments');
      const refundRequestsCol = db.collection('refundRequests');
      const monthlySummariesCol = db.collection('monthlySummaries');
      const dailyMealsCol = db.collection('dailyMeals');
      const mealToggleLogCol = db.collection('mealToggleLog');
      const adminChangeRequestsCol = db.collection('adminChangeRequests');
      const settingsCol = db.collection('settings');

      // Fetch all collections in parallel for maximum speed
      const [
        users,
        menus,
        records,
        deposits,
        bazaarAssignments,
        bazaarExpenses,
        bazaarPairs,
        weeklyPayments,
        contactMessages,
        sharedBills,
        memberBillPayments,
        refundRequests,
        monthlySummaries,
        dailyMeals,
        mealToggleLog,
        adminChangeRequests,
        settingsDoc,
      ] = await Promise.all([
        usersCol.find({}).toArray(),
        menusCol.find({}).toArray(),
        recordsCol.find({}).toArray(),
        depositsCol.find({}).toArray(),
        bazaarAssignmentsCol.find({}).toArray(),
        bazaarExpensesCol.find({}).toArray(),
        bazaarPairsCol.find({}).toArray(),
        weeklyPaymentsCol.find({}).toArray(),
        contactMessagesCol.find({}).toArray(),
        sharedBillsCol.find({}).toArray(),
        memberBillPaymentsCol.find({}).toArray(),
        refundRequestsCol.find({}).toArray(),
        monthlySummariesCol.find({}).toArray(),
        dailyMealsCol.find({}).toArray(),
        mealToggleLogCol.find({}).toArray(),
        adminChangeRequestsCol.find({}).toArray(),
        settingsCol.findOne({ _id: 'global_settings' as any }),
      ]);

      const settings = settingsDoc ? { ...DEFAULT_SETTINGS, ...settingsDoc } : DEFAULT_SETTINGS;

      const formatDoc = (doc: any) => {
        if (!doc) return doc;
        const { _id, ...rest } = doc;
        return { id: doc.id || (_id ? _id.toString() : undefined), ...rest };
      };

      // Deduplicate users by email (case-insensitive)
      const userMap = new Map<string, any>();
      for (const raw of users) {
        const formatted = formatDoc(raw);
        if (!formatted.email) continue;
        const key = formatted.email.toLowerCase().trim();
        if (!userMap.has(key)) {
          userMap.set(key, formatted);
        } else {
          const prev = userMap.get(key);
          userMap.set(key, { ...prev, ...formatted, fixedCosts: formatted.fixedCosts || prev.fixedCosts });
        }
      }

      memoryDb = {
        users: Array.from(userMap.values()),
        menus: menus.map(formatDoc),
        records: records.map(formatDoc),
        deposits: deposits.map(formatDoc),
        bazaarAssignments: bazaarAssignments.map(formatDoc),
        bazaarExpenses: bazaarExpenses.map(formatDoc),
        bazaarPairs: bazaarPairs.map(formatDoc),
        weeklyPayments: weeklyPayments.map(formatDoc),
        contactMessages: contactMessages.map(formatDoc),
        sharedBills: sharedBills.map(formatDoc),
        memberBillPayments: memberBillPayments.map(formatDoc),
        refundRequests: refundRequests.map(formatDoc),
        monthlySummaries: monthlySummaries.map(formatDoc),
        dailyMeals: dailyMeals.map(formatDoc),
        mealToggleLog: mealToggleLog.map(formatDoc),
        adminChangeRequests: adminChangeRequests.map(formatDoc),
        settings,
      };
      isDbInitialized = true;
      return memoryDb!;
    } catch (err) {
      console.error('Failed reading from MongoDB, falling back to FS/Memory:', err);
    }
  }

  isDbInitialized = true;
  return getDb();
}

export async function saveDb(data: DatabaseSchema): Promise<void> {
  // Deduplicate users by clean email before persisting
  const userMap = new Map<string, any>();
  for (const u of data.users || []) {
    if (!u.email) continue;
    const cleanKey = u.email.toLowerCase().trim();
    if (!userMap.has(cleanKey)) {
      userMap.set(cleanKey, { ...u, email: cleanKey });
    } else {
      const prev = userMap.get(cleanKey);
      userMap.set(cleanKey, {
        ...prev,
        ...u,
        email: cleanKey,
        fixedCosts: u.fixedCosts || prev.fixedCosts,
        pastMonthDue: u.pastMonthDue !== undefined ? u.pastMonthDue : prev.pastMonthDue,
      });
    }
  }
  data.users = Array.from(userMap.values());
  memoryDb = data;
  isDbInitialized = true;

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed writing to DB file:', err);
  }

  const db = await connectMongo();
  if (db) {
    try {
      // 1. Sync Users with email unique upsert (NEVER wipes users collection)
      const usersCol = db.collection('users');
      await usersCol.createIndex({ email: 1 }, { unique: true }).catch(() => {});
      for (const user of data.users) {
        const cleanEmail = user.email.toLowerCase().trim();
        const docId = user.id || (user as any)._id || `user_g_${Date.now()}`;
        const { _id, ...rest } = user as any;
        await usersCol.replaceOne(
          { email: cleanEmail },
          { _id: docId, id: docId, email: cleanEmail, ...rest },
          { upsert: true }
        );
      }

      // 2. Safe sync helper for other collections
      const syncCollection = async (name: string, items: any[]) => {
        const col = db.collection(name);
        if (items && items.length > 0) {
          const bulkOps = items.map((item) => {
            const docId = item.id || item._id;
            const { _id, ...rest } = item;
            return {
              replaceOne: {
                filter: { _id: docId },
                replacement: { _id: docId, id: docId, ...rest },
                upsert: true,
              },
            };
          });
          await col.bulkWrite(bulkOps);
          const currentIds = items.map((i) => i.id || i._id).filter(Boolean);
          if (currentIds.length > 0) {
            await col.deleteMany({ _id: { $nin: currentIds } });
          }
        } else {
          await col.deleteMany({});
        }
      };

      await syncCollection('menus', data.menus);
      await syncCollection('records', data.records);
      await syncCollection('deposits', data.deposits);
      await syncCollection('bazaarAssignments', data.bazaarAssignments);
      await syncCollection('bazaarExpenses', data.bazaarExpenses);
      await syncCollection('bazaarPairs', data.bazaarPairs);
      await syncCollection('weeklyPayments', data.weeklyPayments);
      await syncCollection('contactMessages', data.contactMessages);
      await syncCollection('sharedBills', data.sharedBills);
      await syncCollection('memberBillPayments', data.memberBillPayments);
      await syncCollection('refundRequests', data.refundRequests);
      await syncCollection('monthlySummaries', data.monthlySummaries);
      await syncCollection('dailyMeals', data.dailyMeals || []);
      await syncCollection('mealToggleLog', data.mealToggleLog || []);
      await syncCollection('adminChangeRequests', data.adminChangeRequests || []);

      const settingsCol = db.collection('settings');
      await settingsCol.replaceOne(
        { _id: 'global_settings' as any },
        { _id: 'global_settings' as any, ...data.settings },
        { upsert: true }
      );
    } catch (err) {
      console.error('Failed syncing to MongoDB:', err);
    }
  }
}
