export type UserRole = 'user' | 'member' | 'manager' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  bazaarCount: number; // Tracks how many bazaar duties this user has done
  autoBookDisabled?: boolean; // Member-level opt-out from auto-booking
  previousMonthCarryForward?: number; // Opening balance carry forward from previous month
  pastMonthDue?: number; // Past month assigned due amount
  fixedCosts?: {
    rent?: number;
    electricity?: number;
    wifi?: number;
    gas?: number;
    servant?: number;
    extraCost?: number;
    extraCostReason?: string;
    customFixedTotal?: number;
  };
  image?: string;
  photoURL?: string;
  pushSubscriptions?: any[]; // Array of Web Push Notification subscriptions
}

export interface AuthState {
  user: User | null;
  token: string | null;
}

export interface AdminChangeRequest {
  id: string;
  managerId: string;
  managerName: string;
  targetUserId: string;
  targetUserName: string;
  type: 'edit_cost' | 'edit_meal' | 'edit_balance' | 'meal_off_month' | 'pay_fixed_bill' | 'add_custom_utility';
  details: string;
  oldValue?: any;
  newValue?: any;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  resolvedAt?: string;
}
