/**
 * Admin endpoints for GDPR health monitoring
 * 
 * Protected by admin authentication and disabled in production unless
 * ENABLE_ADMIN_HEALTH=true is set.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { validateJwtToken, AuthRequest } from '../middleware/auth';
import { adminRateLimit } from '../middleware/rateLimit';
import { auditLog } from '../lib/utils/audit-logger';
import { RequestWithId } from '../middleware/request-id';

/**
 * Get request ID from request (set by requestIdMiddleware)
 */
function getRequestId(req: Request): string {
  const reqWithId = req as RequestWithId;
  return reqWithId.requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const router = Router();
const prisma = new PrismaClient();

/**
 * Check if admin endpoints are enabled
 */
function isAdminHealthEnabled(): boolean {
  return process.env.ENABLE_ADMIN_HEALTH === 'true';
}

/**
 * Check if user is admin
 */
function isAdmin(req: AuthRequest): boolean {
  return req.userRole === 'ADMIN' || req.userRole === 'SUPER_ADMIN';
}

/**
 * Admin authorization middleware
 * Must be called after validateJwtToken
 */
function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!isAdmin(req)) {
    const requestId = getRequestId(req);
    auditLog(req, 'admin.action', 'Admin health endpoint access denied - insufficient privileges', 'failure', {
      resourceType: 'admin_endpoint',
      resourceId: '/api/admin/gdpr/health',
      details: {
        reason: 'not_admin',
        userRole: req.userRole || 'unknown',
      },
    });
    res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Admin access required',
    });
    return;
  }
  next();
}

/**
 * GET /api/admin/gdpr/health
 * 
 * Returns GDPR cleanup health metrics:
 * - FileDeletionJob counts by status
 * - Oldest queued job age
 * - Audit log oldest age (if stored in DB)
 * 
 * Protected: Admin auth required + rate limiting
 * Production: Disabled unless ENABLE_ADMIN_HEALTH=true (returns 404)
 */
router.get('/gdpr/health', 
  // Feature flag gate (must be first - returns 404 if disabled)
  (req: Request, res: Response, next: NextFunction) => {
    if (!isAdminHealthEnabled()) {
      // Return 404 to hide endpoint existence
      // Note: Cannot log userId/role here as auth hasn't happened yet
      auditLog(req as AuthRequest, 'admin.action', 'Admin health endpoint access denied - feature disabled', 'failure', {
        resourceType: 'admin_endpoint',
        resourceId: '/api/admin/gdpr/health',
        details: { reason: 'disabled' },
      });
      return res.status(404).json({
        error: 'NOT_FOUND',
      });
    }
    next();
  },
  // Rate limiting (5 requests per minute per IP+userId)
  adminRateLimit,
  // Authentication (logs unauthenticated attempts)
  validateJwtToken,
  // Admin authorization (logs non-admin attempts)
  requireAdmin,
  // Handler
  async (req: AuthRequest, res: Response) => {
    try {
      const requestId = getRequestId(req);
      
      // Audit log: Access granted
      auditLog(req, 'admin.action', 'Admin health endpoint access granted', 'success', {
        resourceType: 'admin_endpoint',
        resourceId: '/api/admin/gdpr/health',
        details: {
          userId: req.userId,
          userRole: req.userRole,
        },
      });

      // Get FileDeletionJob counts by status
      const [queued, processing, failed, deleted] = await Promise.all([
        prisma.fileDeletionJob.count({ where: { status: 'QUEUED' } }),
        prisma.fileDeletionJob.count({ where: { status: 'PROCESSING' } }),
        prisma.fileDeletionJob.count({ where: { status: 'FAILED' } }),
        prisma.fileDeletionJob.count({ where: { status: 'DELETED' } }),
      ]);

      // Find oldest queued job
      const oldestQueuedJob = await prisma.fileDeletionJob.findFirst({
        where: { status: 'QUEUED' },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      });

      const oldestQueuedJobAgeHours = oldestQueuedJob
        ? Math.floor((Date.now() - oldestQueuedJob.createdAt.getTime()) / (1000 * 60 * 60))
        : null;

      // Note: Audit logs are stored as console logs, not in database
      // If migrated to DB, query oldest audit log here
      const auditLogOldestAgeDays = null; // Placeholder

      // Response: Only aggregate counts and ages (no PII, no secrets)
      res.json({
        fileDeletionJobs: {
          queued,
          processing,
          failed,
          deleted,
        },
        oldestQueuedJobAgeHours,
        auditLogOldestAgeDays,
        note: 'Audit logs are stored as console logs, not in database',
      });

    } catch (error: any) {
      // Log error without exposing sensitive details
      const errorMessage = error.message || 'Unknown error';
      console.error('[ADMIN] Error fetching GDPR health:', {
        requestId: getRequestId(req),
        endpoint: '/api/admin/gdpr/health',
        error: errorMessage,
        // Do NOT log: stack traces, SQL queries, tokens, headers
      });
      
      // Audit log: Error
      auditLog(req, 'admin.action', 'Admin health endpoint error', 'failure', {
        resourceType: 'admin_endpoint',
        resourceId: '/api/admin/gdpr/health',
        error: errorMessage,
      });
      
      // Generic error response (no sensitive details)
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch GDPR health metrics',
      });
    }
  }
);

