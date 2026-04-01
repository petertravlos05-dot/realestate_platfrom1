import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory, RateLimiterRedis, IRateLimiterOptions } from 'rate-limiter-flexible';
import { AuthRequest } from './auth';
import { auditLogger } from '../lib/utils/audit-logger';

// Check if Redis is available
let redisClient: any = null;
let redisConnectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';

if (process.env.RATE_LIMIT_REDIS_URL) {
  try {
    // Dynamic import to avoid requiring redis if not needed
    const redis = require('redis');
    redisClient = redis.createClient({ 
      url: process.env.RATE_LIMIT_REDIS_URL,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            console.error('[RATE_LIMIT] Redis reconnection failed after 10 attempts, using in-memory');
            redisConnectionStatus = 'error';
            redisClient = null;
            return new Error('Redis reconnection limit exceeded');
          }
          // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms, 3200ms, etc. (max 5s)
          const delay = Math.min(100 * Math.pow(2, retries), 5000);
          return delay;
        },
        connectTimeout: 5000, // 5 second timeout
      },
    });

    redisClient.on('error', (err: Error) => {
      if (redisConnectionStatus === 'connected') {
        console.error('[RATE_LIMIT] Redis error, falling back to memory:', err.message);
        redisConnectionStatus = 'error';
        // Don't set redisClient to null immediately - allow reconnection attempts
      }
    });

    redisClient.on('connect', () => {
      redisConnectionStatus = 'connected';
      console.log('[RATE_LIMIT] Redis connected for distributed rate limiting');
    });

    redisClient.on('ready', () => {
      redisConnectionStatus = 'connected';
      console.log('[RATE_LIMIT] Redis ready for rate limiting');
    });

    redisClient.on('reconnecting', () => {
      console.warn('[RATE_LIMIT] Redis reconnecting...');
      redisConnectionStatus = 'disconnected';
    });

    redisClient.on('end', () => {
      console.warn('[RATE_LIMIT] Redis connection ended, using in-memory rate limiting');
      redisConnectionStatus = 'disconnected';
    });

    // Attempt connection
    redisClient.connect?.().then(() => {
      redisConnectionStatus = 'connected';
      console.log('[RATE_LIMIT] Redis connected successfully');
    }).catch((err: Error) => {
      console.warn('[RATE_LIMIT] Redis connection failed, using in-memory rate limiting:', err.message);
      redisConnectionStatus = 'error';
      redisClient = null;
    });
  } catch (error) {
    console.warn('[RATE_LIMIT] Redis not available, using in-memory rate limiting');
    redisConnectionStatus = 'error';
  }
} else {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    console.warn('[RATE_LIMIT] ⚠️  Production mode: RATE_LIMIT_REDIS_URL not set');
    console.warn('[RATE_LIMIT] Using in-memory rate limiting (not suitable for multiple instances)');
    console.warn('[RATE_LIMIT] Consider setting RATE_LIMIT_REDIS_URL for distributed rate limiting');
  } else {
    console.log('[RATE_LIMIT] Using in-memory rate limiting (development mode)');
  }
}

// Rate limit configuration from environment variables
const RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED !== 'false'; // Default: enabled

// Default limits (can be overridden via env vars)
const DEFAULT_LOGIN_POINTS = parseInt(process.env.RATE_LIMIT_LOGIN_POINTS || '5', 10);
const DEFAULT_LOGIN_DURATION = parseInt(process.env.RATE_LIMIT_LOGIN_DURATION || '900', 10); // 15 minutes
const DEFAULT_LOGIN_BLOCK_DURATION = parseInt(process.env.RATE_LIMIT_LOGIN_BLOCK_DURATION || '900', 10); // 15 minutes

const DEFAULT_GENERAL_POINTS = parseInt(process.env.RATE_LIMIT_GENERAL_POINTS || '100', 10);
const DEFAULT_GENERAL_DURATION = parseInt(process.env.RATE_LIMIT_GENERAL_DURATION || '900', 10); // 15 minutes

const DEFAULT_STRICT_POINTS = parseInt(process.env.RATE_LIMIT_STRICT_POINTS || '5', 10); // 5 attempts
const DEFAULT_STRICT_DURATION = parseInt(process.env.RATE_LIMIT_STRICT_DURATION || '900', 10); // 15 minutes (was 1 hour)

