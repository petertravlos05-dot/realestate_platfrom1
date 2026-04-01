import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, AuthRequest } from '../middleware/auth';
import { exportRateLimit, exportPaginationRateLimit, strictRateLimit } from '../middleware/rateLimit';
import { collectUserDataForExport, ExportCursor, ExportLimits } from '../lib/utils/export-helpers';
import { auditLog } from '../lib/utils/audit-logger';
import { compare } from 'bcryptjs';
import { validateBody } from '../middleware/validation';
import { z } from 'zod';
import { collectUserS3Keys, enqueueUserS3Deletions } from '../services/gdpr/s3-cleanup';

const router = Router();

// GET /api/user/profile - Get current user profile
router.get('/profile', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const userEmail = req.userEmail;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] /api/user/profile - Request details:', {
        userId,
        userEmail,
        authHeader: req.headers.authorization ? 'present' : 'missing',
        timestamp: new Date().toISOString()
      });
    }

    if (!userId) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[DEBUG] /api/user/profile - No userId found in request');
      }
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        userType: true,
        phone: true,
        taxId: true,
        companyName: true,
        licenseNumber: true,
        businessAddress: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[DEBUG] /api/user/profile - User not found for userId:', userId);
      }
      return res.status(404).json({ error: 'User not found' });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] /api/user/profile - Returning user:', {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      });
    }

    res.json({ user });
  } catch (error) {
    // Safe error logging - only log safe fields
    const safeError = error instanceof Error ? {
      name: error.name,
      message: error.message,
      ...(error as any).code && { code: (error as any).code }
    } : { message: String(error) };
    
    if (process.env.NODE_ENV !== 'production') {
      console.error('[DEBUG] /api/user/profile - Error fetching user profile:', safeError);
    } else {
      console.error('Error fetching user profile:', safeError);
    }
    res.status(500).json({
      error: 'Failed to fetch user profile'
    });
  }
});

// PUT /api/user/profile - Update user profile
router.put('/profile', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name,
      phone,
      taxId,
      companyName,
      licenseNumber,
      businessAddress
    } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(taxId !== undefined && { taxId }),
        ...(companyName !== undefined && { companyName }),
        ...(licenseNumber !== undefined && { licenseNumber }),
        ...(businessAddress !== undefined && { businessAddress })
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        userType: true,
        phone: true,
        taxId: true,
        companyName: true,
        licenseNumber: true,
        businessAddress: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ user });
  } catch (error) {
    // Safe error logging - only log safe fields
    const safeError = error instanceof Error ? {
      name: error.name,
      message: error.message,
      ...(error as any).code && { code: (error as any).code }
    } : { message: String(error) };
    
    console.error('Error updating user profile:', safeError);
    res.status(500).json({
      error: 'Failed to update user profile'
    });
  }
});

/**
 * Schema for export pagination
 */
const exportSchema = z.object({
  cursor: z.object({
    messages: z.string().nullable().optional(),
    auditEvents: z.string().nullable().optional(),
    leads: z.string().nullable().optional(),
    transactions: z.string().nullable().optional(),
  }).optional(),
  limits: z.object({
    messages: z.number().int().positive().optional(),
    auditEvents: z.number().int().positive().optional(),
    leads: z.number().int().positive().optional(),
    transactions: z.number().int().positive().optional(),
  }).optional(),
}).optional();

/**
 * POST /api/user/export
 * Export user data (GDPR DSAR) - v2 with pagination and size limits
 * Protected by auth + CSRF (CSRF is applied globally) + rate limit
 */
// Middleware to select appropriate rate limiter based on request
const exportRateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const body = req.body || {};
  const hasCursor = body.cursor && Object.keys(body.cursor).length > 0;
  
  if (hasCursor) {
    return exportPaginationRateLimit(req, res, next);
  } else {
    return exportRateLimit(req, res, next);
  }
};

