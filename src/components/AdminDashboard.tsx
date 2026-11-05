'use client';

import React, { useState, useEffect } from 'react';
import { User, MealMenu } from '../types';
import { ShieldAlert } from 'lucide-react';
import AdminOverviewTab from './dashboard/(admin)/AdminOverviewTab';

interface AdminDashboardProps {
  user: User;
  token: string;
  mealRate: number;
  onRefreshSettings: () => void;
}

export default function AdminDashboard({
  user,
  token,
  mealRate,
  onRefreshSettings,
}: AdminDashboardProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [menus, setMenus] = useState<MealMenu[]>([]);

  const fetchAdminData = async () => {
    try {
      const usersRes = await fetch('/api/members', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (usersRes.ok) setAllUsers(await usersRes.json());

      const menusRes = await fetch('/api/menu', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (menusRes.ok) setMenus(await menusRes.json());
    } catch (error) {
      console.error('Error in admin fetch', error);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  return (
    <div className="space-y-6">
      {/* Executive Admin Header Banner */}
      <div className="bg-gradient-to-r from-purple-600/20 via-indigo-600/15 to-emerald-600/20 border border-purple-500/25 rounded-2xl p-5 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl shadow-inner">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/15 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                Admin Console
              </span>
              <span className="text-xs text-zinc-400 font-bold">• System Administrator</span>
            </div>
            <h2 className="section-title text-zinc-100 mt-0.5">
              Power Point Familia Admin Panel Overview
            </h2>
          </div>
        </div>
      </div>

      {/* Admin Overview Content */}
      <AdminOverviewTab
        token={token}
        allUsers={allUsers}
        menus={menus}
        mealRate={mealRate}
      />
    </div>
  );
}