const DEFAULT_MEDIUM_POINTS = parseInt(process.env.RATE_LIMIT_MEDIUM_POINTS || '30', 10);
const DEFAULT_MEDIUM_DURATION = parseInt(process.env.RATE_LIMIT_MEDIUM_DURATION || '60', 10); // 1 minute

const DEFAULT_HIGH_POINTS = parseInt(process.env.RATE_LIMIT_HIGH_POINTS || '200', 10);
const DEFAULT_HIGH_DURATION = parseInt(process.env.RATE_LIMIT_HIGH_DURATION || '900', 10); // 15 minutes

interface RateLimitOptions {
  keyPrefix: string;
  points: number;
  duration: number;
  blockDuration?: number;
  keyGenerator?: (req: Request) => string;
}

/**
 * Create a rate limiter instance
 * Automatically falls back to in-memory if Redis is unavailable
 */
function createRateLimiter(options: RateLimitOptions): RateLimiterMemory | RateLimiterRedis {
  const limiterOptions: IRateLimiterOptions = {
    keyPrefix: options.keyPrefix,
    points: options.points,
    duration: options.duration,
    blockDuration: options.blockDuration || options.duration,
  };

  // Use Redis if available and connected
  if (redisClient && redisConnectionStatus === 'connected') {
    try {
      return new RateLimiterRedis({
        ...limiterOptions,
        storeClient: redisClient,
      });
    } catch (error) {
      console.error('[RATE_LIMIT] Failed to create Redis limiter, falling back to memory:', error);
      return new RateLimiterMemory(limiterOptions);
    }
  }

  // Fallback to in-memory
  return new RateLimiterMemory(limiterOptions);
}

/**
 * Rate limit middleware factory
 */
export function rateLimit(options: RateLimitOptions) {
  // If rate limiting is disabled, return no-op middleware
  if (!RATE_LIMIT_ENABLED) {
    return (req: Request, res: Response, next: NextFunction) => next();
  }

  const limiter = createRateLimiter(options);

  return async (req: Request, res: Response, next: NextFunction) => {
    // Security: Rate limit bypass is ONLY allowed in non-production environments
    // and ONLY from localhost, OR when explicitly enabled via env var
    const isProduction = process.env.NODE_ENV === 'production';
    const testHeader = req.headers['x-test-request'];
    
    try {
      const allowBypassEnv = process.env.ALLOW_TEST_RATE_LIMIT_BYPASS === 'true';
      
      // Check if request is from localhost (127.0.0.1 or ::1)
      const clientIp = req.ip || req.socket.remoteAddress || '';
      const isLocalhost = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1';
      
      // Allow bypass ONLY if:
      // 1. NOT in production AND (header present OR env var set) AND from localhost
      // 2. OR explicitly enabled via env var AND from localhost
      const canBypass = !isProduction && (testHeader === 'true' || allowBypassEnv) && isLocalhost;
      
      
      if (canBypass) {
        console.log(`[RATE_LIMIT] Bypassing rate limit for test request: ${req.path} (from ${clientIp})`);
        return next(); // Skip rate limiting for test requests
      }
      
      // In production, NEVER bypass even if header is present
      if (isProduction && testHeader === 'true') {
        console.warn(`[RATE_LIMIT] Security: X-Test-Request header ignored in production (from ${clientIp})`);
        // Continue with normal rate limiting - do NOT bypass
      }

      // Generate key for rate limiting
      // Default: use IP address, but can be customized via keyGenerator
      const key = options.keyGenerator
        ? options.keyGenerator(req)
        : req.ip || req.socket.remoteAddress || 'unknown';


      // Try to consume a point
      await limiter.consume(key);

      // Success - continue to next middleware
      next();
    } catch (rateLimiterRes: any) {
      // Check if this is a rate limit error or a system error
      if (rateLimiterRes.msBeforeNext !== undefined) {
        // Rate limit exceeded (normal case)
        const retryAfterSeconds = Math.ceil(rateLimiterRes.msBeforeNext / 1000) || options.duration;

        // Audit log: Rate limit exceeded
        const endpoint = req.path || req.url || 'unknown';
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        auditLogger.rateLimitExceeded(req, endpoint, ipAddress);

        // Set Retry-After header BEFORE sending response
        res.setHeader('Retry-After', retryAfterSeconds.toString());
        
        res.status(429).json({
          error: 'Too many requests',
          retryAfterSeconds,
          message: `Rate limit exceeded. Please try again in ${retryAfterSeconds} seconds.`,
        });
      } else {
        // System error (e.g., Redis connection issue) - allow request but log error
        console.error('[RATE_LIMIT] Rate limiter error, allowing request:', rateLimiterRes);
        
        // In production, we might want to be more strict, but for now allow the request
        // to prevent Redis issues from blocking all traffic
        next();
      }
    }
  };
}

