import { MealSummary } from './meal';
import { BazaarActivityDetail } from './bazaar';

export interface Deposit {
  id: string;
  userId: string;
  amount: number;
  date: string;
  paymentMethod: string;
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  type?: 'meal_cash' | 'utility' | 'weekly_payment' | 'refund' | 'other' | 'fixed_cost';
  utilityType?: FixedUtilityType;
  month?: string;
  remarks?: string;
  userName?: string; // Hydrated for manager/admin display
  userEmail?: string;
}

export interface WeeklyPayment {
  id: string;
  userId: string;
  weekStart: string; // YYYY-MM-DD (Monday)
  weekEnd: string; // YYYY-MM-DD (Sunday)
  expectedAmount: number; // 500 normal, 1000 first week
  paidAmount: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  depositId?: string; // Link to deposit if paid via system
  userName?: string; // Hydrated
}

export type FixedUtilityType = 'rent' | 'electricity' | 'wifi' | 'gas' | 'servant_fee';

export interface SharedBill {
  id: string;
  month: string; // YYYY-MM
  type: FixedUtilityType;
  label: string; // Display name
  totalAmount: number; // Total bill for all members
  dueDate: string; // YYYY-MM-DD
  createdAt: string;
}

export interface MemberBillPayment {
  id: string;
  userId: string;
  month: string; // YYYY-MM
  type: FixedUtilityType;
  amount: number;
  paidAt: string;
  depositId?: string; // Link to deposit if applicable
  userName?: string; // Hydrated
}

