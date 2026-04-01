/**
 * Ops Alerting Helper
 * 
 * Implements state-change + cooldown logic to reduce alert noise.
 * Only sends alerts when:
 * - Status changes (ok -> alert or alert -> ok)
 * - Status is "alert" and cooldown period has expired
 * 
 * Usage:
 *   if (shouldSendAlert('ops.queue.stuck_queued', 'alert', 60, { queued: 5 })) {
 *     Sentry.captureMessage(...);
 *   }
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MAX_VALUE_JSON_LENGTH = 1000; // Cap snapshot length

/**
 * Check if alert should be sent based on state change and cooldown
 * 
 * @param key Unique alert key (e.g., "ops.queue.stuck_queued")
 * @param nextStatus Next status: "ok" | "alert"
 * @param cooldownMinutes Cooldown period in minutes (only applies when nextStatus="alert")
 * @param snapshotObj Optional snapshot object to store (will be JSON stringified)
 * @returns true if alert should be sent, false otherwise
 */
export async function shouldSendAlert(
  key: string,
  nextStatus: 'ok' | 'alert',
  cooldownMinutes: number,
  snapshotObj?: Record<string, any>
): Promise<boolean> {
  // Get current state
  const currentState = await prisma.opsAlertState.findUnique({
    where: { key },
  });

  const now = new Date();
  const lastSentAt = currentState?.lastSentAt;
  const lastStatus = currentState?.lastStatus as 'ok' | 'alert' | undefined;

  // Prepare snapshot JSON (capped length)
  let lastValueJson: string | null = null;
  if (snapshotObj) {
    const jsonStr = JSON.stringify(snapshotObj);
    lastValueJson = jsonStr.length > MAX_VALUE_JSON_LENGTH
      ? jsonStr.substring(0, MAX_VALUE_JSON_LENGTH) + '...'
      : jsonStr;
  }

  // State change: always send alert
  if (lastStatus !== nextStatus) {
    await updateAlertState(key, nextStatus, now, lastValueJson);
    return true;
  }

  // Same status: only send if "alert" and cooldown expired
  if (nextStatus === 'alert') {
    if (!lastSentAt) {
      // First time alerting
      await updateAlertState(key, nextStatus, now, lastValueJson);
      return true;
    }

    const cooldownMs = cooldownMinutes * 60 * 1000;
    const timeSinceLastSent = now.getTime() - lastSentAt.getTime();

    if (timeSinceLastSent >= cooldownMs) {
      // Cooldown expired, send alert again
      await updateAlertState(key, nextStatus, now, lastValueJson);
      return true;
    }

    // Still in cooldown, don't send
    // But update the state record (for updatedAt tracking)
    await updateAlertState(key, nextStatus, lastSentAt ?? null, lastValueJson);
    return false;
  }

  // Status is "ok": update state but don't send alert
  await updateAlertState(key, nextStatus, lastSentAt ?? null, lastValueJson);
  return false;
}

/**
 * Update alert state in database
 */
async function updateAlertState(
  key: string,
  status: 'ok' | 'alert',
  lastSentAt: Date | null,
  lastValueJson: string | null
): Promise<void> {
  await prisma.opsAlertState.upsert({
    where: { key },
    update: {
      lastStatus: status,
      lastSentAt: status === 'alert' ? lastSentAt : undefined,
      lastValueJson,
    },
    create: {
      key,
      lastStatus: status,
      lastSentAt: status === 'alert' ? lastSentAt : null,
      lastValueJson,
    },
  });
}

/**
 * Get alert state (for debugging/testing)
 */
export async function getAlertState(key: string) {
  return prisma.opsAlertState.findUnique({
    where: { key },
  });
}


