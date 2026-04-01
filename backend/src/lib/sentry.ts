/**
 * Sentry Error Tracking Configuration
 * 
 * Strict scrubbing: No tokens, PII, or sensitive data sent to Sentry.
 * 
 * Environment Variables:
 *   SENTRY_DSN_BACKEND - Sentry DSN (required if enabled)
 *   SENTRY_ENVIRONMENT - Environment name (production|staging|development)
 *   SENTRY_RELEASE - Release version (e.g., plotex-backend@<git_sha>)
 *   SENTRY_TRACES_SAMPLE_RATE - Performance tracing sample rate (0.0-1.0, default: 0.05)
 *   SENTRY_PROFILES_SAMPLE_RATE - Profiling sample rate (0.0-1.0, default: 0.0)
 *   SENTRY_ENABLE - Enable Sentry (true|false, default: false)
 */

import * as Sentry from '@sentry/node';
import { Request } from 'express';
import { AuthRequest } from '../middleware/auth';
import { RequestWithId } from '../middleware/request-id';
import crypto from 'crypto';

/**
 * Hash userId for Sentry user context (never send raw userId)
 */
function hashUserId(userId: string): string {
  return crypto.createHash('sha256').update(userId).digest('hex').substring(0, 16);
}

/**
 * Check if Sentry is enabled
 */
export function isSentryEnabled(): boolean {
  return process.env.SENTRY_ENABLE === 'true' && !!process.env.SENTRY_DSN_BACKEND;
}

/**
 * Initialize Sentry (call once at app startup)
 */
export function initSentry(): void {
  if (!isSentryEnabled()) {
    console.log('[SENTRY] Sentry disabled (SENTRY_ENABLE=false or SENTRY_DSN_BACKEND not set)');
    return;
  }

  // Check if already initialized (prevents duplicate initialization)
  // Note: In Sentry v8+, we use a flag instead of getCurrentHub()
  // This is a simple check - if DSN is set and we're here, we'll initialize
  // Multiple initializations are safe in Sentry v8+ (they're ignored)

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
    
    integrations: [
      // HTTP integration for request tracking
      Sentry.httpIntegration(),
      // Express integration (v10 uses OpenTelemetry-based tracing)
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
}

/**
 * Set request context for Sentry (call in middleware)
 * Adds non-PII tags: service, route, method, role, requestId
 * Optionally sets hashed userId (never raw userId or email)
 */
export function setRequestContext(req: Request): void {
  if (!isSentryEnabled()) {
    return;
  }

  const reqWithId = req as RequestWithId;
  const authReq = req as AuthRequest;

  // Set service tag
  Sentry.setTag('service', 'backend');

  // Set route tag
  const route = (req as any).route?.path || req.path || 'unknown';
  Sentry.setTag('route', route);

  // Set method tag
  Sentry.setTag('method', req.method || 'unknown');

  // Set role tag (non-PII)
  const role = authReq.userRole || 'anonymous';
  Sentry.setTag('role', role);

  // Set requestId tag
  const requestIdHeader = req.headers['x-request-id'];
  const requestId = reqWithId.requestId || (Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader) || 'unknown';
  Sentry.setTag('requestId', requestId);

  // Set user context (hashed userId only, never email)
  if (authReq.userId) {
    Sentry.setUser({
      id: hashUserId(authReq.userId),
      // DO NOT set email, username, or any PII
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Capture exception with GDPR/DSAR tags and stable fingerprint
 * Uses captureMessage with stable fingerprint to reduce alert noise
 */
export function captureDSARException(
  error: Error,
  eventType: 'export_failed' | 'delete_failed' | 'consent_failed',
  context?: Record<string, any>
): void {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.withScope((scope) => {
    // Set stable tags
    scope.setTag('gdpr', 'dsar');
    scope.setTag('gdpr_event', eventType);
    
    // Set stable fingerprint for grouping (reduces noise)
    scope.setFingerprint(['gdpr', eventType]);
    
    if (context) {
      // Only add safe context (no PII)
      const safeContext: Record<string, any> = {};
      for (const [key, value] of Object.entries(context)) {
        // Skip PII fields
        const keyLower = key.toLowerCase();
        if (!['email', 'phone', 'address', 'userid', 'token', 'password', 'jwt', 'secret'].includes(keyLower)) {
          safeContext[key] = value;
        }
      }
      scope.setContext('dsar', safeContext);
    }

    // Capture as message with stable fingerprint (low-noise)
    Sentry.captureMessage(`dsar.${eventType}`, {
      level: 'error',
      extra: {
        error: {
          name: error.name,
          message: error.message,
        },
      },
    });

    // Also attach the exception for stack trace
    Sentry.captureException(error);
  });
}

/**
 * Capture S3 deletion failure with stable fingerprint
 * Uses captureMessage with stable fingerprint to reduce alert noise
 */
export function captureS3DeletionFailure(
  error: Error | string,
  context?: {
    bucket?: string;
    keyPrefix?: string; // Never full key
    attempts?: number;
    maxAttempts?: number;
  }
): void {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.withScope((scope) => {
    // Set stable tags
    scope.setTag('job', 's3_deletion');
    scope.setTag('s3_delete', 'failed');
    
    // Set stable fingerprint for grouping (reduces noise)
    scope.setFingerprint(['job', 's3_deletion', 'failed']);
    
    if (context) {
      const safeContext: Record<string, any> = {};
      if (context.bucket) safeContext.bucket = context.bucket;
      if (context.keyPrefix) safeContext.keyPrefix = context.keyPrefix; // Only prefix, never full key
      if (context.attempts !== undefined) safeContext.attempts = context.attempts;
      if (context.maxAttempts !== undefined) safeContext.maxAttempts = context.maxAttempts;
      
      scope.setContext('s3_deletion', safeContext);
    }

    // Capture as message with stable fingerprint (low-noise)
    const errorMessage = typeof error === 'string' ? error : error.message;
    Sentry.captureMessage('s3_deletion.failed', {
      level: 'error',
      extra: {
        error: typeof error === 'string' 
          ? { message: errorMessage }
          : {
              name: error.name,
              message: error.message,
            },
      },
    });

    // Also attach the exception for stack trace (if Error object)
    if (error instanceof Error) {
      Sentry.captureException(error);
    }
  });
}

// Export Sentry instance for direct use if needed
export { Sentry };

