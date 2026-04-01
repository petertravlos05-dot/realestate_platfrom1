/**
 * Real-time Event Bus for Deal Room
 * 
 * In-memory EventEmitter-based event bus for MVP.
 * 
 * LIMITATION: This implementation is NOT multi-instance safe.
 * For production with multiple backend instances, migrate to Redis Pub/Sub.
 * 
 * See: docs/REALTIME_PHASE3_2.md for migration guide.
 */

import { EventEmitter } from 'events';

// Runtime warning for single-instance requirement
const REALTIME_BUS = process.env.REALTIME_BUS || 'memory';
if (REALTIME_BUS === 'memory' && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  WARNING: REALTIME_BUS=memory requires single backend instance.');
  console.warn('   If deploying multiple instances, set REALTIME_BUS=redis and configure Redis.');
  console.warn('   See docs/REALTIME_PHASE3_2.md for migration guide.');
}

interface DealEvent {
  type: string;
  at: string; // ISO timestamp
  dealId: string;
  threadId?: string;
  docId?: string;
  appointmentId?: string;
  requestId?: string;
  actorUserId?: string;
  summary?: string;
  // Minimal metadata only - never include s3Key or signed URLs
  metadata?: Record<string, any>;
}

interface ProfessionalEvent {
  type: string;
  at: string; // ISO timestamp
  professionalUserId: string;
  requestId?: string;
  dealId?: string;
  actorUserId?: string;
  summary?: string;
  metadata?: Record<string, any>;
}

class DealEventBus extends EventEmitter {
  // In-memory event buffer for lastEventId support (last 200 events per deal)
  private eventBuffer: Map<string, Array<{ id: string; event: DealEvent }>> = new Map();
  private readonly MAX_BUFFER_SIZE = 200;

  /**
   * Publish event to all subscribers of a deal
   */
  publishDealEvent(dealId: string, event: DealEvent): void {
    const eventWithId = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      event: {
        ...event,
        dealId,
        at: new Date().toISOString(),
      },
    };

    // Add to buffer
    const buffer = this.eventBuffer.get(dealId) || [];
    buffer.push(eventWithId);
    if (buffer.length > this.MAX_BUFFER_SIZE) {
      buffer.shift(); // Remove oldest
    }
    this.eventBuffer.set(dealId, buffer);

    // Emit to subscribers
    this.emit(`deal:${dealId}`, eventWithId);
  }

  /**
   * Get events from buffer (for lastEventId support)
   */
  getEventsAfter(dealId: string, lastEventId?: string): Array<{ id: string; event: DealEvent }> {
    const buffer = this.eventBuffer.get(dealId) || [];
    if (!lastEventId) {
      return buffer.slice(-10); // Return last 10 events if no lastEventId
    }

    const lastIndex = buffer.findIndex((e) => e.id === lastEventId);
    if (lastIndex === -1) {
      return buffer.slice(-10); // If lastEventId not found, return last 10
    }

    return buffer.slice(lastIndex + 1);
  }

  /**
   * Subscribe to deal events
   */
  subscribeToDeal(dealId: string, callback: (event: { id: string; event: DealEvent }) => void): () => void {
    const eventName = `deal:${dealId}`;
    this.on(eventName, callback);

    // Return unsubscribe function
    return () => {
      this.off(eventName, callback);
    };
  }
}

class ProfessionalEventBus extends EventEmitter {
  // In-memory event buffer for lastEventId support
  private eventBuffer: Map<string, Array<{ id: string; event: ProfessionalEvent }>> = new Map();
  private readonly MAX_BUFFER_SIZE = 200;

  /**
   * Publish event to a specific professional user
   */
  publishProfessionalEvent(professionalUserId: string, event: ProfessionalEvent): void {
    const eventWithId = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      event: {
        ...event,
        professionalUserId,
        at: new Date().toISOString(),
      },
    };

    // Add to buffer
    const buffer = this.eventBuffer.get(professionalUserId) || [];
    buffer.push(eventWithId);
    if (buffer.length > this.MAX_BUFFER_SIZE) {
      buffer.shift();
    }
    this.eventBuffer.set(professionalUserId, buffer);

    // Emit to subscribers
    this.emit(`professional:${professionalUserId}`, eventWithId);
  }

  /**
   * Get events from buffer (for lastEventId support)
   */
  getEventsAfter(professionalUserId: string, lastEventId?: string): Array<{ id: string; event: ProfessionalEvent }> {
    const buffer = this.eventBuffer.get(professionalUserId) || [];
    if (!lastEventId) {
      return buffer.slice(-10);
    }

    const lastIndex = buffer.findIndex((e) => e.id === lastEventId);
    if (lastIndex === -1) {
      return buffer.slice(-10);
    }

    return buffer.slice(lastIndex + 1);
  }

  /**
   * Subscribe to professional events
   */
  subscribeToProfessional(
    professionalUserId: string,
    callback: (event: { id: string; event: ProfessionalEvent }) => void
  ): () => void {
    const eventName = `professional:${professionalUserId}`;
    this.on(eventName, callback);

    return () => {
      this.off(eventName, callback);
    };
  }
}

// Singleton instances
export const dealEventBus = new DealEventBus();
export const professionalEventBus = new ProfessionalEventBus();

/**
 * Helper: Publish deal event
 */
export function publishDealEvent(dealId: string, event: Omit<DealEvent, 'dealId' | 'at'>): void {
  dealEventBus.publishDealEvent(dealId, event as DealEvent);
}

/**
 * Helper: Publish professional event
 */
export function publishProfessionalEvent(
  professionalUserId: string,
  event: Omit<ProfessionalEvent, 'professionalUserId' | 'at'>
): void {
  professionalEventBus.publishProfessionalEvent(professionalUserId, event as ProfessionalEvent);
}

