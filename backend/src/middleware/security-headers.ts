/**
 * Security headers middleware
 * Implements OWASP recommended security headers
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Determine if request is secure (HTTPS)
 * Works behind reverse proxy by checking x-forwarded-proto header
 * 
 * Request is considered secure when either:
 * - req.secure is true (works when trust proxy is set), OR
 * - req.headers['x-forwarded-proto'] indicates HTTPS (first value)
 * 
 * Handles various x-forwarded-proto formats:
 * - string "https"
 * - string "https, http" (comma-separated)
 * - string[] ["https", ...]
 * 
 * @param req Express request object
 * @returns true if request is secure (HTTPS)
 */
export function isRequestSecure(req: Request): boolean {
  // Check req.secure (works when trust proxy is set)
  if (req.secure) {
    return true;
  }
  
  // Fallback: check x-forwarded-proto header (for reverse proxy scenarios)
  // This handles cases where trust proxy might not fully populate req.secure
  const forwardedProto = req.headers['x-forwarded-proto'];
  
  if (!forwardedProto) {
    return false;
  }
  
  // Normalize header value (can be string, string[], or comma-separated string)
  let firstProto: string;
  
  if (Array.isArray(forwardedProto)) {
    // Array format: ["https", ...]
    firstProto = forwardedProto[0];
  } else {
    // String format: "https" or "https, http"
    firstProto = forwardedProto.split(',')[0];
  }
  
  // Trim whitespace and lowercase for comparison
  firstProto = firstProto.trim().toLowerCase();
  
  // Return true only if first protocol is "https"
  return firstProto === 'https';
}

/**
 * Set security headers on all responses
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS Protection (legacy, but still useful)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy - only send referrer for same-origin requests
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy (formerly Feature-Policy) - restrict browser features
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=()'
  );

  // Content Security Policy - STRICT (no wildcards)
  // Allowed domains are derived from environment variables for production security
  const frontendOrigin = process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || '';
  const frontendDomains = frontendOrigin.split(',').map(url => url.trim()).filter(Boolean);
  
  // S3 bucket domain for images (if configured)
  const s3Bucket = process.env.AWS_S3_BUCKET;
  const s3Region = process.env.AWS_REGION || 'us-east-1';
  const s3Domain = s3Bucket ? `https://${s3Bucket}.s3.${s3Region}.amazonaws.com` : null;
  
  // Sentry DSN domain (extract from DSN if configured)
  const sentryDsn = process.env.SENTRY_DSN_BACKEND || '';
  const sentryDomain = sentryDsn.match(/https?:\/\/([^\/]+)/)?.[0] || null;
  
  // Stripe domains (for checkout iframe)
  const stripeDomains = [
    'https://js.stripe.com',
    'https://hooks.stripe.com',
    'https://checkout.stripe.com',
  ];
  
  // Build CSP directives
  const imgSrc = ["'self'", 'data:', 'blob:'];
  if (s3Domain) imgSrc.push(s3Domain);
  if (frontendDomains.length > 0) imgSrc.push(...frontendDomains);
  
  const connectSrc = ["'self'"];
  if (frontendDomains.length > 0) connectSrc.push(...frontendDomains);
  if (sentryDomain) connectSrc.push(sentryDomain);
  connectSrc.push(...stripeDomains);
  
  const frameSrc: string[] = [];
  if (stripeDomains.length > 0) frameSrc.push(...stripeDomains);
  
  const cspDirectives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    `img-src ${imgSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline'", // TODO: Replace with nonce-based CSP later
    "script-src 'self'", // Remove 'unsafe-inline' and 'unsafe-eval' when possible
    `connect-src ${connectSrc.join(' ')}`,
    frameSrc.length > 0 ? `frame-src ${frameSrc.join(' ')}` : "frame-src 'none'",
    "font-src 'self' data:",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];

  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

  // Strict Transport Security (HSTS) - only in production with HTTPS
  // Note: Helmet also handles HSTS, but this provides additional safety
  // Uses isRequestSecure() to work correctly behind reverse proxy (Render.com)
  if (process.env.NODE_ENV === 'production' && isRequestSecure(req)) {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Remove server information
  res.removeHeader('X-Powered-By');

  next();
};

/**
 * CORS configuration helper
 * Returns CORS options based on environment
 */
export function getCorsOptions() {
  const allowedOrigins: string[] = [];

  // Parse FRONTEND_ORIGIN (preferred) or FRONTEND_URL from environment
  const frontendOrigin = process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL;
  if (frontendOrigin) {
    const urls = frontendOrigin.split(',').map(url => url.trim().replace(/\/$/, ''));
    allowedOrigins.push(...urls);
  }

  // Development defaults
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3004',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3004'
    );
  }

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, Postman, curl, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Normalize origin (remove trailing slash)
      const normalizedOrigin = origin.replace(/\/$/, '');

      // In production, require FRONTEND_URL to be set
      if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
        console.error('❌ CRITICAL: FRONTEND_URL not set in production! CORS will block all requests.');
        console.error('   Set FRONTEND_URL environment variable with comma-separated allowed origins.');
        return callback(new Error('CORS configuration error: FRONTEND_URL not set'));
      }

      // Check if origin is allowed
      if (allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
      } else {
        console.warn(
          `🚫 CORS blocked origin: ${origin} (normalized: ${normalizedOrigin})`
        );
        console.warn(`   Allowed origins: ${allowedOrigins.join(', ') || 'NONE (FRONTEND_URL not set)'}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  };
}

