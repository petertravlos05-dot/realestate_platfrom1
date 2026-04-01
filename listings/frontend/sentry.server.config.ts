/**
 * Sentry Server Configuration (Next.js API Routes & Server Components)
 * 
 * Captures server-side errors from API routes and server components.
 * Uses shared sanitizeSentryEvent for consistent scrubbing.
 */

import * as Sentry from '@sentry/nextjs';
import { sanitizeSentryEvent } from './src/lib/sentry/sanitizeEvent';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
const release = process.env.SENTRY_RELEASE || undefined;
const tracesSampleRate = parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.05');
const enable = process.env.NEXT_PUBLIC_SENTRY_ENABLE === 'true';

if (!enable || !dsn) {
  console.log('[SENTRY] Server-side Sentry disabled (NEXT_PUBLIC_SENTRY_ENABLE=false or DSN not set)');
} else {
  Sentry.init({
    dsn,
    environment,
    release,
    tracesSampleRate,
    
    // Use shared sanitizer
    beforeSend(event: any, hint: any): any {
      // Apply shared sanitization
      let sanitized = sanitizeSentryEvent(event);
      
      // Additional server-specific scrubbing: Remove request body for sensitive routes
      if (sanitized.request?.data && sanitized.request?.url) {
        const url = sanitized.request.url;
        const isSensitiveRoute = 
          url.includes('/api/auth/') || 
          url.includes('/api/user/delete') ||
          url.includes('/api/user/export');
        
        if (isSensitiveRoute) {
          // Remove entire body for sensitive routes
          sanitized.request.data = undefined;
        }
      }

      return sanitized;
    },

    // Scrub transaction URLs and query params
    beforeSendTransaction(event) {
      if (event.request?.url) {
        try {
          const url = new URL(event.request.url);
          const sensitiveParams = ['token', 'jwt', 'auth', 'key', 'secret', 'password', 'api_key'];
          
          for (const param of sensitiveParams) {
            url.searchParams.delete(param);
            url.searchParams.delete(param.toLowerCase());
          }
          
          event.request.url = url.toString();
        } catch {
          // Invalid URL, skip
        }
      }

      return event;
    },
  });

  console.log(`[SENTRY] Server-side Sentry initialized (environment: ${environment}, release: ${release || 'none'})`);
}