export interface RefundRequest {
  id: string;
  userId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  reason: string;
  paymentMethod: string; // How they want the money back (bKash, Nagad, Cash, etc.)
  mobileNumber?: string; // For mobile banking refunds
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
  processedBy?: string; // Admin/manager who processed
  remarks?: string; // Admin/manager notes
  userName?: string; // Hydrated
  userEmail?: string; // Hydrated
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface SystemSettings {
  mealRate: number; // Rate per meal unit (dynamic fallback)
  weeklyPayment: number; // 500 default
  initialWeekPayment: number; // 1000 for first week
  monthlyFlatRate: number; // 2500 for full month flat
  startWeekDate: string; // Start of weekly cycle YYYY-MM-DD
  autoBookMeals: boolean; // Auto-book all members for published menus
  currentPairIndex: number; // Index tracking which BazaarPair is up next
  financeVisibilityUntil?: string; // Manager can publish finance calculations for a short window
  financeVisibilityDurationMinutes?: number;
  closedMealMonths?: string[]; // Months where full meal service is closed/off
}

export interface DashboardStats {
  userStats: {
    totalBalance: number;
    totalDeposits: number;
    totalMealsCount: number;
    totalMealCost: number;
    pendingDeposits: number;
    liveMealRate: number;
    weeklyPaymentStatus: WeeklyPayment | null;
    utilities: {
      rent: { share: number; paid: number; percentage: number };
      electricity: { share: number; paid: number; percentage: number };
      wifi: { share: number; paid: number; percentage: number };
      servantFee: { share: number; paid: number; percentage: number };
      totalShare: number;
      totalPaid: number;
      overallPercentage: number;
    };
  };
  managerStats?: {
    totalSystemBalance: number;
    totalSystemDeposits: number;
    totalSystemMealsCount: number;
    totalSystemMealCost: number;
    liveMealRate: number;
    pendingDepositsCount: number;
    membersCount: number;
    activeMenuCount: number;
    totalBazaarExpenses: number;
    pendingBazaarCount: number;
    deficitMembers: { userId: string; name: string; balance: number }[];
    autoBookEnabled: boolean;
    bazaarRotationOrder: { userId: string; name: string; bazaarCount: number }[];
    weekBazaarCount: number; // How many bazaars scheduled this week
    totalCashInHand: number; // Manager's physical cash in hand
    currentMonthFixedCost?: number;
    currentMonthFixedCostShare?: number;
    currentMonthMealCashAdded?: number;
    financeVisibilityUntil?: string;
    pendingResetRequest?: MonthlySummary | null;
  };
}

export interface MonthlySummary {
  id: string;
  month: string; // YYYY-MM
  totalBazaarExpense: number;
  totalMealsCount: number;
  finalMealRate: number;
  memberSummaries: {
    userId: string;
    userName: string;
    userEmail: string;
    totalMeals: number;
    mealCost: number;
    totalDeposits: number;
    endingBalance: number;
    carryForwardToNextMonth: number;
  }[];
  status: 'pending_approval' | 'archived';
  initiatedBy: string;
  initiatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface MemberOverviewData {
  myTotalMeals: number;
  todayMyMeals: number;
  todayMyLunch: number;
  todayMyDinner: number;
  messTotalMeals: number;
  todayMessMeals: number;
  todayMessLunch: number;
  todayMessDinner: number;
  liveMealRate: number;
  baseRate?: number;
  hasActiveCalculation?: boolean;
  today: string;
  isMonthMealOff?: boolean;
  firstBazaarDate?: string | null;
  totalBazaarExpenses?: number;
  bazaarCount?: number;
  isLunchLocked?: boolean;
  isDinnerLocked?: boolean;
  lunchMenu?: string;
  dinnerMenu?: string;
}

export interface CalendarActivityData {
  date: string;
  dayName: string;
  bazaarCount: number;
  bazaarDetails: BazaarActivityDetail[];
  assignments?: any[];
  hasAssignment?: boolean;
  totalBazaarCost: number;
  mealSummary: MealSummary;
}

export interface FixedExpenseItem {
  type: FixedUtilityType;
  label: string;
  share: number;
  paid: number;
  status: 'paid' | 'pending';
  dueDate?: string;
  paymentId?: string;
}

export interface FinanceOverviewData {
  currentMonthName: string;
  fixedCostPaid: number;
  totalAssignedFixed?: number;
  mealCashAdded: number;
  estimatedTotalCost: number;
  fixedExpenses: FixedExpenseItem[];
  myTotalMeals: number;
  liveMealRate: number;
  actualMealCost: number;
  actualTotalCost: number;
  assignedPastDue?: number;
  isCalculationVisible: boolean;
  financeVisibilityUntil?: string;
  isMonthMealOff?: boolean;
  firstBazaarDate?: string | null;
  weeklyMealCashGuidance: {
    currentWeekNumber: number; // 1 to 4
    suggestedAmount: number; // 1000 for week 1, 500 for weeks 2-4
    totalMonthTarget: number; // 2500
  };
}

export interface MonthlyHistoryRecord {
  month: string;
  monthName: string;
  fixedCost: number;
  mealCost: number;
  totalCost: number;
  status: 'settled' | 'pending' | 'in_progress';
}

export interface MessMonthlyHistoryRecord {
  month: string;
  monthName: string;
  totalFixedCost: number;
  totalMealCost: number;
  totalMessCost: number;
  status: 'settled' | 'pending' | 'in_progress';
}

export interface FixedBillItem {
  type: FixedUtilityType;
  label: string;
  totalAmount: number;
  memberShare: number;
  paidAmount: number;
  paidCount: number;
  memberCount: number;
  status: 'paid' | 'partial' | 'unpaid';
  dueDate: string;
}

export interface ManagerOverviewData {
  messTotalMealsToday: number;
  messTotalMealsMonth: number;
  mealCostThisWeek: number;
  mealCostThisMonth: number;
  liveMealRate: number;
  baseRate?: number;
  hasActiveCalculation?: boolean;
  today: string;
  todayDailyMeal?: any;
  fixedBills: FixedBillItem[];
  pastMonthComparison: PastMonthComparisonData[];
}

export interface PastMonthComparisonData {
  month: string;
  label: string;
  messMeals: number;
  mealCost: number;
  fixedCost: number;
  totalCost: number;
}
