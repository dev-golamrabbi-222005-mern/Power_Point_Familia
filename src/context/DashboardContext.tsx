'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { User, MealMenu, Deposit, BazaarAssignment } from '@/src/types';

interface DashboardContextType {
  user: User | null;
  token: string | null;
  activeRoleView: 'manager' | 'member';
  setActiveRoleView: (role: 'manager' | 'member') => void;
  toggleRoleView: () => void;
  mealRate: number;
  baseRate: number;
  liveMealRate: number;
  hasActiveCalculation: boolean;
  menus: MealMenu[];
  allUsers: User[];
  loadingUsers: boolean;
  loadingSystem: boolean;
  pendingDepositsCount: number;
  pendingUsersCount: number;
  pendingMealRequestsCount: number;
  todayBazaarAssignment: BazaarAssignment | null;
  refreshSystemData: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  refreshDeposits: () => Promise<void>;
  refreshBazaarAssignment: () => Promise<void>;
  refreshMealRequests: () => Promise<void>;
  refreshAll: () => Promise<void>;
  // Modal states
  isQuickMealOpen: boolean;
  setIsQuickMealOpen: (open: boolean) => void;
  isQuickExpenseOpen: boolean;
  setIsQuickExpenseOpen: (open: boolean) => void;
  isQuickApproveOpen: boolean;
  setIsQuickApproveOpen: (open: boolean) => void;
  isProfileOpen: boolean;
  setIsProfileOpen: (open: boolean) => void;
  isLiveBazaarOpen: boolean;
  setIsLiveBazaarOpen: (open: boolean) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();