/**
 * Pre-configured rate limiters for common use cases
 */

// Strict rate limiter (for login, registration, password reset)
// 5 attempts per 15 minutes, block for 15 minutes
export const strictRateLimit = rateLimit({
  keyPrefix: 'rl_strict',
  points: DEFAULT_STRICT_POINTS,
  duration: DEFAULT_STRICT_DURATION,
  blockDuration: DEFAULT_STRICT_DURATION, // Block for same duration as window (15 minutes)
});

// Login-specific rate limiter
export const loginRateLimit = rateLimit({
  keyPrefix: 'rl_login',
  points: DEFAULT_LOGIN_POINTS,
  duration: DEFAULT_LOGIN_DURATION,
  blockDuration: DEFAULT_LOGIN_BLOCK_DURATION,
});

// Medium rate limiter (for token refresh, update-role, etc.)
export const mediumRateLimit = rateLimit({
  keyPrefix: 'rl_medium',
  points: DEFAULT_MEDIUM_POINTS,
  duration: DEFAULT_MEDIUM_DURATION,
});

// General API rate limiter
export const generalRateLimit = rateLimit({
  keyPrefix: 'rl_general',
  points: DEFAULT_GENERAL_POINTS,
  duration: DEFAULT_GENERAL_DURATION,
});

// High rate limiter (for search, properties list)
export const highRateLimit = rateLimit({
  keyPrefix: 'rl_high',
  points: DEFAULT_HIGH_POINTS,
  duration: DEFAULT_HIGH_DURATION,
});

// Per-user rate limiter (requires authentication)
export const userRateLimit = rateLimit({
  keyPrefix: 'rl_user',
  points: DEFAULT_GENERAL_POINTS,
  duration: DEFAULT_GENERAL_DURATION,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    return authReq.userId || req.ip || 'unknown';
  },
});

// Admin endpoint rate limiter (5 requests per minute per IP+userId)
export const adminRateLimit = rateLimit({
  keyPrefix: 'rl_admin',
  points: 5, // 5 requests per minute
  duration: 60, // 1 minute
  blockDuration: 60, // Block for 1 minute if exceeded
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    // Combine IP and userId for more precise rate limiting
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = authReq.userId || 'anonymous';
    return `${ip}:${userId}`;
  },
});

// OTP-specific rate limiter
export const otpRateLimit = rateLimit({
  keyPrefix: 'rl_otp',
  points: 5, // 5 OTP requests per 15 minutes
  duration: 900, // 15 minutes
  blockDuration: 900,
});

// Webhook rate limiter (for Stripe webhooks)
export const webhookRateLimit = rateLimit({
  keyPrefix: 'rl_webhook',
  points: parseInt(process.env.RATE_LIMIT_WEBHOOK_POINTS || '100', 10), // 100 requests per minute
  duration: parseInt(process.env.RATE_LIMIT_WEBHOOK_DURATION || '60', 10), // 1 minute
  blockDuration: 300, // Block for 5 minutes if exceeded
});

// Export rate limiter (2 exports per hour per user)
/**
 * Rate limit for initial export requests (2/hour per user)
 * Can be disabled for testing by setting DISABLE_EXPORT_RATE_LIMIT=true
 * or by sending X-Test-Request: true header
 */
export const exportRateLimit = rateLimit({
  keyPrefix: 'rl_export',
  points: process.env.DISABLE_EXPORT_RATE_LIMIT === 'true' ? 999999 : 2, // 2 initial exports per hour (or unlimited for testing)
  duration: 3600, // 1 hour
  blockDuration: 3600,
  keyGenerator: (req: Request) => {
    // NOTE: Bypass logic is handled in the middleware check, NOT here
    // This keyGenerator should NEVER bypass rate limits - it only generates keys
    // The middleware will handle bypassing before calling limiter.consume()
    const authReq = req as AuthRequest;
    const userId = authReq.userId || req.ip || 'unknown';
    // Check if this is a paginated request (has cursor)
    const body = req.body || {};
    const hasCursor = body.cursor && Object.keys(body.cursor).length > 0;
    // Use different key for paginated requests
    return hasCursor ? `${userId}_paginated` : `${userId}_initial`;
  },
});

