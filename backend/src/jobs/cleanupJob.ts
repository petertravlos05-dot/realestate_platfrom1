/**
 * GDPR Data Retention Cleanup Job
 * 
 * Enforces storage limitation by deleting old operational data that is no longer needed.
 * Keeps enough for security/auditability.
 * 
 * Usage:
 *   npm run job:cleanup
 * 
 * Environment Variables:
 *   AUDIT_LOG_RETENTION_DAYS=180 (default)
 *   FILE_DELETION_JOB_DELETED_RETENTION_DAYS=30 (default)
 *   FILE_DELETION_JOB_FAILED_RETENTION_DAYS=90 (default)
 *   CLEANUP_BATCH_SIZE=500 (default)
 */

import { PrismaClient } from '@prisma/client';
import { withJobLock } from '../lib/utils/jobLock';

const prisma = new PrismaClient();

// Environment variables with defaults
const AUDIT_LOG_RETENTION_DAYS = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '180', 10);
const FILE_DELETION_JOB_DELETED_RETENTION_DAYS = parseInt(process.env.FILE_DELETION_JOB_DELETED_RETENTION_DAYS || '30', 10);
const FILE_DELETION_JOB_FAILED_RETENTION_DAYS = parseInt(process.env.FILE_DELETION_JOB_FAILED_RETENTION_DAYS || '90', 10);
const CLEANUP_BATCH_SIZE = parseInt(process.env.CLEANUP_BATCH_SIZE || '500', 10);

interface CleanupStats {
  fileDeletionJobsDeleted: number;
  fileDeletionJobsFailed: number;
  auditLogsDeleted: number;
  errors: string[];
}

/**
 * Delete old FileDeletionJob records with status='deleted'
 */
