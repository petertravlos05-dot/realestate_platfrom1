/**
 * Database Connectivity Monitor Job
 * 
 * Monitors database connectivity and sends alerts on failures and slow queries.
 * Sends low-noise Sentry alerts with stable fingerprints.
 * Uses state-change + cooldown logic to reduce alert noise.
 * 
 * Environment Variables:
 *   OPS_MONITOR_ENABLE - Enable monitoring (true|false, default: false)
 *   DB_TIMEOUT_MS - DB query timeout (default: 1500)
 *   DB_SLOW_THRESHOLD_MS - Latency threshold for slow alert (default: 800)
 *   DB_ALERT_COOLDOWN_MIN - Cooldown minutes between alerts (default: 30)
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
const DB_TIMEOUT_MS = parseInt(process.env.DB_TIMEOUT_MS || '1500', 10);
const DB_SLOW_THRESHOLD_MS = parseInt(process.env.DB_SLOW_THRESHOLD_MS || '800', 10);
const DB_ALERT_COOLDOWN_MIN = parseInt(process.env.DB_ALERT_COOLDOWN_MIN || '30', 10);

async function monitorDatabase(): Promise<void> {
  if (!OPS_MONITOR_ENABLE) {
    console.log('[DB-MONITOR] Monitoring disabled (OPS_MONITOR_ENABLE != true)');
    process.exit(0);
  }

  // Use job lock to prevent concurrent executions
  await withJobLock('db-monitor', 120, async () => {
    try {
      // Run DB check with timeout
      const dbCheckPromise = prisma.$queryRaw`SELECT 1`;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Database check timed out after ${DB_TIMEOUT_MS}ms`)), DB_TIMEOUT_MS);
      });

      const startTime = Date.now();
      
      try {
        await Promise.race([dbCheckPromise, timeoutPromise]);
        const latencyMs = Date.now() - startTime;
        
        // Check for slow query
        if (latencyMs >= DB_SLOW_THRESHOLD_MS) {
          const shouldAlert = await shouldSendAlert(
            'ops.db.slow',
            'alert',
            DB_ALERT_COOLDOWN_MIN,
            { latencyMs, thresholdMs: DB_SLOW_THRESHOLD_MS }
          );

          if (shouldAlert && isSentryEnabled()) {
            Sentry.withScope((scope) => {
              scope.setTag('ops', 'db');
              scope.setTag('issue', 'slow');
              scope.setFingerprint(['ops', 'db', 'slow']);
              scope.setContext('db_monitor', {
                latencyMs,
                thresholdMs: DB_SLOW_THRESHOLD_MS,
              });
              Sentry.captureMessage('ops.db_slow', {
                level: 'error',
                extra: { latencyMs, thresholdMs: DB_SLOW_THRESHOLD_MS },
              });
            });
          }
          console.warn(`[DB-MONITOR] Database slow (latency: ${latencyMs}ms, threshold: ${DB_SLOW_THRESHOLD_MS}ms)`);
        } else {
          // DB is OK and not slow
          await shouldSendAlert('ops.db.slow', 'ok', DB_ALERT_COOLDOWN_MIN);
          await shouldSendAlert('ops.db.down', 'ok', DB_ALERT_COOLDOWN_MIN);
          console.log(`[DB-MONITOR] Database health OK (latency: ${latencyMs}ms)`);
        }
      } catch (error: any) {
        const latencyMs = Date.now() - startTime;
        const errorMessage = error.message || 'Unknown database error';
        
        console.error(`[DB-MONITOR] Database check failed: ${errorMessage}`);
        
        const shouldAlert = await shouldSendAlert(
          'ops.db.down',
          'alert',
          DB_ALERT_COOLDOWN_MIN,
          { timeoutMs: DB_TIMEOUT_MS, latencyMs, error: errorMessage }
        );

        if (shouldAlert && isSentryEnabled()) {
          Sentry.withScope((scope) => {
            scope.setTag('ops', 'db');
            scope.setTag('issue', 'db_down');
            scope.setFingerprint(['ops', 'db', 'down']);
            scope.setContext('db_monitor', {
              timeoutMs: DB_TIMEOUT_MS,
              latencyMs,
              error: errorMessage,
            });
            Sentry.captureMessage('ops.db_down', {
              level: 'error',
              extra: {
                timeoutMs: DB_TIMEOUT_MS,
                latencyMs,
                error: errorMessage,
              },
            });
          });
        }
        
        throw error; // Re-throw to trigger exit(1)
      }

    } catch (error: any) {
      console.error('[DB-MONITOR] Fatal error:', error);
      
      if (isSentryEnabled()) {
        Sentry.captureException(error);
      }
      
      throw error;
    }
  });
}

// Run monitor
monitorDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('[DB-MONITOR] Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

