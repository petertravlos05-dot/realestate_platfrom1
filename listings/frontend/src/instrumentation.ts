/**
 * Next.js Instrumentation Hook
 * 
 * This file is executed once when the Next.js server starts.
 * Used to initialize Sentry on the server and edge runtimes.
 * 
 * Client-side initialization happens automatically via sentry.client.config.ts
 * (loaded by Next.js Sentry SDK, not in ClientLayout.tsx)
 */

export async function register() {
  const enableSentry = process.env.NEXT_PUBLIC_SENTRY_ENABLE === 'true' && process.env.NEXT_PUBLIC_SENTRY_DSN;
  
  if (!enableSentry) {
    return; // Skip Sentry initialization if disabled
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize Sentry server-side
    try {
      await import('../sentry.server.config');
    } catch (error) {
      console.error('[SENTRY] Failed to load server config:', error);
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Initialize Sentry edge runtime
    try {
      await import('../sentry.edge.config');
    } catch (error) {
      console.error('[SENTRY] Failed to load edge config:', error);
    }
  }
  
  // Client-side initialization happens automatically via sentry.client.config.ts
  // (loaded by Next.js Sentry SDK via withSentryConfig in next.config.js)
}

