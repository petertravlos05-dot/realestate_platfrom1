/**
 * Sentry Instrumentation File
 * 
 * This file MUST be imported FIRST, before any other imports.
 * It initializes Sentry before Express is imported anywhere.
 */

import * as Sentry from '@sentry/node';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Check if Sentry is enabled
const isSentryEnabled = process.env.SENTRY_ENABLE === 'true' && !!process.env.SENTRY_DSN_BACKEND;

if (isSentryEnabled) {
  const dsn = process.env.SENTRY_DSN_BACKEND;
  const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
  const release = process.env.SENTRY_RELEASE || undefined;
  const tracesSampleRate = parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.05');
  const profilesSampleRate = parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.0');

  Sentry.init({
    dsn,
    environment,
    release,
    tracesSampleRate,
    profilesSampleRate,
    
    // DO NOT set sendDefaultPii: true - we want strict scrubbing
    // sendDefaultPii: false is the default, which is what we want
    
    integrations: [
      // HTTP integration for request tracking
      Sentry.httpIntegration(),
      // Express integration - MUST be initialized before Express is imported
      Sentry.expressIntegration(),
    ],

    // Strict scrubbing: Remove all sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        const sensitiveHeaders = [
          'authorization',
          'cookie',
          'set-cookie',
          'x-csrf-token',
          'x-api-key',
          'authentication',
          'bearer',
        ];
        
        for (const header of sensitiveHeaders) {
          delete event.request.headers[header];
          delete event.request.headers[header.toLowerCase()];
          delete event.request.headers[header.toUpperCase()];
        }
      }

      // Remove sensitive cookies
      if (event.request?.cookies) {
        const sensitiveCookies = [
          'access_token',
          'refresh_token',
          'session',
          'csrf',
          'auth',
        ];
        
        for (const cookie of sensitiveCookies) {
          delete event.request.cookies[cookie];
          delete event.request.cookies[cookie.toLowerCase()];
        }
      }

      // Remove sensitive query parameters
      if (event.request?.query_string) {
        const queryParams = new URLSearchParams(event.request.query_string);
        const sensitiveParams = ['token', 'jwt', 'auth', 'key', 'secret', 'password', 'api_key'];
        
        for (const param of sensitiveParams) {
          queryParams.delete(param);
          queryParams.delete(param.toLowerCase());
        }
        
        event.request.query_string = queryParams.toString();
      }

      // Remove sensitive data from request body (for auth endpoints)
      if (event.request?.data) {
        const url = event.request.url || '';
        const isAuthEndpoint = url.includes('/api/auth/') || url.includes('/api/user/delete');
        
        if (isAuthEndpoint && typeof event.request.data === 'object') {
          // Remove password, token, jwt fields
          const sensitiveFields = ['password', 'token', 'jwt', 'secret', 'apiKey', 'api_key'];
          const cleanData: Record<string, any> = { ...event.request.data };
          
          for (const field of sensitiveFields) {
            delete cleanData[field];
            delete cleanData[field.toLowerCase()];
            delete cleanData[field.toUpperCase()];
          }
          
          event.request.data = cleanData;
        }
      }

      // Remove sensitive data from extra context
      if (event.extra) {
        const sensitiveExtraKeys = ['password', 'token', 'jwt', 'authorization', 'cookie', 'secret'];
        for (const key of sensitiveExtraKeys) {
          delete event.extra[key];
          delete event.extra[key.toLowerCase()];
        }
      }

      // Remove email from user context (if accidentally set)
      if (event.user) {
        delete event.user.email;
        delete event.user.username; // May contain email
      }

      return event;
    },

    // Scrub transaction URLs and query params
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

  console.log(`[SENTRY] Initialized (environment: ${environment}, release: ${release || 'none'})`);
} else {
  console.log('[SENTRY] Sentry disabled (SENTRY_ENABLE=false or SENTRY_DSN_BACKEND not set)');
}