/**
 * Rate limit for paginated export requests (20/hour per user)
 * Can be disabled for testing by setting DISABLE_EXPORT_RATE_LIMIT=true
 * or by sending X-Test-Request: true header
 */
export const exportPaginationRateLimit = rateLimit({
  keyPrefix: 'rl_export_paginated',
  points: process.env.DISABLE_EXPORT_RATE_LIMIT === 'true' ? 999999 : 20, // 20 paginated requests per hour (or unlimited for testing)
  duration: 3600, // 1 hour
  blockDuration: 3600,
  keyGenerator: (req: Request) => {
    // NOTE: Bypass logic is handled in the middleware check, NOT here
    // This keyGenerator should NEVER bypass rate limits - it only generates keys
    // The middleware will handle bypassing before calling limiter.consume()
    const authReq = req as AuthRequest;
    return authReq.userId || req.ip || 'unknown';
  },
});

// ============================================
// DEAL ROOM RATE LIMITERS
// ============================================

// Deal creation: 10/hour per userId+ip
export const dealCreateLimiter = rateLimit({
  keyPrefix: 'rl_deal_create',
  points: 10,
  duration: 3600, // 1 hour
  blockDuration: 3600,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = authReq.userId || 'anonymous';
    return `${ip}:${userId}`;
  },
});

// Professional request: 10/day per userId+ip
export const professionalRequestLimiter = rateLimit({
  keyPrefix: 'rl_professional_request',
  points: 10,
  duration: 86400, // 24 hours
  blockDuration: 3600,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = authReq.userId || 'anonymous';
    return `${ip}:${userId}`;
  },
});

// Chat messages: 30/min per userId+ip+threadId
export const chatMessageLimiter = rateLimit({
  keyPrefix: 'rl_chat_message',
  points: 30,
  duration: 60, // 1 minute
  blockDuration: 60,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = authReq.userId || 'anonymous';
    const threadId = (req as any).params?.threadId || 'unknown';
    return `${ip}:${userId}:${threadId}`;
  },
});

// Document download URL: 60/hour per userId+ip
export const docDownloadUrlLimiter = rateLimit({
  keyPrefix: 'rl_doc_download',
  points: 60,
  duration: 3600, // 1 hour
  blockDuration: 3600,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = authReq.userId || 'anonymous';
    return `${ip}:${userId}`;
  },
});

// Document upload: 20/hour per userId+ip
export const docUploadLimiter = rateLimit({
  keyPrefix: 'rl_doc_upload',
  points: 20,
  duration: 3600, // 1 hour
  blockDuration: 3600,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = authReq.userId || 'anonymous';
    return `${ip}:${userId}`;
  },
});

// Appointment request: 20/day per userId+ip
export const appointmentRequestLimiter = rateLimit({
  keyPrefix: 'rl_appointment_request',
  points: 20,
  duration: 86400, // 24 hours
  blockDuration: 3600,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = authReq.userId || 'anonymous';
    return `${ip}:${userId}`;
  },
});

// Professional search: 120/hour per ip (public-ish but JWT required)
export const professionalSearchLimiter = rateLimit({
  keyPrefix: 'rl_professional_search',
  points: 120,
  duration: 3600, // 1 hour
  blockDuration: 3600,
  keyGenerator: (req: Request) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});

// Professional onboarding rate limiter (10 requests per hour per userId+ip)
export const professionalOnboardingLimiter = rateLimit({
  keyPrefix: 'rl_professional_onboarding',
  points: 10, // 10 requests per hour
  duration: 3600, // 1 hour
  blockDuration: 3600, // Block for 1 hour if exceeded
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = authReq.userId || 'anonymous';
    return `${ip}:${userId}`;
  },
});

// SSE connection rate limiter (30 connects/hour per userId+ip)
export const sseConnectLimiter = rateLimit({
  keyPrefix: 'rl_sse_connect',
  points: 30,
  duration: 3600, // 1 hour
  blockDuration: 3600,
  keyGenerator: (req: Request) => {
    const authReq = req as any;
    const userId = authReq.userId || 'anonymous';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `${userId}:${ip}`;
  },
});

/**
 * Get rate limiting status (for health checks)
 */
export function getRateLimitStatus() {
  return {
    enabled: RATE_LIMIT_ENABLED,
    redis: {
      configured: !!process.env.RATE_LIMIT_REDIS_URL,
      connected: redisConnectionStatus === 'connected',
      status: redisConnectionStatus,
    },
    mode: redisConnectionStatus === 'connected' ? 'redis' : 'memory',
  };
}

