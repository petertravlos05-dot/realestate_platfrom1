/**
 * Rate Limit Handler - Prevents 429 spam and manages cooldowns
 */

interface RateLimitState {
  last429Time: number;
  cooldownUntil: number;
  retryCount: number;
}

const rateLimitStates = new Map<string, RateLimitState>();
const COOLDOWN_DURATION = 30000; // 30 seconds
const MAX_RETRIES = 3;

/**
 * Check if we're in cooldown for a given endpoint
 */
export function isInCooldown(endpoint: string): boolean {
  const state = rateLimitStates.get(endpoint);
  if (!state) return false;
  return Date.now() < state.cooldownUntil;
}

/**
 * Get remaining cooldown time in seconds
 */
export function getCooldownRemaining(endpoint: string): number {
  const state = rateLimitStates.get(endpoint);
  if (!state) return 0;
  const remaining = state.cooldownUntil - Date.now();
  return Math.max(0, Math.ceil(remaining / 1000));
}

/**
 * Handle 429 error - set cooldown and return user-friendly message
 */
export function handle429Error(endpoint: string): { shouldRetry: boolean; message: string } {
  const state = rateLimitStates.get(endpoint) || {
    last429Time: 0,
    cooldownUntil: 0,
    retryCount: 0,
  };

  const now = Date.now();
  state.last429Time = now;
  state.cooldownUntil = now + COOLDOWN_DURATION;
  state.retryCount += 1;

  rateLimitStates.set(endpoint, state);

  const shouldRetry = state.retryCount < MAX_RETRIES;
  const message = 'Πολλά αιτήματα. Περίμενε λίγο και δοκίμασε ξανά.';

  return { shouldRetry, message };
}

/**
 * Reset rate limit state for an endpoint (on successful request)
 */
export function resetRateLimitState(endpoint: string): void {
  rateLimitStates.delete(endpoint);
}

/**
 * Extract endpoint key from URL
 */
export function getEndpointKey(url: string): string {
  try {
    const urlObj = new URL(url, window.location.origin);
    return urlObj.pathname;
  } catch {
    return url;
  }
}

