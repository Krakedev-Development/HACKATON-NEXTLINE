'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn } from '@/lib/api';
import Landing from '@/widgets/landing/ui/Landing';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isLoggedIn()) router.replace('/chat');
    else setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <div style={{ minHeight: '100dvh', background: '#050403' }} />
    );
  }

  return <Landing />;
}