router.post('/export', exportRateLimitMiddleware, validateJwtToken, validateBody(exportSchema), async (req: AuthRequest, res: Response) => {
  const startTime = Date.now();
  
  try {
    const userId = req.userId;
    const body = req.body || {};
    const cursor: ExportCursor | null = body.cursor || null;
    const limits: ExportLimits | undefined = body.limits;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is deleted (auth middleware should catch this, but double-check for safety)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isDeleted: true },
    });

    if (user?.isDeleted) {
      return res.status(403).json({ 
        error: 'ACCOUNT_DELETED',
        message: 'Cannot export data for a deleted account.'
      });
    }

    // Check execution time limit
    const MAX_EXPORT_TIME_MS = parseInt(process.env.MAX_EXPORT_TIME_MS || '2000', 10);
    const MAX_EXPORT_BYTES = parseInt(process.env.MAX_EXPORT_BYTES || '2000000', 10);

    // Collect user data with pagination
    console.log(`[EXPORT] Starting export for user ${userId}${cursor ? ' (paginated)' : ''}`);
    const result = await collectUserDataForExport(userId, cursor, limits);
    console.log(`[EXPORT] Data collected successfully for user ${userId}`);

    // Build export response
    const isPartial = result.nextCursor !== null;
    // Track part number: if cursor exists, this is a continuation (part 2+), otherwise part 1
    const part = cursor ? (parseInt(req.headers['x-export-part'] as string) || 1) + 1 : 1;
    
    let exportData = {
      exportedAt: new Date().toISOString(),
      userId,
      exportVersion: 'v2',
      part: isPartial ? part : undefined,
      isPartial,
      nextCursor: result.nextCursor,
      data: result.data,
    };

    // Measure response size
    const jsonString = JSON.stringify(exportData);
    const byteSize = Buffer.byteLength(jsonString, 'utf8');
    const elapsedTime = Date.now() - startTime;

    console.log(`[EXPORT] Response size: ${byteSize} bytes, time: ${elapsedTime}ms`);

    // Check size limit
    if (byteSize > MAX_EXPORT_BYTES) {
      // Try to reduce heavy sections (dealMessages first as they can be large)
      const reductionOrder = ['dealMessages', 'messages', 'auditEvents', 'leads', 'transactions'];
      
      for (const section of reductionOrder) {
        if (exportData.data[section] && Array.isArray(exportData.data[section])) {
          // Reduce by half
          exportData.data[section] = exportData.data[section].slice(0, Math.floor(exportData.data[section].length / 2));
          
          const newJsonString = JSON.stringify(exportData);
          const newByteSize = Buffer.byteLength(newJsonString, 'utf8');
          
          if (newByteSize <= MAX_EXPORT_BYTES) {
            exportData = JSON.parse(newJsonString);
            // Mark that we have more data
            exportData.nextCursor = exportData.nextCursor || {};
            if (section === 'dealMessages') {
              exportData.nextCursor.dealMessages = 'reduced';
            } else if (section === 'messages') {
              exportData.nextCursor.messages = 'reduced';
            } else if (section === 'auditEvents') {
              exportData.nextCursor.auditEvents = 'reduced';
            } else if (section === 'leads') {
              exportData.nextCursor.leads = 'reduced';
            } else if (section === 'transactions') {
              exportData.nextCursor.transactions = 'reduced';
            }
            exportData.isPartial = true;
            break;
          }
        }
      }
      
      // If still too large, return 413
      const finalJsonString = JSON.stringify(exportData);
      const finalByteSize = Buffer.byteLength(finalJsonString, 'utf8');
      
      if (finalByteSize > MAX_EXPORT_BYTES) {
        return res.status(413).json({
          error: 'EXPORT_TOO_LARGE',
          message: 'Export data exceeds maximum size limit. Use pagination.',
          maxBytes: MAX_EXPORT_BYTES,
          currentBytes: finalByteSize,
          suggestedLimits: {
            messages: Math.floor((limits?.messages || 1000) / 2),
            dealMessages: Math.floor((limits?.dealMessages || 1000) / 2),
            auditEvents: Math.floor((limits?.auditEvents || 500) / 2),
            leads: Math.floor((limits?.leads || 500) / 2),
            transactions: Math.floor((limits?.transactions || 500) / 2),
          },
        });
      }
    }

    // Check time limit
    if (elapsedTime > MAX_EXPORT_TIME_MS) {
      console.warn(`[EXPORT] Export took ${elapsedTime}ms (limit: ${MAX_EXPORT_TIME_MS}ms)`);
    }

    // Audit log: DSAR export requested
    auditLog(req, 'dsar.export_requested', 'User data export requested', 'success', {
      resourceType: 'user_data',
      resourceId: userId,
      details: {
        isPartial,
        part,
        byteSize,
        elapsedTime,
      },
    });

    // Return JSON response
    res.json(exportData);
  } catch (error) {
    const safeError = error instanceof Error ? {
      name: error.name,
      message: error.message,
      ...(error as any).code && { code: (error as any).code }
    } : { message: String(error) };
    
    console.error('Error in export endpoint:', safeError);
    
    // Audit log: Export failed
    auditLog(req, 'dsar.export_requested', 'User data export failed', 'failure', {
      error: safeError.message,
    });
    
    // Sentry: Capture DSAR export failure
    if (error instanceof Error) {
      const { captureDSARException } = require('../lib/sentry');
      captureDSARException(error, 'export_failed');
    }
    
    res.status(500).json({
      error: 'Failed to process export request'
    });
  }
});

/**
 * Schema for account deletion
 */
const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/user/delete
 * Delete user account (GDPR Article 17 - Right to Erasure)
 * Protected by auth + CSRF (CSRF is applied globally) + rate limit
 * 
 * Phase 1: Immediate anonymization + access revocation
 * Phase 2: Hard delete S3 objects + retention cleanup (future)
 */
