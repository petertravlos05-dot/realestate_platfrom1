/**
 * Low-noise Sentry reporting helpers for DSAR and S3 failures
 * 
 * Uses stable fingerprints and tags to reduce alert noise.
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Report DSAR export failure with stable fingerprint
 */
export function reportDsarFailure(
  eventName: 'export_failed' | 'delete_failed' | 'consent_failed',
  error: Error,
  contextSafe?: Record<string, any>
): string | undefined {
  const enable = process.env.NEXT_PUBLIC_SENTRY_ENABLE === 'true';
  if (!enable) {
    return undefined;
  }

  return Sentry.withScope((scope) => {
    // Set stable tags
    scope.setTag('gdpr', 'dsar');
    scope.setTag('gdpr_event', eventName);
    
    // Set stable fingerprint for grouping
    scope.setFingerprint(['gdpr', eventName]);
    
    // Set safe context (no PII, no tokens)
    if (contextSafe) {
      const safeContext: Record<string, any> = {};
      for (const [key, value] of Object.entries(contextSafe)) {
        // Skip PII fields
        const keyLower = key.toLowerCase();
        if (!['email', 'phone', 'address', 'userid', 'token', 'password', 'jwt', 'secret'].includes(keyLower)) {
          safeContext[key] = value;
        }
      }
      scope.setContext('dsar', safeContext);
    }

    // Capture as message with error attached
    const eventId = Sentry.captureMessage(`dsar.${eventName}`, {
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

    return eventId;
  });
}

/**
 * Report S3 deletion failure with stable fingerprint
 */
export function reportS3DeletionFailure(
  error: Error,
  contextSafe?: {
    bucket?: string;
    keyPrefix?: string; // Never full key
    attempts?: number;
    maxAttempts?: number;
  }
): string | undefined {
  const enable = process.env.NEXT_PUBLIC_SENTRY_ENABLE === 'true';
  if (!enable) {
    return undefined;
  }

  return Sentry.withScope((scope) => {
    // Set stable tags
    scope.setTag('job', 's3_deletion');
    scope.setTag('s3_delete', 'failed');
    
    // Set stable fingerprint for grouping
    scope.setFingerprint(['job', 's3_deletion', 'failed']);
    
    // Set safe context (only prefix, never full key)
    if (contextSafe) {
      const safeContext: Record<string, any> = {};
      if (contextSafe.bucket) safeContext.bucket = contextSafe.bucket;
      if (contextSafe.keyPrefix) safeContext.keyPrefix = contextSafe.keyPrefix; // Only prefix
      if (contextSafe.attempts !== undefined) safeContext.attempts = contextSafe.attempts;
      if (contextSafe.maxAttempts !== undefined) safeContext.maxAttempts = contextSafe.maxAttempts;
      
      scope.setContext('s3_deletion', safeContext);
    }

    // Capture as message with error attached
    const eventId = Sentry.captureMessage('s3_deletion.failed', {
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

    return eventId;
  });
}



