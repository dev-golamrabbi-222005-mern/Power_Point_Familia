export interface MealMenu {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: 'lunch' | 'dinner';
  items: string[];
  estimatedCost: number;
}

export interface MealRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  mealType: 'lunch' | 'dinner';
  count: number; // e.g. 0, 1, 2, etc.
  requestStatus?: 'none' | 'pending' | 'accepted' | 'rejected';
  requestReason?: string;
  requestedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface MealCostData {
  date: string;
  dayLabel?: string;
  week?: string;
  myMealCost: number;
  myLivingCost: number;
  myTotalCost: number;
  messMealCost: number;
  messLivingCost: number;
  messTotalCost: number;
}

export interface MealCostAggregates {
  myMealCost: number;
  myLivingCost: number;
  myTotalCost: number;
  messMealCost: number;
  messLivingCost: number;
  messTotalCost: number;
}

export interface MealCostsBreakdownResponse {
  weekly: {
    data: MealCostData[];
    aggregates: MealCostAggregates;
    dateRange: { start: string; end: string };
  };
  monthly: {
    data: MealCostData[];
    aggregates: MealCostAggregates;
    dateRange: { start: string; end: string };
  };
}

export interface MealSummary {
  totalMeals: number;
  lunch: number;
  dinner: number;
}

export interface MealToggleLog {
  id: string;
  userId: string;
  date: string;
  mealType: 'lunch' | 'dinner';
  action: 'on' | 'off';
  oldCount: number;
  newCount: number;
  timestamp: string;
}

export interface EmergencyMealRequest {
  id: string;
  userId: string;
  userName?: string;
  date: string;
  mealType: 'lunch' | 'dinner';
  reason: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface MealSessionMember {
  userId: string;
  name: string;
  count: number;
}

export interface MealSessionOffMember {
  userId: string;
  name: string;
  reason?: string;
}

export interface MealSessionDetail {
  menu: string;
  isLocked: boolean;
  lockedAt: string | null;
  lockedBy: string | null;
  totalCount: number;
  activeMembers: MealSessionMember[];
  offMembers: MealSessionOffMember[];
}

export interface DailyMealDay {
  id: string; // e.g. "dm-2026-11-02"
  date: string; // YYYY-MM-DD
  lunch: MealSessionDetail;
  dinner: MealSessionDetail;
  updatedAt?: string;
}


