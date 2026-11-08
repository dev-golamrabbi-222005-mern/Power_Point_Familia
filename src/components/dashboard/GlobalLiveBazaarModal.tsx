'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '@/src/context/DashboardContext';
import LiveBazaarModal from './LiveBazaarModal';
import { showErrorAlert } from '@/src/lib/alerts';
import { BazaarAssignment } from '@/src/types/bazaar';

export default function GlobalLiveBazaarModal() {
  const { 
    token, 
    todayBazaarAssignment, 
    isLiveBazaarOpen, 
    setIsLiveBazaarOpen, 
    refreshAll 
  } = useDashboard();

  const [cachedAssignment, setCachedAssignment] = useState<BazaarAssignment | null>(null);

  // Restore cached assignment when offline
  useEffect(() => {
    if (!todayBazaarAssignment && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('familia_today_bazaar_assignment');
        if (stored) {
          setCachedAssignment(JSON.parse(stored));
        }
      } catch (e) {}
    }
  }, [todayBazaarAssignment]);

  const activeAssignment = todayBazaarAssignment || cachedAssignment;

  if (!isLiveBazaarOpen || !activeAssignment || !token) {
    return null;
  }

  return (
    <LiveBazaarModal
      isOpen={isLiveBazaarOpen}
      onClose={() => setIsLiveBazaarOpen(false)}
      assignment={activeAssignment}
      token={token}
      onSuccess={() => {
        refreshAll();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('bazaar-updated'));
        }
      }}
      onError={(err) => {
        showErrorAlert('Bazaar Error', err);
      }}
    />
  );
}
