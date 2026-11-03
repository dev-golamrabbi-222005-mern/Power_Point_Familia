'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UnifiedFinancePage from '../../(member)/finance/page';

export default function ManagerFinancesLegacyPage() {
  const router = useRouter();

  useEffect(() => {
    // Soft redirect to canonical unified route
    router.replace('/dashboard/finance');
  }, [router]);

  return <UnifiedFinancePage />;
}
