'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { useDashboard } from '@/src/context/DashboardContext';
import FinanceTab from '@/src/components/dashboard/(member)/FinanceTab';
import ManagerFinanceTab from '@/src/components/dashboard/(manager)/ManagerFinanceTab';
import ManagerTicketsTab from '@/src/components/dashboard/(manager)/ManagerTicketsTab';
import { Wallet, ClipboardList, DollarSign, ShieldAlert } from 'lucide-react';

function UnifiedFinanceContent() {
  const { token, user } = useAuth();
  const { activeRoleView, pendingDepositsCount } = useDashboard();
  const searchParams = useSearchParams();

  const [managerSubTab, setManagerSubTab] = useState<'dues' | 'tickets'>('dues');
  const [prefillUserId, setPrefillUserId] = useState<string | null>(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const userParam = searchParams.get('user');
    if (tab === 'tickets' || userParam) {
      setManagerSubTab('tickets');
      if (userParam) setPrefillUserId(userParam);
    }
  }, [searchParams]);

  if (!token) return null;

  const isManagerMode = user?.role === 'manager' && activeRoleView === 'manager';

  if (!isManagerMode) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="section-title">Financial Ledger & Deposits</h2>
          <span className="px-3 py-1 rounded-full text-xs font-bold w-fit bg-zinc-800 text-zinc-300 border border-zinc-700">
            Personal Finances
          </span>
        </div>
        <FinanceTab token={token} />
      </div>
    );
  }

  // Manager Mode: Unified Finances & Dues Workspace
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="section-title">Finances, Dues & Deposit Approvals</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Manage global member accounts, verify payments, and reconcile fixed costs
          </p>
        </div>

        {/* Manager Mode Sub-Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl w-fit">
          <button
            onClick={() => setManagerSubTab('dues')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              managerSubTab === 'dues'
                ? 'bg-teal-500 text-zinc-950 shadow-md font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Member Dues & Costs</span>
          </button>

          <button
            onClick={() => setManagerSubTab('tickets')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer relative ${
              managerSubTab === 'tickets'
                ? 'bg-teal-500 text-zinc-950 shadow-md font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Deposit Approvals & Tickets</span>
            {pendingDepositsCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                managerSubTab === 'tickets' ? 'bg-zinc-950 text-amber-300' : 'bg-amber-500 text-zinc-950'
              }`}>
                {pendingDepositsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {managerSubTab === 'dues' ? (
        <ManagerFinanceTab
          token={token}
          onNavigateToTickets={(targetUserId) => {
            if (targetUserId) setPrefillUserId(targetUserId);
            setManagerSubTab('tickets');
          }}
        />
      ) : (
        <ManagerTicketsTab
          token={token}
          prefillWarnUserId={prefillUserId}
          onRefreshData={() => {}}
        />
      )}
    </div>
  );
}

export default function UnifiedFinancePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500">Loading finances...</div>}>
      <UnifiedFinanceContent />
    </Suspense>
  );
}
