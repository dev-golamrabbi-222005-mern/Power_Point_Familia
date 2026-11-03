'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UnifiedMealsPage from '../../(member)/meals/page';

export default function ManagerMealsBazaarLegacyPage() {
  const router = useRouter();

  useEffect(() => {
    // Soft redirect to canonical unified route
    router.replace('/dashboard/meals');
  }, [router]);

  return <UnifiedMealsPage />;
}
