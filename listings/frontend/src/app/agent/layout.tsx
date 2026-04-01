'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const AGENT_CONTEXT_KEY = 'deals_cameFromAgent';

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith('/agent') || pathname?.startsWith('/dashboard/agent')) {
      try {
        sessionStorage.setItem(AGENT_CONTEXT_KEY, '1');
      } catch {
        // ignore
      }
    }
  }, [pathname]);

  return <>{children}</>;
}
