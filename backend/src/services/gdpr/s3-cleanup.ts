/**
 * GDPR S3 File Cleanup Service (Phase 2)
 * 
 * Handles collection, queuing, and deletion of S3 files owned by deleted users.
 */

import { PrismaClient } from '@prisma/client';
import { S3Client, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { auditLog } from '../../lib/utils/audit-logger';
import { Request } from 'express';

const prisma = new PrismaClient();

// S3 Client initialization
let s3Client: S3Client | null = null;
const S3_BUCKET = process.env.AWS_S3_BUCKET;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const DRY_RUN = process.env.DRY_RUN === 'true';

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Extract S3 key from URL
 * Handles formats:
 * - https://bucket.s3.region.amazonaws.com/key
 * - https://bucket.s3-region.amazonaws.com/key
 * - /uploads/properties/file.jpg (local, skip)
 * - properties/file.jpg (already a key)
 */
function extractS3Key(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  
  // Skip local uploads
  if (url.startsWith('/uploads/') || url.startsWith('./uploads/')) {
    return null;
  }
  
  // If it's already a key (no http/https), return as-is
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return url;
  }
  
  // Extract key from S3 URL
  const s3UrlPattern = /https?:\/\/[^/]+\.s3[.-][^/]+\/(.+)/;
  const match = url.match(s3UrlPattern);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }
  
  return null;
}

/**
 * Collect all S3 keys owned by a user
 * 
 * Sources:
 * - Property.images (array of URLs)
 * - PropertyDocument.fileUrl
 * - User.image (avatar)
 * - User.companyLogo
 * - DealDocument.s3Key (deal room documents uploaded by user)
 */
export async function collectUserS3Keys(userId: string): Promise<string[]> {
  const keys = new Set<string>();
  
  try {
    // 1. Property images
    const properties = await prisma.property.findMany({
      where: { userId },
      select: { images: true },
    });
    
    for (const property of properties) {
      if (Array.isArray(property.images)) {
        for (const imageUrl of property.images) {
          const key = extractS3Key(imageUrl);
          if (key) keys.add(key);
        }
      }
    }
    
    // 2. Property documents
    const documents = await prisma.propertyDocument.findMany({
      where: { uploadedBy: userId },
      select: { fileUrl: true },
    });
    
    for (const doc of documents) {
      const key = extractS3Key(doc.fileUrl);
      if (key) keys.add(key);
    }
    
    // 3. User avatar
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true, companyLogo: true },
    });
    
    if (user?.image) {
      const key = extractS3Key(user.image);
      if (key) keys.add(key);
    }
    
    if (user?.companyLogo) {
      const key = extractS3Key(user.companyLogo);
      if (key) keys.add(key);
    }
    
    // 4. Deal Room documents (uploaded by user)
    const dealDocuments = await prisma.dealDocument.findMany({
      where: {
        uploadedById: userId,
        s3Key: { not: null },
      },
      select: { s3Key: true },
    });
    
    for (const doc of dealDocuments) {
      if (doc.s3Key) {
        // s3Key is already a key, not a URL
        keys.add(doc.s3Key);
      }
    }
    
    // 5. Also check for property-specific document paths
    // Documents are stored as: ${propertyId}/${documentType}/${filename}
    // We need to list all properties owned by user and check S3 for documents
    if (s3Client && S3_BUCKET) {
      const userProperties = await prisma.property.findMany({
        where: { userId },
        select: { id: true },
      });
      
      // Note: This is optional - if documents are tracked in DB, we already have them above
      // This is a safety net for any orphaned S3 objects
      // We'll skip this for now to avoid expensive S3 list operations
      // If needed, can be added as a separate cleanup job
    }
    
  } catch (error) {
    console.error(`[S3-CLEANUP] Error collecting S3 keys for user ${userId}:`, error);
    throw error;
  }
  
  return Array.from(keys);
}

/**
 * Enqueue S3 deletion jobs for a user
 * Creates FileDeletionJob records with status=QUEUED
 */
export async function enqueueUserS3Deletions(
  userId: string,
  keys: string[],
  req?: Request
): Promise<number> {
  if (keys.length === 0) {
    return 0;
  }
  
  let enqueuedCount = 0;
  
  try {
    // Upsert jobs (idempotent - won't duplicate if already exists)
    for (const key of keys) {
      try {
        await prisma.fileDeletionJob.upsert({
          where: {
            userId_s3Key: {
              userId,
              s3Key: key,
            },
          },
          create: {
            userId,
            s3Key: key,
            status: 'QUEUED',
            attempts: 0,
          },
          update: {
            // If already exists and not deleted, reset to QUEUED
            status: 'QUEUED',
            attempts: 0,
            lastError: null,
          },
        });
        enqueuedCount++;
      } catch (error) {
        console.error(`[S3-CLEANUP] Error enqueueing key ${key} for user ${userId}:`, error);
        // Continue with other keys
      }
    }
    
    // Audit log: Files delete queued
    if (req) {
      auditLog(req, 'dsar.files_delete_queued', 'S3 file deletion jobs queued', 'success', {
        resourceType: 's3_files',
        details: {
          userId,
          count: enqueuedCount,
        },
      });
    }
    
    console.log(`[S3-CLEANUP] Enqueued ${enqueuedCount} deletion jobs for user ${userId}`);
    
  } catch (error) {
    console.error(`[S3-CLEANUP] Error enqueueing deletions for user ${userId}:`, error);
    throw error;
  }
  
  return enqueuedCount;
}

/**
 * Process deletion queue
 * Fetches queued jobs, attempts deletion, updates status
 * 
 * @param batchSize Maximum number of jobs to process in one call
 * @param req Optional request object for audit logging
 * @returns Number of jobs processed
 */
