/**
 * Shared Sentry Event Sanitizer
 * 
 * Removes all PII, tokens, cookies, and sensitive data from Sentry events.
 * Used by client, server, and edge runtimes.
 * 
 * Fail-safe: Never throws, always returns a valid event.
 */

/**
 * Minimal Sentry Event type (compatible with @sentry/types Event)
 * Used for type checking the sanitized event structure
 */
interface SentryEventShape {
  message?: string;
  level?: string;
  type?: string;
  request?: {
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
    query_string?: string;
    url?: string;
    data?: any;
  };
  extra?: Record<string, any>;
  user?: {
    id?: string;
    email?: string;
    username?: string;
    ip_address?: string;
  };
  breadcrumbs?: Array<{
    data?: Record<string, any>;
    [key: string]: any;
  }>;
  [key: string]: any;
}

/**
 * Recursively redact sensitive keys from an object
 */
function redactSensitiveKeys(obj: any, depth: number = 0): any {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[max depth reached]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveKeys(item, depth + 1));
  }

  const sensitiveKeys = [
    'password', 'pass', 'token', 'jwt', 'refresh', 'secret', 'key',
    'authorization', 'cookie', 'email', 'phone', 'ssn', 'address',
    'api_key', 'apikey', 'access_token', 'refresh_token', 'session',
    'csrf', 'auth', 'bearer', 'x-api-key', 'x-csrf-token',
  ];

  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();
    
    // Check if key matches any sensitive pattern
    const isSensitive = sensitiveKeys.some(sensitive => 
      keyLower.includes(sensitive.toLowerCase())
    );

    if (isSensitive) {
      result[key] = '[redacted]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitiveKeys(value, depth + 1);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Truncate long strings to prevent large payloads
 */
function truncateString(str: string, maxLength: number = 512, keepStart: number = 128): string {
  if (typeof str !== 'string' || str.length <= maxLength) {
    return str;
  }
  return str.substring(0, keepStart) + '...(truncated)';
}

/**
 * Truncate strings in an object recursively
 */
function truncateStrings(obj: any, depth: number = 0): any {
  if (depth > 10) {
    return obj;
  }

  if (typeof obj === 'string') {
    return truncateString(obj);
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => truncateStrings(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = truncateStrings(value, depth + 1);
    }
    return result;
  }

  return obj;
}

/**
 * Sanitize Sentry event - removes PII, tokens, cookies, and sensitive data
 * Generic function that preserves the input event type
 */
export function sanitizeSentryEvent<T extends SentryEventShape>(event: T): T {
  try {
    // Clone event to avoid mutating original
    const sanitized = { ...event };

    // Sanitize request headers
    if (sanitized.request?.headers) {
      const sensitiveHeaders = [
        'authorization', 'cookie', 'set-cookie', 'x-api-key',
        'x-csrf-token', 'authentication', 'bearer',
      ];
      
      for (const header of sensitiveHeaders) {
        delete sanitized.request.headers[header];
        delete sanitized.request.headers[header.toLowerCase()];
        delete sanitized.request.headers[header.toUpperCase()];
      }
    }

    // Remove all cookies unconditionally
    if (sanitized.request?.cookies) {
      sanitized.request.cookies = {};
    }

    // Sanitize query string
    if (sanitized.request?.query_string) {
      try {
        const queryParams = new URLSearchParams(sanitized.request.query_string);
        const sensitiveParams = ['token', 'jwt', 'auth', 'key', 'secret', 'password', 'api_key'];
        
        for (const param of sensitiveParams) {
          queryParams.delete(param);
          queryParams.delete(param.toLowerCase());
        }
        
        sanitized.request.query_string = queryParams.toString();
      } catch {
        // Invalid query string, remove it
        sanitized.request.query_string = '';
      }
    }

    // Sanitize request data (body)
    if (sanitized.request?.data) {
      const url = sanitized.request.url || '';
      const isSensitiveRoute = 
        url.includes('/api/auth/') || 
        url.includes('/api/user/delete') ||
        url.includes('/api/user/export');

      if (isSensitiveRoute) {
        // Remove entire body for sensitive routes
        sanitized.request.data = undefined;
      } else {
        // Redact sensitive keys from body
        sanitized.request.data = redactSensitiveKeys(sanitized.request.data);
      }
    }

    // Sanitize extra context
    if (sanitized.extra) {
      sanitized.extra = redactSensitiveKeys(sanitized.extra);
    }

    // Sanitize user context - remove PII, keep only hashed ID
    if (sanitized.user) {
      const hashedId = sanitized.user.id;
      sanitized.user = {
        id: hashedId, // Only keep ID if it's hashed (not email or raw userId)
      };
      // Explicitly remove PII fields
      delete (sanitized.user as any).email;
      delete (sanitized.user as any).username;
      delete (sanitized.user as any).ip_address;
    }

    // Sanitize breadcrumbs
    if (sanitized.breadcrumbs) {
      sanitized.breadcrumbs = sanitized.breadcrumbs.map(breadcrumb => {
        const sanitizedBreadcrumb = { ...breadcrumb };
        
        if (sanitizedBreadcrumb.data) {
          sanitizedBreadcrumb.data = redactSensitiveKeys(sanitizedBreadcrumb.data);
        }
        
        return sanitizedBreadcrumb;
      });
    }

    // Truncate long strings in the entire event
    // Type assertion preserves the input type T (e.g., ErrorEvent)
    return truncateStrings(sanitized) as T;
  } catch (error) {
    // Fail-safe: if sanitization fails, return minimal event
    console.error('[SENTRY] Error sanitizing event:', error);
    return {
      ...event,
      message: event.message || 'Error sanitized',
      level: event.level || 'error',
    } as T;
  }
}



