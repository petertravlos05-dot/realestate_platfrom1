/**
 * Deal Room Real-time Events (SSE)
 * Security: Requires JWT + deal participation check
 */

import { Router, Response } from 'express';
import { validateJwtToken, AuthRequest } from '../middleware/auth';
import { requireDealParticipant } from '../middleware/authorization';
import { sseConnectLimiter } from '../middleware/rateLimit';
import { dealEventBus } from '../services/realtime/eventBus';
import { checkDealParticipantAccess } from '../lib/utils/deal-authorization';
import { prisma } from '../lib/prisma';
import * as Sentry from '@sentry/node';

const router = Router();

// Track active SSE connections per user (max 3 concurrent)
const activeConnections = new Map<string, Set<string>>(); // userId -> Set<connectionId>
const MAX_CONCURRENT_CONNECTIONS = 3;

/**
 * GET /api/deals/:dealId/events
 * Server-Sent Events stream for deal room updates
 */
router.get(
  '/deals/:dealId/events',
  sseConnectLimiter,
  validateJwtToken,
  requireDealParticipant,
  async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const dealId = req.params.dealId;
    const connectionId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const lastEventId = req.headers['last-event-id'] as string | undefined;

    try {
      // Verify participation (requireDealParticipant middleware should handle this, but double-check)
      const accessResult = await checkDealParticipantAccess(dealId, userId, req.userRole);
      if (!accessResult.allowed) {
        return res.status(403).json({ error: accessResult.reason || 'Access denied' });
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
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

      // Send initial snapshot event
      const snapshot = await getDealSnapshot(dealId, userId);
      res.write(`id: ${connectionId}-snapshot\n`);
      res.write(`data: ${JSON.stringify({ type: 'snapshot', ...snapshot })}\n\n`);

      // Send buffered events if lastEventId provided
      if (lastEventId) {
        const bufferedEvents = dealEventBus.getEventsAfter(dealId, lastEventId);
        for (const { id, event } of bufferedEvents) {
          res.write(`id: ${id}\n`);
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      }

      // Subscribe to deal events
      const unsubscribe = dealEventBus.subscribeToDeal(dealId, ({ id, event }) => {
        try {
          res.write(`id: ${id}\n`);
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch (error) {
          // Client disconnected, stop sending
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
      console.error('Error setting up SSE connection:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'GET /api/deals/:dealId/events' },
        extra: { userId, dealId },
      });

      // Cleanup
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
 * Get initial snapshot of deal state
 */
async function getDealSnapshot(dealId: string, userId: string) {
  try {
    // Get unread message counts per thread
    const threads = await prisma.dealThread.findMany({
      where: {
        dealRoomId: dealId,
        members: {
          some: { userId },
        },
      },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    // Get pending documents count
    const pendingDocs = await prisma.dealDocument.count({
      where: {
        dealRoomId: dealId,
        status: 'REQUESTED',
      },
    });

    // Get upcoming appointments count
    const upcomingAppointments = await prisma.dealAppointment.count({
      where: {
        dealRoomId: dealId,
        status: 'CONFIRMED',
        startAt: {
          gt: new Date(),
        },
      },
    });

    // Get pending professional requests count
    const pendingRequests = await prisma.professionalRequest.count({
      where: {
        dealRoomId: dealId,
        status: 'REQUESTED',
      },
    });

    return {
      dealId,
      counts: {
        unreadMessages: 0, // TODO: Implement unread tracking if needed
        pendingDocuments: pendingDocs,
        upcomingAppointments: upcomingAppointments,
        pendingProfessionalRequests: pendingRequests,
      },
    };
  } catch (error) {
    console.error('Error getting deal snapshot:', error);
    return {
      dealId,
      counts: {
        unreadMessages: 0,
        pendingDocuments: 0,
        upcomingAppointments: 0,
        pendingProfessionalRequests: 0,
      },
    };
  }
}

export default router;

