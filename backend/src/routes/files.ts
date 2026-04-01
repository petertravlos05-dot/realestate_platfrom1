/**
 * File Access Routes
 * 
 * Provides secure file access via signed URLs with authorization checks.
 * All file access must go through these endpoints - no direct S3 URLs.
 */

import { Router, Request, Response } from 'express';
import { validateJwtToken, AuthRequest } from '../middleware/auth';
import { generateSignedUrl, canAccessPropertyFiles, extractPropertyIdFromS3Key } from '../lib/utils/s3-signed-urls';
import { auditLogger } from '../lib/utils/audit-logger';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * GET /api/files/download-url
 * 
 * Get signed URL for a file by S3 key.
 * Requires authentication and authorization check.
 * 
 * Query params:
 *   - key: S3 object key (required)
 *   - expiresIn: Expiration time in seconds (optional, default: 300)
 */
router.get('/download-url', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;
    const s3Key = req.query.key as string;
    const expiresIn = req.query.expiresIn 
      ? parseInt(req.query.expiresIn as string, 10) 
      : 300; // Default: 5 minutes

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!s3Key) {
      return res.status(400).json({ error: 'S3 key is required' });
    }

    // Validate expiresIn (between 60 seconds and 1 hour)
    if (expiresIn < 60 || expiresIn > 3600) {
      return res.status(400).json({ 
        error: 'expiresIn must be between 60 and 3600 seconds' 
      });
    }

    // Extract property ID from S3 key
    const propertyId = extractPropertyIdFromS3Key(s3Key);
    
    if (!propertyId) {
      // If we can't extract property ID, deny access (security: fail closed)
      auditLogger.authorizationFailed(
        req,
        'file',
        s3Key,
        'Cannot determine property ID from S3 key'
      );
      return res.status(403).json({ 
        error: 'Access denied: Invalid file path' 
      });
    }

    // Check authorization
    const hasAccess = await canAccessPropertyFiles(userId, userRole, propertyId);
    
    if (!hasAccess) {
      auditLogger.authorizationFailed(
        req,
        'file',
        s3Key,
        `User ${userId} does not have access to property ${propertyId}`
      );
      return res.status(403).json({ 
        error: 'Access denied: You do not have permission to access this file' 
      });
    }

    // Generate signed URL
    const signedUrl = await generateSignedUrl(s3Key, expiresIn);
    
    if (!signedUrl) {
      return res.status(500).json({ 
        error: 'S3 not configured or failed to generate signed URL' 
      });
    }

    // Calculate expiration timestamp
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Log access (without exposing sensitive data)
    auditLogger.fileAccess(req, 'File download requested', 'success', {
      fileId: s3Key.substring(s3Key.lastIndexOf('/') + 1), // Filename only
      propertyId,
      expiresIn,
    });

    res.json({
      url: signedUrl,
      expiresAt: expiresAt.toISOString(),
      expiresIn,
    });
  } catch (error) {
    console.error('[FILES] Error generating signed URL:', error);
    auditLogger.fileAccess(req, 'File download failed', 'failure', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({ error: 'Failed to generate signed URL' });
  }
});

export default router;

