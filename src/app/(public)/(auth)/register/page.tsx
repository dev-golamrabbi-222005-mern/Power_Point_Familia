'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center text-zinc-500 text-xs">
      Redirecting to secure login...
    </div>
  );
}
