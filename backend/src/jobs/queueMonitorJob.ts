/**
 * Queue Monitor Job
 * 
 * Monitors FileDeletionJob queue for stuck jobs and failures.
 * Sends low-noise Sentry alerts with stable fingerprints.
 * Uses state-change + cooldown logic to reduce alert noise.
 * 
 * Environment Variables:
 *   OPS_MONITOR_ENABLE - Enable monitoring (true|false, default: false)
 *   QUEUE_STUCK_QUEUED_MIN - Minutes before queued job is considered stuck (default: 60)
 *   QUEUE_STUCK_PROCESSING_MIN - Minutes before processing job is considered stuck (default: 30)
 *   QUEUE_FAILED_ALERT_THRESHOLD - Number of failed jobs to trigger alert (default: 1)
 *   QUEUE_NO_PROGRESS_MIN - Minutes without progress before alerting (default: 30)
 *   QUEUE_ALERT_COOLDOWN_MIN - Cooldown minutes between alerts (default: 60)
 */

import { PrismaClient } from '@prisma/client';
import * as Sentry from '@sentry/node';
import { initSentry, isSentryEnabled } from '../lib/sentry';
import { withJobLock } from '../lib/utils/jobLock';
import { shouldSendAlert } from '../lib/ops/alerting';

const prisma = new PrismaClient();

// Initialize Sentry if enabled
if (isSentryEnabled()) {
  initSentry();
}

const OPS_MONITOR_ENABLE = process.env.OPS_MONITOR_ENABLE === 'true';
const QUEUE_STUCK_QUEUED_MIN = parseInt(process.env.QUEUE_STUCK_QUEUED_MIN || '60', 10);
const QUEUE_STUCK_PROCESSING_MIN = parseInt(process.env.QUEUE_STUCK_PROCESSING_MIN || '30', 10);
const QUEUE_FAILED_ALERT_THRESHOLD = parseInt(process.env.QUEUE_FAILED_ALERT_THRESHOLD || '1', 10);
const QUEUE_NO_PROGRESS_MIN = parseInt(process.env.QUEUE_NO_PROGRESS_MIN || '30', 10);
const QUEUE_ALERT_COOLDOWN_MIN = parseInt(process.env.QUEUE_ALERT_COOLDOWN_MIN || '60', 10);

