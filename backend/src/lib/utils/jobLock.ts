/**
 * Job Lock Utility
 * 
 * Prevents concurrent execution of cron jobs using Postgres advisory locks.
 * Uses pg_try_advisory_lock for non-blocking lock acquisition.
 * 
 * Usage:
 *   await withJobLock('my-job-name', 120, async () => {
 *     // Job logic here
 *   });
 * 
 * If lock cannot be acquired, the function exits silently (no error).
 * This prevents overlapping cron executions.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Execute a function with a job lock
 * 
 * @param lockName Unique name for the lock (e.g., "queue-monitor")
 * @param ttlSeconds Time-to-live in seconds (for logging/debugging, not enforced by DB)
 * @param fn Function to execute if lock is acquired
 */
export async function withJobLock(
  lockName: string,
  ttlSeconds: number,
  fn: () => Promise<void>
): Promise<void> {
  // Use Postgres hashtext to convert lock name to integer for advisory lock
  // This ensures consistent lock ID across sessions
  const lockResult = await prisma.$queryRaw<Array<{ acquired: boolean }>>`
    SELECT pg_try_advisory_lock(hashtext(${lockName})) AS acquired
  `;

  const acquired = lockResult[0]?.acquired ?? false;

  if (!acquired) {
    console.log(`[JOB-LOCK] Lock "${lockName}" already held, skipping execution`);
    return;
  }

  try {
    console.log(`[JOB-LOCK] Acquired lock "${lockName}" (TTL: ${ttlSeconds}s)`);
    await fn();
  } finally {
    // Always release the lock
    try {
      await prisma.$queryRaw`
        SELECT pg_advisory_unlock(hashtext(${lockName}))
      `;
      console.log(`[JOB-LOCK] Released lock "${lockName}"`);
    } catch (error: any) {
      // Log but don't throw - lock might have been released already
      console.error(`[JOB-LOCK] Error releasing lock "${lockName}":`, error.message);
    }
  }
}



