"use client";

import { useEffect } from "react";
import * as Sentry from '@sentry/nextjs';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Sentry is now initialized via sentry.client.config.ts
    // Only set tags/context here, never initialize
    
    const enable = process.env.NEXT_PUBLIC_SENTRY_ENABLE === 'true';
    if (enable) {
      // Set app tag (already set in config, but ensure it's set)
      Sentry.setTag('app', 'frontend');
      
      // DO NOT set user context with PII
      // If you need to set user, use only hashed userId:
      // Sentry.setUser({ id: hashUserId(userId) });
      // Never set email, username, or any PII
    }
  }, []);

  return (
    <>
      {children}
    </>
  );
} 