async function monitorQueue(): Promise<void> {
  if (!OPS_MONITOR_ENABLE) {
    console.log('[QUEUE-MONITOR] Monitoring disabled (OPS_MONITOR_ENABLE != true)');
    process.exit(0);
  }

  // Use job lock to prevent concurrent executions
  await withJobLock('queue-monitor', 120, async () => {
    try {
      // Get queue stats
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

      // Current snapshot for progress tracking
      const snapshot = { queued, processing, failed, deleted };

      // Check for "no progress" (processing > 0 but deleted count hasn't increased)
      let noProgressProcessing = false;
      const progressState = await prisma.opsAlertState.findUnique({
        where: { key: 'ops.queue.progress' },
      });

      if (processing > 0 && progressState?.lastValueJson) {
        try {
          const lastSnapshot = JSON.parse(progressState.lastValueJson);
          const lastDeleted = lastSnapshot.deleted || 0;
          const timeSinceUpdate = progressState.updatedAt
            ? Math.floor((Date.now() - progressState.updatedAt.getTime()) / (1000 * 60))
            : QUEUE_NO_PROGRESS_MIN + 1;

          // No progress if deleted count hasn't increased AND enough time has passed
          if (deleted === lastDeleted && timeSinceUpdate >= QUEUE_NO_PROGRESS_MIN) {
            noProgressProcessing = true;
          }
        } catch (e) {
          // Invalid JSON, ignore
        }
      }

      // Update progress snapshot
      await prisma.opsAlertState.upsert({
        where: { key: 'ops.queue.progress' },
        update: { lastValueJson: JSON.stringify(snapshot) },
        create: {
          key: 'ops.queue.progress',
          lastStatus: 'ok',
          lastValueJson: JSON.stringify(snapshot),
        },
      });

      // Check for issues
      const stuckQueued = queued > 0 && oldestQueuedMinutes !== null && oldestQueuedMinutes > QUEUE_STUCK_QUEUED_MIN;
      const stuckProcessing = processing > 0 && oldestProcessingMinutes !== null && oldestProcessingMinutes > QUEUE_STUCK_PROCESSING_MIN;
      const hasFailedJobs = failed >= QUEUE_FAILED_ALERT_THRESHOLD;

      // Handle stuck queued
      if (stuckQueued) {
        const shouldAlert = await shouldSendAlert(
          'ops.queue.stuck_queued',
          'alert',
          QUEUE_ALERT_COOLDOWN_MIN,
          { queued, oldestQueuedMinutes }
        );

        if (shouldAlert && isSentryEnabled()) {
          Sentry.withScope((scope) => {
            scope.setTag('ops', 'queue');
            scope.setTag('job', 'file_deletion');
            scope.setTag('issue', 'stuck_queued');
            scope.setFingerprint(['ops', 'queue', 'stuck_queued']);
            scope.setContext('queue_monitor', {
              queued,
              processing,
              failed,
              oldestQueuedMinutes,
              thresholds: { stuckQueuedMin: QUEUE_STUCK_QUEUED_MIN },
            });
            Sentry.captureMessage('ops.queue_issue', {
              level: 'error',
              extra: { issueType: 'stuck_queued', queued, oldestQueuedMinutes },
            });
          });
        }
        console.error('[QUEUE-MONITOR] Alert: stuck_queued', { queued, oldestQueuedMinutes });
      } else {
        await shouldSendAlert('ops.queue.stuck_queued', 'ok', QUEUE_ALERT_COOLDOWN_MIN);
      }

      // Handle stuck processing
      if (stuckProcessing) {
        const shouldAlert = await shouldSendAlert(
          'ops.queue.stuck_processing',
          'alert',
          QUEUE_ALERT_COOLDOWN_MIN,
          { processing, oldestProcessingMinutes }
        );

        if (shouldAlert && isSentryEnabled()) {
          Sentry.withScope((scope) => {
            scope.setTag('ops', 'queue');
            scope.setTag('job', 'file_deletion');
            scope.setTag('issue', 'stuck_processing');
            scope.setFingerprint(['ops', 'queue', 'stuck_processing']);
            scope.setContext('queue_monitor', {
              queued,
              processing,
              failed,
              oldestProcessingMinutes,
              thresholds: { stuckProcessingMin: QUEUE_STUCK_PROCESSING_MIN },
            });
            Sentry.captureMessage('ops.queue_issue', {
              level: 'error',
              extra: { issueType: 'stuck_processing', processing, oldestProcessingMinutes },
            });
          });
        }
        console.error('[QUEUE-MONITOR] Alert: stuck_processing', { processing, oldestProcessingMinutes });
      } else {
        await shouldSendAlert('ops.queue.stuck_processing', 'ok', QUEUE_ALERT_COOLDOWN_MIN);
      }

      // Handle failed jobs
      if (hasFailedJobs) {
        const shouldAlert = await shouldSendAlert(
          'ops.queue.failed_jobs',
          'alert',
          QUEUE_ALERT_COOLDOWN_MIN,
          { failed }
        );

        if (shouldAlert && isSentryEnabled()) {
          Sentry.withScope((scope) => {
            scope.setTag('ops', 'queue');
            scope.setTag('job', 'file_deletion');
            scope.setTag('issue', 'failed_jobs');
            scope.setFingerprint(['ops', 'queue', 'failed_jobs']);
            scope.setContext('queue_monitor', {
              queued,
              processing,
              failed,
              thresholds: { failedAlertThreshold: QUEUE_FAILED_ALERT_THRESHOLD },
            });
            Sentry.captureMessage('ops.queue_issue', {
              level: 'error',
              extra: { issueType: 'failed_jobs', failed },
            });
          });
        }
        console.error('[QUEUE-MONITOR] Alert: failed_jobs', { failed });
      } else {
        await shouldSendAlert('ops.queue.failed_jobs', 'ok', QUEUE_ALERT_COOLDOWN_MIN);
      }

      // Handle no progress
      if (noProgressProcessing) {
        const shouldAlert = await shouldSendAlert(
          'ops.queue.no_progress_processing',
          'alert',
          QUEUE_ALERT_COOLDOWN_MIN,
          { processing, deleted, noProgressMinutes: QUEUE_NO_PROGRESS_MIN }
        );

        if (shouldAlert && isSentryEnabled()) {
          Sentry.withScope((scope) => {
            scope.setTag('ops', 'queue');
            scope.setTag('issue', 'no_progress_processing');
            scope.setFingerprint(['ops', 'queue', 'no_progress_processing']);
            scope.setContext('queue_monitor', {
              processing,
              deleted,
              noProgressMinutes: QUEUE_NO_PROGRESS_MIN,
            });
            Sentry.captureMessage('ops.queue_issue', {
              level: 'error',
              extra: { issueType: 'no_progress_processing', processing, deleted },
            });
          });
        }
        console.error('[QUEUE-MONITOR] Alert: no_progress_processing', { processing, deleted });
      } else {
        await shouldSendAlert('ops.queue.no_progress_processing', 'ok', QUEUE_ALERT_COOLDOWN_MIN);
      }

      // Log summary
      if (!stuckQueued && !stuckProcessing && !hasFailedJobs && !noProgressProcessing) {
        console.log('[QUEUE-MONITOR] Queue health OK', {
          queued,
          processing,
          failed,
          deleted,
          oldestQueuedMinutes,
          oldestProcessingMinutes,
        });
      }

    } catch (error: any) {
      console.error('[QUEUE-MONITOR] Error monitoring queue:', error);
      
      if (isSentryEnabled()) {
        Sentry.captureException(error);
      }
      
      throw error;
    }
  });
}

// Run monitor
monitorQueue()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('[QUEUE-MONITOR] Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

