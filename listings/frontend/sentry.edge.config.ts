/**
 * Sentry Edge Configuration (Edge Runtime)
 * 
 * Captures errors from Edge runtime (middleware, edge API routes).
 * Uses shared sanitizeSentryEvent + additional edge-specific scrubbing.
 */

import * as Sentry from '@sentry/nextjs';
import { sanitizeSentryEvent } from './src/lib/sentry/sanitizeEvent';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
const release = process.env.SENTRY_RELEASE || undefined;
const tracesSampleRate = parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.05');
const enable = process.env.NEXT_PUBLIC_SENTRY_ENABLE === 'true';

if (!enable || !dsn) {
  console.log('[SENTRY] Edge Sentry disabled (NEXT_PUBLIC_SENTRY_ENABLE=false or DSN not set)');
} else {
  Sentry.init({
    dsn,
    environment,
    release,
    tracesSampleRate,
    
    // Use shared sanitizer + additional edge-specific scrubbing
    beforeSend(event: any, hint: any): any {
      // Apply shared sanitization
      let sanitized = sanitizeSentryEvent(event);
      
      // Edge-specific: Remove ALL cookies unconditionally
      if (sanitized.request?.cookies) {
        sanitized.request.cookies = {};
      }
      
      // Edge-specific: Remove full query string (keep only pathname)
      if (sanitized.request?.url) {
        try {
          const url = new URL(sanitized.request.url);
          sanitized.request.url = url.pathname; // Only pathname, no query string
          sanitized.request.query_string = undefined;
        } catch {
          // Invalid URL, skip
        }
      }
      
      // Edge-specific: Remove request body entirely
      sanitized.request.data = undefined;

      return sanitized;
    },
  });

  console.log(`[SENTRY] Edge Sentry initialized (environment: ${environment}, release: ${release || 'none'})`);
}


