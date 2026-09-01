'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-xs font-mono text-zinc-500 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-zinc-400 animate-ping"></span>
        <span>Initializing FeatureFlow...</span>
      </div>
    </div>
  );
}
