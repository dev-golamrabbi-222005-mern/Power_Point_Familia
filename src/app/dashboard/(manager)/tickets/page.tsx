'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import UnifiedFinancePage from '../../(member)/finance/page';

function ManagerTicketsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Soft redirect to canonical unified route with tab=tickets
    const userParam = searchParams.get('user');
    const targetUrl = userParam
      ? `/dashboard/finance?tab=tickets&user=${encodeURIComponent(userParam)}`
      : '/dashboard/finance?tab=tickets';
    router.replace(targetUrl);
  }, [router, searchParams]);

  return <UnifiedFinancePage />;
}

export default function ManagerTicketsLegacyPage() {
  return (
    <Suspense fallback={null}>
      <ManagerTicketsRedirect />
    </Suspense>
  );
}
