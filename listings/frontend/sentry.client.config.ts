/**
 * Sentry Client Configuration (Browser)
 * 
 * Captures client-side errors from React components and browser JavaScript.
 * Uses shared sanitizeSentryEvent for consistent scrubbing.
 */

import * as Sentry from '@sentry/nextjs';
import { sanitizeSentryEvent } from './src/lib/sentry/sanitizeEvent';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
const tracesSampleRate = parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.05');
const enable = process.env.NEXT_PUBLIC_SENTRY_ENABLE === 'true';

if (!enable || !dsn) {
  console.log('[SENTRY] Client-side Sentry disabled (NEXT_PUBLIC_SENTRY_ENABLE=false or DSN not set)');
} else {
  Sentry.init({
    dsn,
    environment,
    tracesSampleRate,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    debug: process.env.NODE_ENV === 'development',

    // Ignore common browser noise (safe defaults)
    ignoreErrors: [
      // Browser extension errors
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop limit exceeded.',
      // Network errors that are handled gracefully
      'NetworkError when attempting to fetch resource.',
      'Failed to fetch',
      // AbortController errors (user-initiated cancellations)
      /^AbortError/,
      /^Aborted/,
    ],

    // Apply shared sanitizer
    beforeSend(event: any, hint: any): any {
      // Sanitize and return - type assertion ensures compatibility with ErrorEvent
      const sanitized = sanitizeSentryEvent(event);
      return sanitized;
    },

    // Scrub transaction data
    beforeSendTransaction(event) {
      // Remove sensitive query params from transaction URLs
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

  // Set app tag
  Sentry.setTag('app', 'frontend');

  console.log(`[SENTRY] Client-side Sentry initialized (environment: ${environment})`);
}



