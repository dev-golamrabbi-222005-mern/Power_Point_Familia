'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Hero from '@/src/components/Hero';
import { MealMenu } from '@/src/types';

export default function Home() {
  const router = useRouter();
  const [menus, setMenus] = useState<MealMenu[]>([]);
  const [mealRate, setMealRate] = useState<number>(45);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resMenu = await fetch('/api/menu');
        if (resMenu.ok) setMenus(await resMenu.json());

        const resSet = await fetch('/api/settings');
        if (resSet.ok) {
          const s = await resSet.json();
          setMealRate(s.mealRate || 45);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, []);

  return (
    <Hero
      onLoginClick={() => router.push('/login')}
      menus={menus}
      mealRate={mealRate}
    />
  );
}
