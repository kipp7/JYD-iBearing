// app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login'); // 替换当前路由为 /login
  }, [router]);

  return null; // 或者返回一个 loading 状态
}