  const [activeRoleView, setActiveRoleView] = useState<'manager' | 'member'>('manager');
  const [mealRate, setMealRate] = useState<number>(45);
  const [baseRate, setBaseRate] = useState<number>(45);
  const [liveMealRate, setLiveMealRate] = useState<number>(0);
  const [hasActiveCalculation, setHasActiveCalculation] = useState<boolean>(false);
  const [menus, setMenus] = useState<MealMenu[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [loadingSystem, setLoadingSystem] = useState<boolean>(true);
  const [pendingDepositsCount, setPendingDepositsCount] = useState<number>(0);
  const [pendingMealRequestsCount, setPendingMealRequestsCount] = useState<number>(0);
  const [todayBazaarAssignment, setTodayBazaarAssignment] = useState<BazaarAssignment | null>(null);

  // Modal states
  const [isQuickMealOpen, setIsQuickMealOpen] = useState(false);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [isQuickApproveOpen, setIsQuickApproveOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLiveBazaarOpen, setIsLiveBazaarOpen] = useState(false);

  const toggleRoleView = () => {
    setActiveRoleView(prev => (prev === 'manager' ? 'member' : 'manager'));
  };

  const refreshSystemData = useCallback(async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [menuRes, settingsRes, overviewRes] = await Promise.all([
        fetch('/api/menu', { headers }),
        fetch('/api/settings', { headers }),
        fetch('/api/dashboard/member-overview', { headers }),
      ]);

      if (menuRes.ok) {
        const menuData = await menuRes.json();
        setMenus(menuData);
      }
      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        const base = sData.mealRate || 45;
        setBaseRate(base);
      }
      if (overviewRes.ok) {
        const ovData = await overviewRes.json();
        const live = ovData.liveMealRate || 0;
        setLiveMealRate(live);
        setHasActiveCalculation(ovData.hasActiveCalculation ?? (live > 0));
        setMealRate(live > 0 ? live : (ovData.baseRate || 45));
      }
    } catch (e) {
      console.error('Error fetching dashboard system data', e);
    } finally {
      setLoadingSystem(false);
    }
  }, [token]);

  const refreshUsers = useCallback(async () => {
    if (!token || !user || (user.role !== 'admin' && user.role !== 'manager')) return;
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/members', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const usersData = await res.json();
        setAllUsers(usersData);
      }
    } catch (e) {
      console.error('Error fetching users in dashboard', e);
    } finally {
      setLoadingUsers(false);
    }
  }, [token, user]);

  const refreshDeposits = useCallback(async () => {
    if (!token || !user || (user.role !== 'manager' && user.role !== 'admin')) return;
    try {
      const res = await fetch('/api/deposits', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: Deposit[] = await res.json();
        const pendingCount = data.filter(d => d.status === 'pending').length;
        setPendingDepositsCount(pendingCount);
      }
    } catch (e) {
      console.error('Error fetching deposits in dashboard', e);
    }
  }, [token, user]);

  const refreshBazaarAssignment = useCallback(async () => {
    if (!token || !user) return;
    const cleanEmail = user.email ? user.email.toLowerCase().trim() : '';
    const userId = user.id;

    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    try {
      const res = await fetch('/api/bazaar/assign', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const assignments: BazaarAssignment[] = await res.json();
        const assigned = assignments.find(
          a => (a.userId === userId || a.member2Id === userId || (cleanEmail && (a.userId === cleanEmail || a.member2Id === cleanEmail))) &&
               a.date === todayStr
        );
        setTodayBazaarAssignment(assigned || null);
        if (assigned && typeof window !== 'undefined') {
          try {
            localStorage.setItem('familia_today_bazaar_assignment', JSON.stringify(assigned));
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('Network offline or error fetching bazaar assignment, checking offline cache');
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('familia_today_bazaar_assignment');
          if (cached) {
            setTodayBazaarAssignment(JSON.parse(cached));
          }
        } catch (err) {}
      }
    }
  }, [token, user]);

  const refreshMealRequests = useCallback(async () => {
    if (!token || !user) return;
    try {
      const res = await fetch('/api/records/request-meal-off', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const requests = await res.json();
        const pending = requests.filter((r: any) => r.requestStatus === 'pending').length;
        setPendingMealRequestsCount(pending);
      }
    } catch (e) {
      // quiet
    }
  }, [token, user]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshSystemData(), 
      refreshUsers(), 
      refreshDeposits(),
      refreshBazaarAssignment(),
      refreshMealRequests()
    ]);
  }, [refreshSystemData, refreshUsers, refreshDeposits, refreshBazaarAssignment, refreshMealRequests]);

  // Initial load on token ready
  useEffect(() => {
    if (token) {
      refreshAll();
    }
  }, [token]);

  // Event-driven reactive sync (Zero infinite polling loops)
  useEffect(() => {
    const handleCustomMealReqChange = () => {
      refreshMealRequests();
    };
    const handleBazaarUpdated = () => {
      refreshBazaarAssignment();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('meal-requests-changed', handleCustomMealReqChange);
      window.addEventListener('bazaar-updated', handleBazaarUpdated);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('meal-requests-changed', handleCustomMealReqChange);
        window.removeEventListener('bazaar-updated', handleBazaarUpdated);
      }
    };
  }, [refreshMealRequests, refreshBazaarAssignment]);

  const pendingUsersCount = allUsers.filter(u => u.status === 'pending').length;

  return (
    <DashboardContext.Provider
      value={{
        user,
        token,
        activeRoleView,
        setActiveRoleView,
        toggleRoleView,
        mealRate,
        baseRate,
        liveMealRate,
        hasActiveCalculation,
        menus,
        allUsers,
        loadingUsers,
        loadingSystem,
        pendingDepositsCount,
        pendingUsersCount,
        pendingMealRequestsCount,
        todayBazaarAssignment,
        refreshSystemData,
        refreshUsers,
        refreshDeposits,
        refreshBazaarAssignment,
        refreshMealRequests,
        refreshAll,
        isQuickMealOpen,
        setIsQuickMealOpen,
        isQuickExpenseOpen,
        setIsQuickExpenseOpen,
        isQuickApproveOpen,
        setIsQuickApproveOpen,
        isProfileOpen,
        setIsProfileOpen,
        isLiveBazaarOpen,
        setIsLiveBazaarOpen,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
