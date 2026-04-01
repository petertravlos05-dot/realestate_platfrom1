/**
 * Professional Real-time Events (SSE)
 * Security: Requires JWT + LAWYER/NOTARY role
 */

import { Router, Response } from 'express';
import { validateJwtToken, AuthRequest, requireRole } from '../middleware/auth';
import { sseConnectLimiter } from '../middleware/rateLimit';
import { professionalEventBus } from '../services/realtime/eventBus';
import { prisma } from '../lib/prisma';
import * as Sentry from '@sentry/node';

const router = Router();

// Track active SSE connections per user (max 3 concurrent)
const activeConnections = new Map<string, Set<string>>();
const MAX_CONCURRENT_CONNECTIONS = 3;

/**
 * GET /api/professionals/me/events
 * Server-Sent Events stream for professional requests
 */
router.get(
  '/me/events',
  sseConnectLimiter,
  validateJwtToken,
  requireRole('LAWYER', 'NOTARY'),
  async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const connectionId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const lastEventId = req.headers['last-event-id'] as string | undefined;

    try {
      // Get professional profile
      const profile = await prisma.professionalProfile.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!profile) {
        return res.status(404).json({ error: 'Professional profile not found' });
      }

      // Check concurrent connection limit
      const userConnections = activeConnections.get(userId) || new Set();
      if (userConnections.size >= MAX_CONCURRENT_CONNECTIONS) {
        return res.status(429).json({
          error: 'Too many concurrent connections',
          message: `Maximum ${MAX_CONCURRENT_CONNECTIONS} concurrent SSE connections allowed per user.`,
        });
      }

      // Track connection
      userConnections.add(connectionId);
      activeConnections.set(userId, userConnections);

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // Send initial snapshot
      const snapshot = await getProfessionalSnapshot(userId);
      res.write(`id: ${connectionId}-snapshot\n`);
      res.write(`data: ${JSON.stringify({ type: 'snapshot', ...snapshot })}\n\n`);

      // Send buffered events if lastEventId provided
      if (lastEventId) {
        const bufferedEvents = professionalEventBus.getEventsAfter(userId, lastEventId);
        for (const { id, event } of bufferedEvents) {
          res.write(`id: ${id}\n`);
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      }

      // Subscribe to professional events
      const unsubscribe = professionalEventBus.subscribeToProfessional(userId, ({ id, event }) => {
        try {
          res.write(`id: ${id}\n`);
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch (error) {
          unsubscribe();
        }
      });

      // Keep-alive ping every 25 seconds
      const keepAliveInterval = setInterval(() => {
        try {
          res.write(`: keep-alive\n\n`);
        } catch (error) {
          clearInterval(keepAliveInterval);
          unsubscribe();
        }
      }, 25000);

      // Cleanup on disconnect
      req.on('close', () => {
        clearInterval(keepAliveInterval);
        unsubscribe();
        const connections = activeConnections.get(userId);
        if (connections) {
          connections.delete(connectionId);
          if (connections.size === 0) {
            activeConnections.delete(userId);
          } else {
            activeConnections.set(userId, connections);
          }
        }
      });
    } catch (error) {
      console.error('Error setting up professional SSE connection:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'GET /api/professionals/me/events' },
        extra: { userId },
      });

      const connections = activeConnections.get(userId);
      if (connections) {
        connections.delete(connectionId);
      }

      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to establish SSE connection' });
      } else {
        res.end();
      }
    }
  }
);

/**
 * Get initial snapshot of professional state
 */
async function getProfessionalSnapshot(userId: string) {
  try {
    const profile = await prisma.professionalProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      return { pendingRequests: 0 };
    }

    const pendingRequests = await prisma.professionalRequest.count({
      where: {
        professionalId: profile.id,
        status: 'REQUESTED',
      },
    });

    return {
      professionalUserId: userId,
      counts: {
        pendingRequests,
      },
    };
  } catch (error) {
    console.error('Error getting professional snapshot:', error);
    return {
      professionalUserId: userId,
      counts: {
        pendingRequests: 0,
      },
    };
  }
}

export default router;