async function cleanupDeletedFileDeletionJobs(): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - FILE_DELETION_JOB_DELETED_RETENTION_DAYS);

  let totalDeleted = 0;
  let hasMore = true;

  while (hasMore) {
    // Find records to delete (batched)
    const recordsToDelete = await prisma.fileDeletionJob.findMany({
      where: {
        status: 'DELETED',
        deletedAt: {
          not: null,
          lt: cutoffDate,
        },
      },
      take: CLEANUP_BATCH_SIZE,
      select: { id: true },
    });

    if (recordsToDelete.length === 0) {
      hasMore = false;
      break;
    }

    // Delete the records
    const deleted = await prisma.fileDeletionJob.deleteMany({
      where: {
        id: {
          in: recordsToDelete.map(r => r.id),
        },
      },
    });

    totalDeleted += deleted.count;
    hasMore = recordsToDelete.length === CLEANUP_BATCH_SIZE;

    if (hasMore) {
      // Small delay to avoid long locks
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return totalDeleted;
}

/**
 * Delete old FileDeletionJob records with status='failed'
 */
async function cleanupFailedFileDeletionJobs(): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - FILE_DELETION_JOB_FAILED_RETENTION_DAYS);

  let totalDeleted = 0;
  let hasMore = true;

  while (hasMore) {
    // Find records to delete (batched)
    const recordsToDelete = await prisma.fileDeletionJob.findMany({
      where: {
        status: 'FAILED',
        updatedAt: {
          lt: cutoffDate,
        },
      },
      take: CLEANUP_BATCH_SIZE,
      select: { id: true },
    });

    if (recordsToDelete.length === 0) {
      hasMore = false;
      break;
    }

    // Delete the records
    const deleted = await prisma.fileDeletionJob.deleteMany({
      where: {
        id: {
          in: recordsToDelete.map(r => r.id),
        },
      },
    });

    totalDeleted += deleted.count;
    hasMore = recordsToDelete.length === CLEANUP_BATCH_SIZE;

    if (hasMore) {
      // Small delay to avoid long locks
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return totalDeleted;
}

/**
 * Note: Audit logs are stored as console logs (structured JSON), not in database.
 * If audit logs were stored in DB, this function would delete old records.
 * For now, this is a placeholder that returns 0.
 */
async function cleanupAuditLogs(): Promise<number> {
  // Audit logs are currently stored as console logs (structured JSON), not in database.
  // If you migrate to database storage, implement cleanup here:
  // 
  // const cutoffDate = new Date();
  // cutoffDate.setDate(cutoffDate.getDate() - AUDIT_LOG_RETENTION_DAYS);
  // 
  // let totalDeleted = 0;
  // let hasMore = true;
  // 
  // while (hasMore) {
  //   const deleted = await prisma.auditLog.deleteMany({
  //     where: {
  //       timestamp: {
  //         lt: cutoffDate,
  //       },
  //       // Exclude legally required logs if such classification exists
  //       // isLegallyRequired: false,
  //     },
  //     take: CLEANUP_BATCH_SIZE,
  //   });
  // 
  //   totalDeleted += deleted.count;
  //   hasMore = deleted.count === CLEANUP_BATCH_SIZE;
  // 
  //   if (hasMore) {
  //     await new Promise(resolve => setTimeout(resolve, 100));
  //   }
  // }
  // 
  // return totalDeleted;

  return 0; // No database cleanup needed for console logs
}

/**
 * Main cleanup function
 */
async function runCleanup(): Promise<CleanupStats> {
  const stats: CleanupStats = {
    fileDeletionJobsDeleted: 0,
    fileDeletionJobsFailed: 0,
    auditLogsDeleted: 0,
    errors: [],
  };

  const startTime = Date.now();

  console.log('[CLEANUP] Starting GDPR data retention cleanup...');
  console.log(`[CLEANUP] Configuration:`);
  console.log(`  - FileDeletionJob deleted retention: ${FILE_DELETION_JOB_DELETED_RETENTION_DAYS} days`);
  console.log(`  - FileDeletionJob failed retention: ${FILE_DELETION_JOB_FAILED_RETENTION_DAYS} days`);
  console.log(`  - Audit log retention: ${AUDIT_LOG_RETENTION_DAYS} days (console logs, no DB cleanup)`);
  console.log(`  - Batch size: ${CLEANUP_BATCH_SIZE}`);

  try {
    // Cleanup deleted FileDeletionJob records
    console.log('[CLEANUP] Cleaning up deleted FileDeletionJob records...');
    stats.fileDeletionJobsDeleted = await cleanupDeletedFileDeletionJobs();
    console.log(`[CLEANUP] Deleted ${stats.fileDeletionJobsDeleted} FileDeletionJob records (status=DELETED)`);

    // Cleanup failed FileDeletionJob records
    console.log('[CLEANUP] Cleaning up failed FileDeletionJob records...');
    stats.fileDeletionJobsFailed = await cleanupFailedFileDeletionJobs();
    console.log(`[CLEANUP] Deleted ${stats.fileDeletionJobsFailed} FileDeletionJob records (status=FAILED)`);

    // Cleanup audit logs (placeholder - currently console logs)
    console.log('[CLEANUP] Skipping audit log cleanup (stored as console logs, not in database)');
    stats.auditLogsDeleted = await cleanupAuditLogs();

    const duration = Date.now() - startTime;
    console.log(`[CLEANUP] Cleanup completed in ${duration}ms`);
    console.log(`[CLEANUP] Summary:`);
    console.log(`  - FileDeletionJob deleted: ${stats.fileDeletionJobsDeleted}`);
    console.log(`  - FileDeletionJob failed: ${stats.fileDeletionJobsFailed}`);
    console.log(`  - Audit logs deleted: ${stats.auditLogsDeleted}`);
    console.log(`  - Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.error('[CLEANUP] Errors encountered:');
      stats.errors.forEach(error => console.error(`  - ${error}`));
    }

  } catch (error: any) {
    const errorMsg = error.message || String(error);
    stats.errors.push(errorMsg);
    console.error('[CLEANUP] Fatal error during cleanup:', errorMsg);
    throw error;
  }

  return stats;
}

// Run cleanup if called directly
if (require.main === module) {
  // Use job lock to prevent concurrent executions
  withJobLock('cleanup-job', 600, async () => {
    await runCleanup();
  })
    .then(() => {
      console.log('[CLEANUP] Cleanup job completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[CLEANUP] Cleanup job failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { runCleanup, CleanupStats };

