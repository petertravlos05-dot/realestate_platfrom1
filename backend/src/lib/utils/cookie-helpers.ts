/**
 * Cookie helper utilities for secure cookie-based authentication
 * Supports cross-subdomain cookie sharing (e.g., app.yourdomain.com and api.yourdomain.com)
 */

import { Response } from 'express';

export interface CookieOptions {
  domain?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  path?: string;
  maxAge?: number; // in seconds
}

/**
 * Get default cookie options for production
 * Uses COOKIE_DOMAIN env var (e.g., ".yourdomain.com")
 */
export function getCookieOptions(overrides: Partial<CookieOptions> = {}): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieDomain = process.env.COOKIE_DOMAIN;

  const defaultOptions: CookieOptions = {
    domain: cookieDomain || undefined, // Only set if COOKIE_DOMAIN is configured
    httpOnly: true, // Prevent JavaScript access (XSS protection)
    secure: isProduction, // HTTPS only in production
    sameSite: 'lax', // CSRF protection while allowing cross-site navigation
    path: '/',
    ...overrides,
  };

  return defaultOptions;
}

/**
 * Set an authentication cookie (access token)
 * @param res Express response object
 * @param token JWT token value
 * @param maxAgeSeconds Token expiration time in seconds
 */
export function setAuthCookie(
  res: Response,
  token: string,
  maxAgeSeconds: number
): void {
  const options = getCookieOptions({
    path: '/',
    maxAge: maxAgeSeconds,
  });

  res.cookie('access_token', token, options);
}

/**
 * Set a refresh token cookie
 * @param res Express response object
 * @param refreshToken Refresh token value
 * @param maxAgeSeconds Refresh token expiration time in seconds
 */
export function setRefreshTokenCookie(
  res: Response,
  refreshToken: string,
  maxAgeSeconds: number
): void {
  const options = getCookieOptions({
    path: '/api/auth/refresh', // Restrict to refresh endpoint
    maxAge: maxAgeSeconds,
  });

  res.cookie('refresh_token', refreshToken, options);
}

/**
 * Set a CSRF token cookie (non-HttpOnly, readable by JavaScript)
 * @param res Express response object
 * @param csrfToken CSRF token value
 */
export function setCsrfCookie(res: Response, csrfToken: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieDomain = process.env.COOKIE_DOMAIN;

  const options: CookieOptions = {
    domain: cookieDomain || undefined,
    httpOnly: false, // Must be readable by JavaScript for header injection
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 86400, // 24 hours
  };

  res.cookie('csrf_token', csrfToken, options);
}

/**
 * Clear authentication cookies
 * @param res Express response object
 */
export function clearAuthCookies(res: Response): void {
  const cookieDomain = process.env.COOKIE_DOMAIN;

  const options: CookieOptions = {
    domain: cookieDomain || undefined,
    path: '/',
  };

  res.clearCookie('access_token', options);
  res.clearCookie('refresh_token', { ...options, path: '/api/auth/refresh' });
  res.clearCookie('csrf_token', options);
}