/**
 * GET /api/admin/ops/health
 * 
 * Returns comprehensive ops health metrics:
 * - DB connectivity and latency
 * - FileDeletionJob queue stats
 * - Queue ages (oldest queued/processing jobs)
 * 
 * Protected: Admin auth required + rate limiting + feature flag
 * Production: Disabled unless ENABLE_ADMIN_HEALTH=true (returns 404)
 */
router.get('/ops/health',
  // Feature flag gate (must be first - returns 404 if disabled)
  (req: Request, res: Response, next: NextFunction) => {
    if (!isAdminHealthEnabled()) {
      auditLog(req as AuthRequest, 'admin.action', 'Admin ops health endpoint access denied - feature disabled', 'failure', {
        resourceType: 'admin_endpoint',
        resourceId: '/api/admin/ops/health',
        details: { reason: 'disabled' },
      });
      return res.status(404).json({
        error: 'NOT_FOUND',
      });
    }
    next();
  },
  // Rate limiting (5 requests per minute per IP+userId)
  adminRateLimit,
  // Authentication
  validateJwtToken,
  // Admin authorization
  requireAdmin,
  // Handler
  async (req: AuthRequest, res: Response) => {
    try {
      const requestId = getRequestId(req);
      
      // Audit log: Access granted
      auditLog(req, 'admin.action', 'Admin ops health endpoint access granted', 'success', {
        resourceType: 'admin_endpoint',
        resourceId: '/api/admin/ops/health',
        details: {
          userId: req.userId,
          userRole: req.userRole,
        },
      });

      // DB connectivity check with latency measurement
      let dbOk = false;
      let dbLatencyMs: number | undefined;
      try {
        const dbStart = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        dbLatencyMs = Date.now() - dbStart;
        dbOk = true;
      } catch (dbError: any) {
        dbOk = false;
        console.error('[OPS-HEALTH] DB check failed:', dbError.message);
      }

      // FileDeletionJob queue stats
      const [queued, processing, failed, deleted] = await Promise.all([
        prisma.fileDeletionJob.count({ where: { status: 'QUEUED' } }),
        prisma.fileDeletionJob.count({ where: { status: 'PROCESSING' } }),
        prisma.fileDeletionJob.count({ where: { status: 'FAILED' } }),
        prisma.fileDeletionJob.count({ where: { status: 'DELETED' } }),
      ]);

      // Find oldest queued job
      const oldestQueuedJob = await prisma.fileDeletionJob.findFirst({
        where: { status: 'QUEUED' },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      });

      const oldestQueuedMinutes = oldestQueuedJob
        ? Math.floor((Date.now() - oldestQueuedJob.createdAt.getTime()) / (1000 * 60))
        : null;

      // Find oldest processing job
      const oldestProcessingJob = await prisma.fileDeletionJob.findFirst({
        where: { status: 'PROCESSING' },
        orderBy: { updatedAt: 'asc' },
        select: { updatedAt: true },
      });

      const oldestProcessingMinutes = oldestProcessingJob
        ? Math.floor((Date.now() - oldestProcessingJob.updatedAt.getTime()) / (1000 * 60))
        : null;

      // Determine overall status
      let status: 'ok' | 'degraded' = 'ok';
      
      if (!dbOk) {
        status = 'degraded';
      } else if (queued > 0 && oldestQueuedMinutes !== null && oldestQueuedMinutes > 60) {
        status = 'degraded';
      } else if (processing > 0 && oldestProcessingMinutes !== null && oldestProcessingMinutes > 30) {
        status = 'degraded';
      } else if (failed > 0) {
        status = 'degraded';
      }

      // Response: Aggregate data only (no PII, no secrets)
      res.json({
        status,
        db: {
          ok: dbOk,
          latencyMs: dbLatencyMs,
        },
        fileDeletionJobs: {
          queued,
          processing,
          failed,
          deleted,
        },
        queueAges: {
          oldestQueuedMinutes,
          oldestProcessingMinutes,
        },
        time: new Date().toISOString(),
      });

    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      console.error('[ADMIN] Error fetching ops health:', {
        requestId: getRequestId(req),
        endpoint: '/api/admin/ops/health',
        error: errorMessage,
      });
      
      auditLog(req, 'admin.action', 'Admin ops health endpoint error', 'failure', {
        resourceType: 'admin_endpoint',
        resourceId: '/api/admin/ops/health',
        error: errorMessage,
      });
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch ops health metrics',
      });
    }
  }
);

export default router;