export async function processDeletionQueue(
  batchSize: number = 50,
  req?: Request
): Promise<{ processed: number; deleted: number; failed: number }> {
  if (!s3Client || !S3_BUCKET) {
    console.warn('[S3-CLEANUP] S3 not configured, skipping deletion queue processing');
    return { processed: 0, deleted: 0, failed: 0 };
  }
  
  const MAX_ATTEMPTS = 5;
  const ERROR_MAX_LENGTH = 500; // Truncate error messages
  
  let processed = 0;
  let deleted = 0;
  let failed = 0;
  
  try {
    // Fetch queued jobs (oldest first)
    const jobs = await prisma.fileDeletionJob.findMany({
      where: {
        status: 'QUEUED',
        attempts: { lt: MAX_ATTEMPTS },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: batchSize,
    });
    
    if (jobs.length === 0) {
      return { processed: 0, deleted: 0, failed: 0 };
    }
    
    console.log(`[S3-CLEANUP] Processing ${jobs.length} deletion jobs`);
    
    for (const job of jobs) {
      processed++;
      
      try {
        // Mark as processing
        await prisma.fileDeletionJob.update({
          where: { id: job.id },
          data: { status: 'PROCESSING' },
        });
        
        // Verify file exists (optional - can skip if we trust our DB)
        let fileExists = true;
        if (!DRY_RUN) {
          try {
            await s3Client.send(new HeadObjectCommand({
              Bucket: S3_BUCKET,
              Key: job.s3Key,
            }));
          } catch (error: any) {
            if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
              fileExists = false;
              console.log(`[S3-CLEANUP] File ${job.s3Key} not found in S3, marking as deleted`);
            } else {
              throw error;
            }
          }
        }
        
        // Delete from S3 (or simulate in DRY_RUN)
        if (DRY_RUN) {
          console.log(`[S3-CLEANUP] [DRY_RUN] Would delete: ${job.s3Key}`);
        } else if (fileExists) {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key: job.s3Key,
          }));
          console.log(`[S3-CLEANUP] Deleted: ${job.s3Key}`);
        }
        
        // Mark as deleted
        await prisma.fileDeletionJob.update({
          where: { id: job.id },
          data: {
            status: 'DELETED',
            deletedAt: new Date(),
            lastError: null,
          },
        });
        
        deleted++;
        
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const truncatedError = errorMessage.length > ERROR_MAX_LENGTH
          ? errorMessage.substring(0, ERROR_MAX_LENGTH) + '...'
          : errorMessage;
        
        const newAttempts = job.attempts + 1;
        const shouldRetry = newAttempts < MAX_ATTEMPTS;
        
        await prisma.fileDeletionJob.update({
          where: { id: job.id },
          data: {
            status: shouldRetry ? 'QUEUED' : 'FAILED',
            attempts: newAttempts,
            lastError: truncatedError,
          },
        });
        
        if (shouldRetry) {
          console.warn(`[S3-CLEANUP] Failed to delete ${job.s3Key} (attempt ${newAttempts}/${MAX_ATTEMPTS}), will retry: ${truncatedError}`);
        } else {
          console.error(`[S3-CLEANUP] Failed to delete ${job.s3Key} after ${newAttempts} attempts: ${truncatedError}`);
          failed++;
          
          // Sentry: Capture S3 deletion failure (only when max attempts reached)
          try {
            const { captureS3DeletionFailure } = require('../lib/sentry');
            // Extract key prefix (never send full key)
            const keyPrefix = job.s3Key.split('/').slice(0, 2).join('/'); // e.g., "properties/image"
            captureS3DeletionFailure(
              error instanceof Error ? error : new Error(truncatedError),
              {
                bucket: S3_BUCKET || undefined,
                keyPrefix,
                attempts: newAttempts,
                maxAttempts: MAX_ATTEMPTS,
              }
            );
          } catch (sentryError) {
            // Non-fatal: Sentry capture failed, but continue processing
            console.warn('[S3-CLEANUP] Failed to capture Sentry error:', sentryError);
          }
        }
      }
    }
    
    // Audit log: Summary
    if (req && (deleted > 0 || failed > 0)) {
      if (deleted > 0) {
        auditLog(req, 'dsar.files_deleted', 'S3 files deleted', 'success', {
          resourceType: 's3_files',
          details: {
            count: deleted,
          },
        });
      }
      if (failed > 0) {
        auditLog(req, 'dsar.files_delete_failed', 'S3 file deletion failed', 'failure', {
          resourceType: 's3_files',
          details: {
            count: failed,
          },
        });
      }
    }
    
    console.log(`[S3-CLEANUP] Processed ${processed} jobs: ${deleted} deleted, ${failed} failed`);
    
  } catch (error) {
    console.error('[S3-CLEANUP] Error processing deletion queue:', error);
    throw error;
  }
  
  return { processed, deleted, failed };
}

/**
 * Get deletion queue statistics for a user
 */
export async function getDeletionQueueStats(userId: string): Promise<{
  queued: number;
  processing: number;
  deleted: number;
  failed: number;
}> {
  const [queued, processing, deleted, failed] = await Promise.all([
    prisma.fileDeletionJob.count({ where: { userId, status: 'QUEUED' } }),
    prisma.fileDeletionJob.count({ where: { userId, status: 'PROCESSING' } }),
    prisma.fileDeletionJob.count({ where: { userId, status: 'DELETED' } }),
    prisma.fileDeletionJob.count({ where: { userId, status: 'FAILED' } }),
  ]);
  
  return { queued, processing, deleted, failed };
}

