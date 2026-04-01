/**
 * Toast Deduplication - Prevents duplicate toasts
 * Enhanced for rate limiting (429 errors) and SSE reconnect errors
 */

interface ToastRecord {
  message: string;
  timestamp: number;
  count?: number; // Track how many times this toast was suppressed
}

const toastHistory = new Map<string, ToastRecord>();
const DEDUPE_WINDOW = 15000; // 15 seconds
const RATE_LIMIT_WINDOW = 10000; // 10 seconds for rate limit errors
const SSE_ERROR_WINDOW = 30000; // 30 seconds for SSE errors

/**
 * Generate a key for toast deduplication
 */
function getToastKey(message: string, type?: 'error' | 'success' | 'info'): string {
  // Normalize rate limit messages
  const normalizedMessage = message.toLowerCase().includes('too many requests') || 
                           message.toLowerCase().includes('rate limit') ||
                           message.toLowerCase().includes('429')
    ? 'rate_limit_error'
    : message.toLowerCase().includes('reconnect') || 
      message.toLowerCase().includes('connection')
    ? 'sse_connection_error'
    : message;
  
  return `${type || 'default'}:${normalizedMessage}`;
}

/**
 * Check if toast should be shown (not duplicate)
 * Enhanced for rate limiting and SSE errors
 */
export function shouldShowToast(message: string, type?: 'error' | 'success' | 'info'): boolean {
  const key = getToastKey(message, type);
  const record = toastHistory.get(key);

  // Determine window based on message type
  const isRateLimit = key.includes('rate_limit_error');
  const isSSEError = key.includes('sse_connection_error');
  const window = isRateLimit ? RATE_LIMIT_WINDOW : isSSEError ? SSE_ERROR_WINDOW : DEDUPE_WINDOW;

  if (!record) {
    toastHistory.set(key, {
      message,
      timestamp: Date.now(),
      count: 1,
    });
    return true;
  }

  const age = Date.now() - record.timestamp;
  if (age > window) {
    // Update timestamp and show
    toastHistory.set(key, {
      message,
      timestamp: Date.now(),
      count: 1,
    });
    return true;
  }

  // Duplicate within window - increment count but don't show
  record.count = (record.count || 1) + 1;
  toastHistory.set(key, record);
  return false;
}

/**
 * Clear toast history (useful for testing)
 */
export function clearToastHistory(): void {
  toastHistory.clear();
}

/**
 * Get suppressed count for a toast (useful for debugging)
 */
export function getSuppressedCount(message: string, type?: 'error' | 'success' | 'info'): number {
  const key = getToastKey(message, type);
  const record = toastHistory.get(key);
  return record?.count ? record.count - 1 : 0;
}

