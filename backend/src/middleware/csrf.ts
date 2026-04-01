/**
 * CSRF Protection Middleware
 * 
 * Protects state-changing requests (POST, PUT, PATCH, DELETE) from CSRF attacks
 * when using cookie-based authentication.
 * 
 * Exempts:
 * - GET, HEAD, OPTIONS requests (safe methods)
 * - /api/stripe/webhook (webhook endpoints must not require CSRF)
 */

import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { setCsrfCookie } from '../lib/utils/cookie-helpers';

// CSRF token cookie name
export const CSRF_TOKEN_COOKIE_NAME = 'csrf_token';
export const CSRF_TOKEN_HEADER_NAME = 'X-CSRF-Token';

/**
 * Generate a random CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * CSRF protection middleware
 * 
 * For safe methods (GET, HEAD, OPTIONS): Generate and set CSRF token cookie
 * For state-changing methods (POST, PUT, PATCH, DELETE): Validate CSRF token
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Exempt Stripe webhook endpoint (webhooks use signature verification, not CSRF)
  if (req.path === '/api/stripe/webhook') {
    return next();
  }

  const method = req.method.toUpperCase();
  const isSafeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(method);
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  // For safe methods: Generate and set CSRF token if not present
  if (isSafeMethod) {
    const existingToken = req.cookies?.[CSRF_TOKEN_COOKIE_NAME];
    if (!existingToken) {
      const csrfToken = generateCsrfToken();
      setCsrfCookie(res, csrfToken);
    }
    return next();
  }

  // For state-changing methods: Validate CSRF token
  if (isStateChanging) {
    const cookieToken = req.cookies?.[CSRF_TOKEN_COOKIE_NAME];
    const headerToken = req.headers[CSRF_TOKEN_HEADER_NAME.toLowerCase()] as string;

    // Both cookie and header must be present
    if (!cookieToken || !headerToken) {
      res.status(403).json({
        error: 'CSRF token missing',
        message: 'CSRF protection: Both cookie and header token required',
      });
      return;
    }

    // Tokens must match
    if (cookieToken !== headerToken) {
      res.status(403).json({
        error: 'CSRF token mismatch',
        message: 'CSRF protection: Token validation failed',
      });
      return;
    }

    // CSRF validation passed
    return next();
  }

  // Unknown method: Allow but warn
  console.warn(`[CSRF] Unknown HTTP method: ${method}`);
  return next();
}


