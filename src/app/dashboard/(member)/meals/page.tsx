'use client';

import React from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useDashboard } from '@/src/context/DashboardContext';
import MealTab from '@/src/components/dashboard/(member)/MealTab';
import ManagerMealsTab from '@/src/components/dashboard/(manager)/ManagerMealsTab';

export default function UnifiedMealsPage() {
  const { token, user } = useAuth();
  const { activeRoleView, menus, refreshSystemData } = useDashboard();
  if (!token) return null;

  const isManagerMode = user?.role === 'manager' && activeRoleView === 'manager';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="section-title">
          {isManagerMode ? 'Kitchen Headcount, Menu & Bazaar Verification' : 'Meal Bookings & Daily Menu'}
        </h2>
        <span className="px-3 py-1 rounded-full text-xs font-bold w-fit bg-zinc-800 text-zinc-300 border border-zinc-700">
          {isManagerMode ? 'Manager Operations' : 'Personal Meals'}
        </span>
      </div>

      {isManagerMode ? (
        <ManagerMealsTab
          token={token}
          menus={menus}
          onRefreshMenus={refreshSystemData}
        />
      ) : (
        <MealTab token={token} />
      )}
    </div>
  );
}