router.post('/delete', strictRateLimit, validateJwtToken, validateBody(deleteAccountSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { password } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true,
        isDeleted: true,
        deletedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already deleted
    if (user.isDeleted) {
      return res.status(409).json({ 
        error: 'ALREADY_DELETED',
        message: 'This account has already been deleted.'
      });
    }

    // Verify password
    const isValidPassword = await compare(password, user.password);
    if (!isValidPassword) {
      // Audit log: Failed deletion attempt
      auditLog(req, 'dsar.delete_requested', 'Account deletion failed - invalid password', 'failure', {
        error: 'Invalid password',
      });
      
      return res.status(401).json({ 
        error: 'INVALID_PASSWORD',
        message: 'Invalid password. Please try again.'
      });
    }

    // Audit log: Deletion requested (before commit)
    auditLog(req, 'dsar.delete_requested', 'Account deletion requested', 'success', {
      resourceType: 'user_account',
      resourceId: userId,
    });

    // Generate unique anonymized email
    const anonymizedEmail = `deleted+${userId}@example.invalid`;

    // Perform deletion transaction
    await prisma.$transaction(async (tx) => {
      // 1. Anonymize user PII
      await tx.user.update({
        where: { id: userId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          anonymizedAt: new Date(),
          email: anonymizedEmail,
          name: 'Deleted User',
          phone: null,
          image: null,
          companyName: null,
          companyTitle: null,
          companyTaxId: null,
          companyDou: null,
          companyPhone: null,
          companyEmail: null,
          companyHeadquarters: null,
          companyWebsite: null,
          companyWorkingHours: null,
          contactPersonName: null,
          contactPersonEmail: null,
          contactPersonPhone: null,
          companyLogo: null,
          licenseNumber: null,
          businessAddress: null,
          taxId: null,
        },
      });

      // 2. Revoke all sessions
      await tx.session.deleteMany({
        where: { userId },
      });

      // 3. Revoke OAuth accounts (if any)
      await tx.account.deleteMany({
        where: { userId },
      });
    });

    // Audit log: Deletion completed (after successful commit)
    auditLog(req, 'dsar.delete_completed', 'Account deletion completed', 'success', {
      resourceType: 'user_account',
      resourceId: userId,
    });

    // Phase 2: Queue S3 file deletions (non-blocking)
    // Do this after transaction commits, but don't block the response
    setImmediate(async () => {
      try {
        console.log(`[S3-CLEANUP] Starting S3 key collection for deleted user ${userId}`);
        const s3Keys = await collectUserS3Keys(userId);
        console.log(`[S3-CLEANUP] Found ${s3Keys.length} S3 keys for user ${userId}`);
        
        if (s3Keys.length > 0) {
          await enqueueUserS3Deletions(userId, s3Keys, req);
          console.log(`[S3-CLEANUP] Enqueued ${s3Keys.length} S3 deletion jobs for user ${userId}`);
        } else {
          console.log(`[S3-CLEANUP] No S3 keys found for user ${userId}`);
        }
      } catch (error) {
        // Log error but don't fail the deletion request
        console.error(`[S3-CLEANUP] Error queueing S3 deletions for user ${userId}:`, error);
        auditLog(req, 'dsar.files_delete_queued', 'S3 file deletion queue failed', 'failure', {
          details: {
            userId,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    });

    res.json({ 
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    const safeError = error instanceof Error ? {
      name: error.name,
      message: error.message,
      ...(error as any).code && { code: (error as any).code }
    } : { message: String(error) };
    
    console.error('Error in delete endpoint:', safeError);
    
    // Audit log: Deletion failed
    auditLog(req, 'dsar.delete_requested', 'Account deletion failed', 'failure', {
      error: safeError.message,
    });
    
    // Sentry: Capture DSAR delete failure
    if (error instanceof Error) {
      const { captureDSARException } = require('../lib/sentry');
      captureDSARException(error, 'delete_failed');
    }
    
    res.status(500).json({
      error: 'Failed to process delete request'
    });
  }
});

/**
 * GET /api/user/deletion-status
 * Get account deletion status
 * Protected by auth + CSRF (CSRF is applied globally)
 */
router.get('/deletion-status', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isDeleted: true,
        deletedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      isDeleted: user.isDeleted,
      deletedAt: user.deletedAt,
    });
  } catch (error) {
    const safeError = error instanceof Error ? {
      name: error.name,
      message: error.message,
      ...(error as any).code && { code: (error as any).code }
    } : { message: String(error) };
    
    console.error('Error in deletion-status endpoint:', safeError);
    res.status(500).json({
      error: 'Failed to fetch deletion status'
    });
  }
});

export default router;















