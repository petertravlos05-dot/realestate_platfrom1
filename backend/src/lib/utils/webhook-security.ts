/**
 * Webhook security utilities
 * Handles idempotency, event deduplication, and security logging
 */

import { prisma } from '../prisma';
import Stripe from 'stripe';

/**
 * Check if webhook event has already been processed (idempotency check)
 */
export async function isEventProcessed(stripeEventId: string): Promise<boolean> {
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { stripeEventId },
  });

  return !!existingEvent;
}

/**
 * Mark webhook event as processed
 */
export async function markEventProcessed(
  event: Stripe.Event,
  status: 'PROCESSED' | 'FAILED' | 'RETRYING' = 'PROCESSED',
  errorMessage?: string
): Promise<void> {
  await prisma.webhookEvent.upsert({
    where: { stripeEventId: event.id },
    create: {
      stripeEventId: event.id,
      eventType: event.type,
      status,
      errorMessage,
      metadata: {
        livemode: event.livemode,
        apiVersion: event.api_version,
        created: event.created,
        object: event.object,
      },
    },
    update: {
      status,
      errorMessage,
      processedAt: new Date(),
    },
  });
}

/**
 * Log webhook event for security audit
 */
export function logWebhookEvent(
  event: Stripe.Event,
  action: string,
  status: 'success' | 'failure',
  details?: Record<string, any>
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: 'webhook_event',
    eventId: event.id,
    eventType: event.type,
    action,
    status,
    livemode: event.livemode,
    ...details,
  };

  // Structured logging (can be extended to use Winston/Pino)
  if (status === 'success') {
    console.log('[WEBHOOK]', JSON.stringify(logEntry));
  } else {
    console.error('[WEBHOOK ERROR]', JSON.stringify(logEntry));
  }
}

/**
 * Validate webhook signature
 */
export function validateWebhookSignature(
  stripe: Stripe,
  body: Buffer | string,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}





