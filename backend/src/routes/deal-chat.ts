/**
 * Deal Chat Routes (Threads & Messages)
 * Security: CRITICAL IDOR point - every endpoint must verify thread membership
 */

import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, AuthRequest } from '../middleware/auth';
import { requireDealParticipant } from '../middleware/authorization';
import { validateBody, validateQuery } from '../middleware/validation';
import { createDirectThreadSchema, sendMessageSchema } from '../lib/validation/schemas';
import { chatMessageLimiter, generalRateLimit } from '../middleware/rateLimit';
import { auditLogger } from '../lib/utils/audit-logger';
import { ensureThreadMember, canAccessDealThread } from '../lib/utils/deal-authorization';
import { parsePagination, MAX_LIMIT } from '../lib/validation/pagination';
import { publishDealEvent } from '../services/realtime/eventBus';
import { z } from 'zod';
import * as Sentry from '@sentry/node';

const router = Router();

// GET /api/deals/:dealId/threads - List threads user is member of
router.get(
  '/deals/:dealId/threads',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;

      // Get threads where user is a member
      const threads = await prisma.dealThread.findMany({
        where: {
          dealRoomId,
          members: {
            some: { userId },
          },
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ threads });
    } catch (error) {
      console.error('Error fetching threads:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'GET /api/deals/:dealId/threads' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to fetch threads' });
    }
  }
);

// POST /api/deals/:dealId/threads/direct - Create direct thread
router.post(
  '/deals/:dealId/threads/direct',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  validateBody(createDirectThreadSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;
      const { otherUserId } = req.body;

      if (!otherUserId || typeof otherUserId !== 'string') {
        return res.status(400).json({ error: 'otherUserId is required' });
      }

      // Verify requester is a participant
      const requesterParticipant = await prisma.dealParticipant.findUnique({
        where: {
          dealRoomId_userId: {
            dealRoomId,
            userId,
          },
        },
      });

      if (!requesterParticipant || requesterParticipant.removedAt) {
        return res.status(403).json({ error: 'You are not a participant in this deal room' });
      }

      // Check if other user is a participant (directly in DealParticipant)
      let otherParticipant = await prisma.dealParticipant.findUnique({
        where: {
          dealRoomId_userId: {
            dealRoomId,
            userId: otherUserId,
          },
        },
      });

      // Fallback: if not in DealParticipant, check ACCEPTED ProfessionalRequest (handles edge cases)
      if (!otherParticipant || otherParticipant.removedAt) {
        const acceptedRequest = await prisma.professionalRequest.findFirst({
          where: {
            dealRoomId,
            status: 'ACCEPTED',
            professional: { userId: otherUserId },
          },
          include: { professional: { select: { type: true } } },
        });

        if (acceptedRequest) {
          const role = acceptedRequest.professional.type === 'LAWYER' ? 'LAWYER'
            : acceptedRequest.professional.type === 'NOTARY' ? 'NOTARY'
            : 'ENGINEER';
          otherParticipant = await prisma.dealParticipant.upsert({
            where: {
              dealRoomId_userId: { dealRoomId, userId: otherUserId },
            },
            create: { dealRoomId, userId: otherUserId, role },
            update: { removedAt: null, role },
          });
        }
      }

      if (!otherParticipant || otherParticipant.removedAt) {
        return res.status(403).json({ error: 'Other user is not a participant in this deal room' });
      }

      if (userId === otherUserId) {
        return res.status(400).json({ error: 'Cannot create direct thread with yourself' });
      }

      // Check if direct thread already exists
      const existingThread = await prisma.dealThread.findFirst({
        where: {
          dealRoomId,
          type: 'DIRECT',
          members: {
            every: {
              userId: {
                in: [userId, otherUserId],
              },
            },
          },
        },
        include: {
          members: true,
        },
      });

      // Verify it has exactly 2 members
      if (existingThread && existingThread.members.length === 2) {
        return res.json(existingThread);
      }

      // Create new direct thread
      const thread = await prisma.dealThread.create({
        data: {
          dealRoomId,
          type: 'DIRECT',
          members: {
            create: [
              { userId },
              { userId: otherUserId },
            ],
          },
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      auditLogger.threadCreated(req, thread.id, dealRoomId);

      // Publish event
      publishDealEvent(dealRoomId, {
        type: 'thread_created',
        threadId: thread.id,
        actorUserId: userId,
        summary: 'New thread created',
      });

      res.json(thread);
    } catch (error) {
      console.error('Error creating direct thread:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/threads/direct' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to create direct thread' });
    }
  }
);

// GET /api/threads/:threadId/messages - Get messages (CRITICAL IDOR CHECK)
router.get(
  '/threads/:threadId/messages',
  generalRateLimit,
  validateJwtToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const threadId = req.params.threadId;

      // CRITICAL: Verify user is thread member
      const accessResult = await canAccessDealThread(threadId, userId);
      if (!accessResult.allowed) {
        return res.status(403).json({ error: accessResult.reason || 'Access denied' });
      }

      const { limit, skip } = parsePagination(req.query);
      const cursor = req.query.cursor as string | undefined;

      const where: any = { threadId };
      if (cursor) {
        where.id = { gt: cursor };
      }

      const messages = await prisma.dealMessage.findMany({
        where,
        take: cursor ? limit + 1 : limit,
        skip: cursor ? undefined : skip,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      let nextCursor: string | undefined;
      if (cursor && messages.length > limit) {
        nextCursor = messages[limit].id;
        messages.pop();
      }

      res.json({
        items: messages,
        nextCursor,
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'GET /api/threads/:threadId/messages' },
        extra: { userId: req.userId, threadId: req.params.threadId },
      });
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }
);

// POST /api/threads/:threadId/messages - Send message (CRITICAL IDOR CHECK)
router.post(
  '/threads/:threadId/messages',
  chatMessageLimiter,
  validateJwtToken,
  validateBody(sendMessageSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const threadId = req.params.threadId;
      const { body } = req.body;

      // CRITICAL: Verify user is thread member
      const accessResult = await canAccessDealThread(threadId, userId);
      if (!accessResult.allowed) {
        return res.status(403).json({ error: accessResult.reason || 'Access denied' });
      }

      // Create message
      const message = await prisma.dealMessage.create({
        data: {
          threadId,
          senderId: userId,
          body,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Get deal room ID for audit
      const thread = await prisma.dealThread.findUnique({
        where: { id: threadId },
        select: { dealRoomId: true },
      });

      auditLogger.messageSent(req, message.id, threadId, thread?.dealRoomId || '');

      // Publish event
      if (thread?.dealRoomId) {
        publishDealEvent(thread.dealRoomId, {
          type: 'message_sent',
          threadId,
          actorUserId: userId,
          summary: 'New message sent',
          metadata: {
            messageId: message.id,
            senderName: message.sender.name,
          },
        });
      }

      res.json(message);
    } catch (error) {
      console.error('Error sending message:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/threads/:threadId/messages' },
        extra: { userId: req.userId, threadId: req.params.threadId },
      });
      res.status(500).json({ error: 'Failed to send message' });
    }
  }
);

export default router;

