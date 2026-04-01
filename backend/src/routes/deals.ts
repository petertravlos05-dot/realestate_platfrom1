/**
 * Deal Room Routes
 * Security: All endpoints require JWT + authorization + rate limiting + audit logging
 */

import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, AuthRequest } from '../middleware/auth';
import { requireDealParticipant, requireDealRole } from '../middleware/authorization';
import { validateBody, validateQuery } from '../middleware/validation';
import { createDealRoomSchema } from '../lib/validation/schemas';
import { parsePagination, createPaginationMeta, MAX_LIMIT } from '../lib/validation/pagination';
import { dealCreateLimiter, generalRateLimit, highRateLimit, professionalRequestLimiter, otpRateLimit } from '../middleware/rateLimit';
import { generateOTP } from '../lib/utils/otp';
import { sendOtpEmail, sendOtpSms } from '../lib/utils/send-otp';
import { hash } from 'bcryptjs';
import { auditLogger } from '../lib/utils/audit-logger';
import { requestProfessionalSchema } from '../lib/validation/schemas';
import { publishDealEvent, publishProfessionalEvent } from '../services/realtime/eventBus';
import { z } from 'zod';
import * as Sentry from '@sentry/node';
import { resolvePropertyImages } from '../lib/utils/property-images';

const router = Router();

type RestoreRequestInfo = {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'AUTO_RESTORED';
  requestedAt?: string;
  respondedAt?: string;
  buyerId?: string;
};

function getRestoreRequestInfoFromNotification(notification: { metadata: unknown } | null): RestoreRequestInfo | null {
  if (!notification) return null;
  const metadata = (notification.metadata || {}) as Record<string, unknown>;
  const status = String(metadata.status || '').toUpperCase();
  if (!['PENDING', 'APPROVED', 'REJECTED', 'AUTO_RESTORED'].includes(status)) return null;
  return {
    status: status as RestoreRequestInfo['status'],
    requestedAt: typeof metadata.requestedAt === 'string' ? metadata.requestedAt : undefined,
    respondedAt: typeof metadata.respondedAt === 'string' ? metadata.respondedAt : undefined,
    buyerId: typeof metadata.buyerId === 'string' ? metadata.buyerId : undefined,
  };
}

function isRentListingFromAmenities(amenities: unknown): boolean {
  if (!amenities || typeof amenities !== 'object') return false;
  const o = amenities as Record<string, unknown>;
  return String(o.listingType || o.transactionType || '').toLowerCase() === 'rent';
}

// POST /api/deals - Create or get existing deal room
router.post(
  '/',
  dealCreateLimiter,
  validateJwtToken,
  validateBody(createDealRoomSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const { propertyId } = req.body;

      // Check if property exists
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { user: true },
      });

      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }

      // Get or create deal room
      let dealRoom = await prisma.dealRoom.findUnique({
        where: {
          propertyId_buyerId: {
            propertyId,
            buyerId: userId,
          },
        },
        include: {
          participants: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          property: {
            select: {
              id: true,
              title: true,
              street: true,
              number: true,
              city: true,
              state: true,
              price: true,
              images: true,
            },
          },
        },
      });

      console.log(`[POST /api/deals] Deal room lookup:`, {
        propertyId,
        buyerId: userId,
        found: !!dealRoom,
        dealRoomId: dealRoom?.id,
        participants: dealRoom?.participants.map(p => ({
          userId: p.userId,
          role: p.role,
          removedAt: (p as any).removedAt
        }))
      });

      const isNew = !dealRoom;

      if (!dealRoom) {
        // Check for agent via PropertyLead or BuyerAgentConnection
        let agentId: string | undefined;
        const lead = await prisma.propertyLead.findFirst({
          where: {
            propertyId,
            buyerId: userId,
          },
          select: { agentId: true },
        });
        if (lead?.agentId) {
          agentId = lead.agentId;
        }

        // Create new deal room
        console.log(`[POST /api/deals] Creating new deal room:`, {
          propertyId,
          buyerId: userId,
          sellerId: property.userId,
          agentId: agentId || 'none'
        });

        dealRoom = await prisma.dealRoom.create({
          data: {
            propertyId,
            buyerId: userId,
            sellerId: property.userId,
            agentId,
            status: 'DRAFT',
            participants: {
              create: [
                { userId, role: 'BUYER' as const },
                { userId: property.userId, role: 'SELLER' as const },
                ...(agentId ? [{ userId: agentId, role: 'AGENT' as const }] : []),
              ],
            },
            threads: {
              create: [
                {
                  type: 'GROUP',
                  title: 'Group Chat',
                  members: {
                    create: [
                      { userId },
                      { userId: property.userId },
                      ...(agentId ? [{ userId: agentId }] : []),
                    ],
                  },
                },
              ],
            },
          },
          include: {
            participants: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
            property: {
              select: {
                id: true,
                title: true,
                street: true,
                number: true,
                city: true,
                state: true,
                price: true,
                images: true,
              },
            },
          },
        });

        console.log(`[POST /api/deals] ✅ Deal room created:`, {
          dealRoomId: dealRoom.id,
          participants: dealRoom.participants.map(p => ({
            userId: p.userId,
            role: p.role,
            email: p.user.email
          }))
        });

        auditLogger.dealCreated(req, dealRoom.id);
      }

      if (!dealRoom) {
        return res.status(500).json({ error: 'Failed to create or retrieve deal room' });
      }

      res.json({
        dealRoomId: dealRoom.id,
        status: dealRoom.status,
        propertyId: dealRoom.propertyId,
        buyerId: dealRoom.buyerId,
        isNew,
      });
    } catch (error) {
      console.error('Error creating deal room:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals' },
        extra: { userId: req.userId },
      });
      res.status(500).json({ error: 'Failed to create deal room' });
    }
  }
);

// GET /api/deals - List user's deal rooms (paginated) - high traffic read endpoint
router.get(
  '/',
  highRateLimit,
  validateJwtToken,
  validateQuery(
    z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED', 'CANCELLED', 'COMPLETED', 'CLOSED_PROPERTY_SOLD']).optional(),
      cursor: z.string().optional(),
    }).strict()
  ),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const { page, limit, skip } = parsePagination(req.query);
      const status = req.query.status as 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'CANCELLED' | 'COMPLETED' | 'CLOSED_PROPERTY_SOLD' | undefined;
      const cursor = req.query.cursor as string | undefined;

      const hiddenDealIds = await prisma.$queryRaw<{ dealRoomId: string }[]>`
        SELECT "dealRoomId" FROM deal_room_hidden_by_user WHERE "userId" = ${userId}
      `.then(rows => rows.map(r => r.dealRoomId)).catch(() => [] as string[]);

      const where: any = {
        OR: [
          { participants: { some: { userId, removedAt: null } } },
          { buyerId: userId },
          { sellerId: userId },
          { agentId: userId },
          { property: { userId } }, // Seller: deals for properties they own (in case sellerId was not set)
        ],
        ...(hiddenDealIds.length > 0 && { id: { notIn: hiddenDealIds } }),
        ...(status && { status }),
        ...(cursor && { id: { gt: cursor } }),
      };

      console.log(`[GET /api/deals] Fetching deal rooms for userId: ${userId}`, {
        hasStatusFilter: !!status,
        status,
        cursor,
        limit,
        where: JSON.stringify(where, null, 2)
      });

      const [dealRooms, total] = await Promise.all([
        prisma.dealRoom.findMany({
          where,
          skip: cursor ? undefined : skip,
          take: cursor ? limit + 1 : limit,
          include: {
            property: {
              select: {
                id: true,
                title: true,
                street: true,
                number: true,
                city: true,
                state: true,
                price: true,
                images: true,
                propertyType: true,
                amenities: true,
                userId: true, // For seller role detection when sellerId is null
              },
            },
            participants: {
              where: { removedAt: null },
              include: { user: { select: { id: true, name: true, email: true } } },
            },
            requests: {
              include: {
                professional: {
                  select: { userId: true },
                },
              },
            },
            offers: {
              select: {
                id: true,
                role: true,
                status: true,
                amount: true,
                createdAt: true,
              },
            },
            appointments: {
              select: {
                id: true,
                status: true,
                type: true,
                startAt: true,
                endAt: true,
              },
            },
            documents: {
              select: {
                id: true,
                category: true,
                status: true,
                requestedFromRole: true,
                requestedById: true,
                uploadedById: true,
                createdAt: true,
                updatedAt: true,
              },
              orderBy: { createdAt: 'desc' },
            },
            threads: {
              select: {
                id: true,
                type: true,
                _count: { select: { messages: true } },
              },
            },
            _count: {
              select: {
                threads: true,
                documents: true,
                appointments: true,
                requests: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        }),
        cursor ? Promise.resolve(0) : prisma.dealRoom.count({ where }),
      ]);

      let nextCursor: string | undefined;
      if (cursor && dealRooms.length > limit) {
        nextCursor = dealRooms[limit].id;
        dealRooms.pop();
      }

      console.log(`[GET /api/deals] Found ${dealRooms.length} deal rooms (total: ${total}) for userId: ${userId}`);
      if (dealRooms.length > 0) {
        console.log(`[GET /api/deals] Deal room IDs:`, dealRooms.map(d => ({
          id: d.id,
          propertyId: d.propertyId,
          status: d.status,
          participantCount: d.participants.length,
          participantUserIds: d.participants.map(p => p.userId)
        })));
      } else {
        // Debug: Check deal rooms by buyerId, sellerId, agentId
        const [buyerDeals, sellerDeals, agentDeals, allDeals] = await Promise.all([
          prisma.dealRoom.findMany({ where: { buyerId: userId }, select: { id: true, status: true }, take: 5 }),
          prisma.dealRoom.findMany({ where: { sellerId: userId }, select: { id: true, status: true }, take: 5 }),
          prisma.dealRoom.findMany({ where: { agentId: userId }, select: { id: true, status: true }, take: 5 }),
          prisma.dealRoom.findMany({ select: { id: true, buyerId: true, sellerId: true, agentId: true, status: true }, take: 10 }),
        ]);
        console.log(`[GET /api/deals] DEBUG: buyerDeals=${buyerDeals.length}, sellerDeals=${sellerDeals.length}, agentDeals=${agentDeals.length}`);
        console.log(`[GET /api/deals] DEBUG: Sample deal_rooms in DB:`, allDeals.map(d => ({ id: d.id, buyerId: d.buyerId, sellerId: d.sellerId, status: d.status })));
      }

      // For ACTIVE/DRAFT deals: check if property was sold to another buyer (has COMPLETED/CLOSED deal)
      const activeDraftPropertyIds = [...new Set(
        dealRooms
          .filter(d => d.status === 'ACTIVE' || d.status === 'DRAFT')
          .map(d => d.propertyId)
      )];
      const soldPropertyIds = activeDraftPropertyIds.length > 0
        ? new Set(
            (await prisma.dealRoom.findMany({
              where: {
                propertyId: { in: activeDraftPropertyIds },
                status: { in: ['COMPLETED', 'CLOSED'] },
              },
              select: { propertyId: true },
            })).map(d => d.propertyId)
          )
        : new Set<string>();

      const priorDepositDealIdByProperty = new Map<string, string>();
      if (activeDraftPropertyIds.length > 0) {
        const rowsWithDeposit = await prisma.dealRoom.findMany({
          where: {
            propertyId: { in: activeDraftPropertyIds },
            status: { in: ['ACTIVE', 'DRAFT'] },
            buyerCompletedDepositStepAt: { not: null },
          },
          select: { id: true, propertyId: true, buyerCompletedDepositStepAt: true },
          orderBy: { buyerCompletedDepositStepAt: 'asc' },
        });
        for (const r of rowsWithDeposit) {
          if (!priorDepositDealIdByProperty.has(r.propertyId)) {
            priorDepositDealIdByProperty.set(r.propertyId, r.id);
          }
        }
      }

      const depositHolderIds = [...new Set(priorDepositDealIdByProperty.values())];
      const priorDepositBuyerNameByPropertyId = new Map<string, string | null>();
      if (depositHolderIds.length > 0) {
        const depositDealsWithBuyer = await prisma.dealRoom.findMany({
          where: { id: { in: depositHolderIds } },
          select: {
            propertyId: true,
            participants: {
              where: { role: 'BUYER', removedAt: null },
              take: 1,
              select: { user: { select: { name: true } } },
            },
          },
        });
        for (const d of depositDealsWithBuyer) {
          const n = d.participants[0]?.user?.name?.trim() || null;
          priorDepositBuyerNameByPropertyId.set(d.propertyId, n);
        }
      }

      const sellerIds = [...new Set(
        dealRooms
          .map((d) => d.sellerId || d.property?.userId)
          .filter((id): id is string => !!id)
      )];
      const dealIdsSet = new Set(dealRooms.map((d) => d.id));
      const restoreRequestNotifications = sellerIds.length > 0
        ? await prisma.notification.findMany({
            where: {
              userId: { in: sellerIds },
              type: 'DEAL_RESTORE_REQUEST',
            },
            orderBy: { createdAt: 'desc' },
            take: 500,
          })
        : [];

      const restoreRequestByDealId = new Map<string, RestoreRequestInfo>();
      for (const notification of restoreRequestNotifications) {
        const metadata = (notification.metadata || {}) as Record<string, unknown>;
        const dealRoomId = typeof metadata.dealRoomId === 'string' ? metadata.dealRoomId : undefined;
        if (!dealRoomId || !dealIdsSet.has(dealRoomId) || restoreRequestByDealId.has(dealRoomId)) continue;
        const info = getRestoreRequestInfoFromNotification(notification);
        if (!info) continue;
        restoreRequestByDealId.set(dealRoomId, info);
      }

      const items = await Promise.all(dealRooms.map(async (deal) => {
        const propertySoldToAnother = (deal.status === 'ACTIVE' || deal.status === 'DRAFT') && soldPropertyIds.has(deal.propertyId);
        const depositHolderId = priorDepositDealIdByProperty.get(deal.propertyId);
        const blockedByPriorDeposit =
          !propertySoldToAnother &&
          !isRentListingFromAmenities(deal.property?.amenities) &&
          (deal.status === 'ACTIVE' || deal.status === 'DRAFT') &&
          !deal.buyerCompletedDepositStepAt &&
          !!depositHolderId &&
          depositHolderId !== deal.id;
        const property = deal.property!;
        const images = await resolvePropertyImages(property.images || []);
        return {
          id: deal.id,
          propertyId: deal.propertyId,
          buyerId: deal.buyerId,
          sellerId: deal.sellerId,
          agentId: deal.agentId,
          status: propertySoldToAnother ? 'CLOSED_PROPERTY_SOLD' : deal.status,
          propertySoldToAnother: propertySoldToAnother || deal.status === 'CLOSED_PROPERTY_SOLD',
          blockedByPriorDeposit,
          priorDepositBuyerName: blockedByPriorDeposit
            ? priorDepositBuyerNameByPropertyId.get(deal.propertyId) ?? null
            : null,
          buyerSigningConfirmed: deal.buyerSigningConfirmed,
          sellerSigningConfirmed: deal.sellerSigningConfirmed,
          buyerSkippedViewingAt: deal.buyerSkippedViewingAt,
          buyerConfirmedInterestAt: deal.buyerConfirmedInterestAt,
          engineerApprovedSellerDocumentsAt: deal.engineerApprovedSellerDocumentsAt,
          lawyerApprovedSellerDocumentsAt: deal.lawyerApprovedSellerDocumentsAt,
          lawyerApprovedBasicDocumentsAt: deal.lawyerApprovedBasicDocumentsAt,
          buyerLawyerCompletedBuyerFolderAt: deal.buyerLawyerCompletedBuyerFolderAt,
          buyerCompletedDepositStepAt: deal.buyerCompletedDepositStepAt,
          notaryApprovedDocumentsAt: deal.notaryApprovedDocumentsAt,
          property: { ...property, images },
          participants: deal.participants,
          requests: deal.requests,
          offers: deal.offers,
          restoreRequest: restoreRequestByDealId.get(deal.id) || null,
          rentSigningProposal: (deal as { rentSigningProposal?: unknown }).rentSigningProposal,
          rentSigningMetadata: (deal as { rentSigningMetadata?: unknown }).rentSigningMetadata,
          rentCompletionMetadata: (deal as { rentCompletionMetadata?: unknown }).rentCompletionMetadata,
          appointments: deal.appointments,
          documents: deal.documents,
          threads: deal.threads,
          counts: deal._count,
          updatedAt: deal.updatedAt,
          createdAt: deal.createdAt,
        };
      }));

      if (cursor) {
        res.json({ items, nextCursor });
      } else {
        const pagination = createPaginationMeta(page, limit, total);
        res.json({ items, pagination });
      }
    } catch (error) {
      console.error('Error fetching deal rooms:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'GET /api/deals' },
        extra: { userId: req.userId },
      });
      res.status(500).json({ error: 'Failed to fetch deal rooms' });
    }
  }
);

// GET /api/deals/appointments/batch - Get appointments for multiple deals (reduces N+1 requests) - high traffic
router.get(
  '/appointments/batch',
  highRateLimit,
  validateJwtToken,
  validateQuery(
    z.object({
      dealIds: z.string().min(1, 'dealIds required'),
    }).strict()
  ),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealIds = (req.query.dealIds as string).split(',').filter(Boolean).slice(0, 100);
      if (dealIds.length === 0) {
        return res.json({ appointmentsByDeal: {} });
      }

      // Verify user has access to each deal (participant, buyer, seller, agent, or property owner)
      const allowedDeals = await prisma.dealRoom.findMany({
        where: {
          id: { in: dealIds },
          OR: [
            { participants: { some: { userId, removedAt: null } } },
            { buyerId: userId },
            { sellerId: userId },
            { agentId: userId },
            { property: { userId } },
          ],
        },
        select: { id: true },
      });
      const filteredDealIds = allowedDeals.map((d) => d.id);

      const appointments = await prisma.dealAppointment.findMany({
        where: { dealRoomId: { in: filteredDealIds } },
        include: {
          professional: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          bookedBy: { select: { id: true, name: true } },
        },
        orderBy: { startAt: 'asc' },
      });

      const appointmentsByDeal: Record<string, typeof appointments> = {};
      for (const dealId of filteredDealIds) {
        appointmentsByDeal[dealId] = [];
      }
      for (const apt of appointments) {
        if (!appointmentsByDeal[apt.dealRoomId]) {
          appointmentsByDeal[apt.dealRoomId] = [];
        }
        appointmentsByDeal[apt.dealRoomId].push(apt);
      }

      res.json({ appointmentsByDeal });
    } catch (error) {
      console.error('Error fetching batch appointments:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'GET /api/deals/appointments/batch' },
        extra: { userId: req.userId },
      });
      res.status(500).json({ error: 'Failed to fetch appointments' });
    }
  }
);

// GET /api/deals/:id/offers - Get offers for a deal
router.get(
  '/:id/offers',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  async (req: AuthRequest, res: Response) => {
    try {
      const dealRoomId = req.params.id;
      const offers = await prisma.dealOffer.findMany({
        where: { dealRoomId },
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ offers });
    } catch (error) {
      console.error('Error fetching offers:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'GET /api/deals/:id/offers' },
        extra: { userId: req.userId, dealRoomId: req.params.id },
      });
      res.status(500).json({ error: 'Failed to fetch offers' });
    }
  }
);

// POST /api/deals/:id/offers - Create offer (buyer) or counter-offer (seller)
router.post(
  '/:id/offers',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  validateBody(
    z.object({
      amount: z.number().positive(),
      message: z.string().max(1000).optional(),
      role: z.enum(['BUYER', 'SELLER']),
    }).strict()
  ),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.id;
      const { amount, message, role } = req.body;

      const dealRoom = await prisma.dealRoom.findUnique({
        where: { id: dealRoomId },
        include: {
          property: { select: { userId: true } },
          participants: {
            where: { removedAt: null },
            select: { userId: true, role: true },
          },
        },
      });
      if (!dealRoom) {
        return res.status(404).json({ error: 'Deal room not found' });
      }
      const sellerId = dealRoom.sellerId ?? dealRoom.property?.userId;
      const isSeller = dealRoom.participants.some(p => p.role === 'SELLER' && p.userId === userId)
        || (sellerId && sellerId === userId);

      if (role === 'BUYER' && dealRoom.buyerId !== userId) {
        return res.status(403).json({ error: 'Only the buyer can submit an offer' });
      }
      if (role === 'SELLER' && !isSeller) {
        return res.status(403).json({ error: 'Only the seller can submit a counter-offer' });
      }

      const offer = await prisma.dealOffer.create({
        data: {
          dealRoomId,
          offeredBy: userId,
          role,
          amount,
          message: message || null,
          status: 'PENDING',
        },
        include: {
          user: { select: { id: true, name: true } },
        },
      });
      res.status(201).json(offer);
    } catch (error) {
      console.error('Error creating offer:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:id/offers' },
        extra: { userId: req.userId, dealRoomId: req.params.id },
      });
      res.status(500).json({ error: 'Failed to create offer' });
    }
  }
);

// PATCH /api/deals/:id/offers/:offerId - Accept or reject an offer (seller accepts buyer's / buyer accepts seller's)
router.patch(
  '/:id/offers/:offerId',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  validateBody(
    z.object({
      status: z.enum(['ACCEPTED', 'REJECTED']),
    }).strict()
  ),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.id;
      const offerId = req.params.offerId;
      const { status } = req.body;

      const dealRoom = await prisma.dealRoom.findUnique({
        where: { id: dealRoomId },
        include: {
          property: { select: { userId: true } },
          participants: {
            where: { removedAt: null },
            select: { userId: true, role: true },
          },
        },
      });
      if (!dealRoom) {
        return res.status(404).json({ error: 'Deal room not found' });
      }
      const sellerId = dealRoom.sellerId ?? dealRoom.property?.userId;
      const isSeller = dealRoom.participants.some(p => p.role === 'SELLER' && p.userId === userId)
        || (sellerId && sellerId === userId);

      const offer = await prisma.dealOffer.findFirst({
        where: { id: offerId, dealRoomId },
        include: { user: { select: { id: true, name: true } } },
      });
      if (!offer) {
        return res.status(404).json({ error: 'Offer not found' });
      }
      if (offer.status !== 'PENDING') {
        return res.status(400).json({ error: 'Offer has already been responded to' });
      }

      // Seller can accept/reject buyer's offer. Buyer can accept/reject seller's counter-offer.
      if (offer.role === 'BUYER') {
        if (!isSeller) {
          return res.status(403).json({ error: 'Only the seller can accept or reject the buyer\'s offer' });
        }
      } else if (offer.role === 'SELLER') {
        if (dealRoom.buyerId !== userId) {
          return res.status(403).json({ error: 'Only the buyer can accept or reject the seller\'s counter-offer' });
        }
      } else {
        return res.status(400).json({ error: 'Invalid offer role' });
      }

      const updated = await prisma.dealOffer.update({
        where: { id: offerId },
        data: { status },
        include: { user: { select: { id: true, name: true } } },
      });
      res.json(updated);
    } catch (error) {
      console.error('Error updating offer:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'PATCH /api/deals/:id/offers/:offerId' },
        extra: { userId: req.userId, dealRoomId: req.params.id },
      });
      res.status(500).json({ error: 'Failed to update offer' });
    }
  }
);

// GET /api/deals/:id - Get deal room details
router.get(
  '/:id',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  async (req: AuthRequest, res: Response) => {
    try {
      const dealRoomId = req.params.id;

      const dealRoom = await prisma.dealRoom.findUnique({
        where: { id: dealRoomId },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              street: true,
              number: true,
              city: true,
              state: true,
              neighborhood: true,
              price: true,
              images: true,
              propertyType: true,
              amenities: true,
              userId: true,
            },
          },
          participants: {
            where: { removedAt: null },
            include: { 
              user: { 
                select: { 
                  id: true, 
                  name: true, 
                  email: true, 
                  image: true,
                  role: true,
                  country: true,
                  professionalProfile: {
                    select: {
                      id: true,
                      displayName: true,
                      type: true,
                      city: true,
                    },
                  },
                } 
              } 
            },
          },
          requests: {
            include: {
              professional: {
                include: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
              requestedBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          threads: {
            include: {
              members: { select: { userId: true } },
              _count: { select: { messages: true } },
            },
          },
          documents: {
            select: {
              id: true,
              category: true,
              status: true,
              requestedFromRole: true,
              uploadedById: true,
              guideWhere: true,
              guideInstructions: true,
              fileName: true,
              mimeType: true,
              sizeBytes: true,
              createdAt: true,
              updatedAt: true,
              // NEVER return s3Key
            },
            orderBy: { createdAt: 'desc' },
          },
          appointments: {
            include: {
              professional: {
                include: { user: { select: { id: true, name: true } } },
              },
            },
            orderBy: { startAt: 'asc' },
          },
          offers: {
            include: {
              user: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!dealRoom) {
        return res.status(404).json({ error: 'Deal room not found' });
      }

      // Property sold to another: this deal is closed because another deal for same property completed
      const propertySoldToAnother = (dealRoom.status as string) === 'CLOSED_PROPERTY_SOLD' || (await prisma.dealRoom.count({
        where: {
          propertyId: dealRoom.propertyId,
          id: { not: dealRoomId },
          status: { in: ['COMPLETED', 'CLOSED'] },
        },
      })) > 0;

      const amenitiesForListing = dealRoom.property?.amenities;
      const isRentListing =
        amenitiesForListing &&
        typeof amenitiesForListing === 'object' &&
        String(
          (amenitiesForListing as Record<string, unknown>).listingType ||
            (amenitiesForListing as Record<string, unknown>).transactionType ||
            ''
        ).toLowerCase() === 'rent';

      let blockedByPriorDeposit = false;
      let priorDepositDealRoomId: string | null = null;
      let priorDepositBuyerName: string | null = null;

      if (
        !isRentListing &&
        !propertySoldToAnother &&
        (dealRoom.status === 'ACTIVE' || dealRoom.status === 'DRAFT') &&
        !dealRoom.buyerCompletedDepositStepAt
      ) {
        const blockingDeal = await prisma.dealRoom.findFirst({
          where: {
            propertyId: dealRoom.propertyId,
            id: { not: dealRoomId },
            status: { in: ['ACTIVE', 'DRAFT'] },
            buyerCompletedDepositStepAt: { not: null },
          },
          orderBy: { buyerCompletedDepositStepAt: 'asc' },
          include: {
            participants: {
              where: { role: 'BUYER', removedAt: null },
              take: 1,
              include: { user: { select: { name: true } } },
            },
          },
        });
        if (blockingDeal) {
          blockedByPriorDeposit = true;
          priorDepositDealRoomId = blockingDeal.id;
          const buyerP = blockingDeal.participants[0];
          priorDepositBuyerName = buyerP?.user?.name?.trim() || null;
        }
      }

      const sellerId = dealRoom.sellerId || (dealRoom.property as { userId?: string })?.userId;
      let restoreRequest: RestoreRequestInfo | null = null;
      if (sellerId) {
        const restoreNotifications = await prisma.notification.findMany({
          where: {
            userId: sellerId,
            type: 'DEAL_RESTORE_REQUEST',
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
        const latestForDeal = restoreNotifications.find((n) => {
          const metadata = (n.metadata || {}) as Record<string, unknown>;
          return metadata.dealRoomId === dealRoomId;
        }) || null;
        restoreRequest = getRestoreRequestInfoFromNotification(latestForDeal);
      }

      const dealRoomAny = dealRoom as Record<string, unknown>;
      res.json({
        ...dealRoom,
        restoreRequest,
        rentSigningProposal: dealRoomAny.rentSigningProposal,
        rentSigningMetadata: dealRoomAny.rentSigningMetadata,
        rentCompletionMetadata: dealRoomAny.rentCompletionMetadata,
        propertySoldToAnother,
        blockedByPriorDeposit,
        priorDepositDealRoomId,
        priorDepositBuyerName,
      });
    } catch (error) {
      console.error('Error fetching deal room:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'GET /api/deals/:id' },
        extra: { userId: req.userId, dealRoomId: req.params.id },
      });
      res.status(500).json({ error: 'Failed to fetch deal room' });
    }
  }
);

// POST /api/deals/:dealId/restore-interest/respond - Seller responds to restore request
router.post(
  '/:dealId/restore-interest/respond',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  validateBody(
    z.object({
      action: z.enum(['APPROVE', 'REJECT']),
    }).strict()
  ),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;
      const { action } = req.body as { action: 'APPROVE' | 'REJECT' };

      const dealRoom = await prisma.dealRoom.findUnique({
        where: { id: dealRoomId },
        include: {
          property: { select: { id: true, title: true, userId: true, amenities: true } },
          participants: { where: { removedAt: null }, select: { userId: true, role: true } },
        },
      });

      if (!dealRoom) return res.status(404).json({ error: 'Deal room not found' });

      const sellerId = dealRoom.sellerId || dealRoom.property?.userId;
      if (!sellerId || sellerId !== userId) {
        return res.status(403).json({ error: 'Only seller can respond to restore request' });
      }

      const restoreNotifications = await prisma.notification.findMany({
        where: {
          userId: sellerId,
          type: 'DEAL_RESTORE_REQUEST',
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const pendingRequest = restoreNotifications.find((n) => {
        const metadata = (n.metadata || {}) as Record<string, unknown>;
        return metadata.dealRoomId === dealRoomId && metadata.status === 'PENDING';
      });

      if (!pendingRequest) {
        return res.status(404).json({ error: 'Δεν βρέθηκε εκκρεμές αίτημα επαναφοράς' });
      }

      const metadata = (pendingRequest.metadata || {}) as Record<string, unknown>;
      const buyerId = String(metadata.buyerId || dealRoom.buyerId);
      const isRent = String(((dealRoom.property?.amenities || {}) as Record<string, unknown>).listingType || ((dealRoom.property?.amenities || {}) as Record<string, unknown>).transactionType || '').toLowerCase() === 'rent';
      const actorLabel = isRent ? 'ενοικιαστή' : 'αγοραστή';

      const updatedMetadata = {
        ...metadata,
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        respondedAt: new Date().toISOString(),
        respondedBy: sellerId,
      };

      await prisma.notification.update({
        where: { id: pendingRequest.id },
        data: {
          metadata: updatedMetadata,
          isRead: true,
        },
      });

      if (action === 'APPROVE') {
        await prisma.propertyLead.updateMany({
          where: {
            propertyId: dealRoom.propertyId,
            buyerId: buyerId,
            interestCancelled: true,
          },
          data: {
            interestCancelled: false,
            status: 'PENDING',
          },
        });

        await prisma.transaction.updateMany({
          where: {
            propertyId: dealRoom.propertyId,
            buyerId: buyerId,
            interestCancelled: true,
          },
          data: {
            interestCancelled: false,
            status: 'INTERESTED',
            stage: 'PENDING',
          },
        });

        await prisma.dealRoom.update({
          where: { id: dealRoomId },
          data: { status: 'ACTIVE' },
        });

        await prisma.notification.create({
          data: {
            userId: buyerId,
            type: 'DEAL_RESTORE_REQUEST',
            title: 'Η επαναφορά εγκρίθηκε',
            message: `Ο πωλητής αποδέχτηκε το αίτημά σας. Η συναλλαγή με το ακίνητο "${dealRoom.property?.title || 'Ακίνητο'}" επανήλθε στις ενεργές.`,
            propertyId: dealRoom.propertyId,
            metadata: {
              recipient: 'buyer',
              dealRoomId,
              status: 'APPROVED',
              respondedAt: new Date().toISOString(),
            },
          },
        });

        publishDealEvent(dealRoomId, {
          type: 'deal_restore_approved',
          actorUserId: sellerId,
          summary: `Ο πωλητής ενέκρινε την επαναφορά της συναλλαγής από τον ${actorLabel}`,
          metadata: {
            restoreStatus: 'APPROVED',
          },
        });
      } else {
        await prisma.notification.create({
          data: {
            userId: buyerId,
            type: 'DEAL_RESTORE_REQUEST',
            title: 'Η επαναφορά απορρίφθηκε',
            message: `Ο πωλητής απέρριψε το αίτημά σας για επαναφορά της συναλλαγής στο ακίνητο "${dealRoom.property?.title || 'Ακίνητο'}".`,
            propertyId: dealRoom.propertyId,
            metadata: {
              recipient: 'buyer',
              dealRoomId,
              status: 'REJECTED',
              respondedAt: new Date().toISOString(),
            },
          },
        });

        publishDealEvent(dealRoomId, {
          type: 'deal_restore_rejected',
          actorUserId: sellerId,
          summary: `Ο πωλητής απέρριψε την επαναφορά της συναλλαγής από τον ${actorLabel}`,
          metadata: {
            restoreStatus: 'REJECTED',
          },
        });
      }

      return res.json({ success: true, action });
    } catch (error) {
      console.error('Error responding to restore request:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/restore-interest/respond' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      return res.status(500).json({ error: 'Failed to respond to restore request' });
    }
  }
);

// POST /api/deals/:dealId/hide - Hide deal room from user's list (soft hide)
router.post(
  '/:dealId/hide',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;

      await prisma.$executeRaw`
        INSERT INTO deal_room_hidden_by_user (id, "dealRoomId", "userId")
        VALUES (gen_random_uuid()::text, ${dealRoomId}, ${userId})
        ON CONFLICT ("dealRoomId", "userId") DO NOTHING
      `;

      res.json({ success: true, message: 'Deal room hidden from your list' });
    } catch (error: any) {
      console.error('Error hiding deal room:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/hide' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      const msg = error?.message || '';
      if (msg.includes('does not exist') || msg.includes('relation')) {
        return res.status(503).json({
          error: 'Table deal_room_hidden_by_user not found. Run: npx prisma db execute --file prisma/add_deal_room_hidden.sql --schema prisma/schema.prisma',
        });
      }
      res.status(500).json({ error: 'Failed to hide deal room' });
    }
  }
);

// POST /api/deals/:dealId/rent-signing-proposal - Buyer proposes date/time for in-person rent contract signing
router.post(
  '/:dealId/rent-signing-proposal',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;
      const { startAt, endAt } = req.body;

      if (!startAt || !endAt) {
        return res.status(400).json({ error: 'startAt and endAt are required' });
      }

      const dealRoom = await prisma.dealRoom.findUnique({
        where: { id: dealRoomId },
        include: {
          property: { select: { amenities: true, title: true } },
          participants: { include: { user: { select: { id: true, name: true } } } },
        },
      });

      if (!dealRoom) return res.status(404).json({ error: 'Deal not found' });

      const amenities = (dealRoom.property as any)?.amenities;
      const isRent = amenities && typeof amenities === 'object' &&
        String(amenities.listingType || amenities.transactionType || '').toLowerCase() === 'rent';
      if (!isRent) {
        return res.status(400).json({ error: 'This endpoint is only for rent deals' });
      }

      const isBuyer = dealRoom.buyerId === userId;
      if (!isBuyer) {
        return res.status(403).json({ error: 'Only the buyer can propose a signing date' });
      }

      const sellerId = dealRoom.sellerId || (dealRoom.participants as any[])?.find((p: any) => p.role === 'SELLER')?.userId;

      const start = new Date(startAt);
      const end = new Date(endAt);
      if (start >= end || start < new Date()) {
        return res.status(400).json({ error: 'Invalid date/time range' });
      }

      const buyer = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      const formattedDate = start.toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const formattedTime = `${start.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}`;

      if (sellerId) {
        await prisma.notification.create({
          data: {
            userId: sellerId,
            title: 'Πρόταση ραντεβού υπογραφής',
            message: `Ο αγοραστής ${buyer?.name || 'Αγνώστου'} προτείνει ραντεβού για υπογραφή συμβολαίου: ${formattedDate}, ${formattedTime}. Επικοινωνήστε μέσω του chat για επιβεβαίωση.`,
            type: 'RENT_SIGNING_PROPOSAL',
            metadata: { dealRoomId, startAt, endAt, buyerId: userId },
          },
        });
      }

      const proposal = { startAt, endAt, buyerId: userId, formattedDate, formattedTime };
      await prisma.$executeRaw`
        UPDATE deal_rooms SET "rentSigningProposal" = ${JSON.stringify(proposal)}::jsonb WHERE id = ${dealRoomId}
      `;

      publishDealEvent(dealRoomId, {
        type: 'rent_signing_proposal',
        summary: 'Buyer proposed signing date',
        metadata: { startAt, endAt, buyerId: userId, formattedDate, formattedTime },
      });

      res.json({ success: true, message: 'Η πρόταση στάλθηκε στον ιδιοκτήτη' });
    } catch (error) {
      console.error('Error creating rent signing proposal:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/rent-signing-proposal' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to send proposal' });
    }
  }
);

// POST /api/deals/:dealId/rent-signing/notify-tenant - Seller notifies tenant that document is on gov.gr
router.post(
  '/:dealId/rent-signing/notify-tenant',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;

      const dealRoom = await prisma.dealRoom.findUnique({
        where: { id: dealRoomId },
        include: {
          property: { select: { amenities: true } },
          participants: { include: { user: { select: { id: true, name: true } } } },
        },
      });

      if (!dealRoom) return res.status(404).json({ error: 'Deal not found' });

      const amenities = (dealRoom.property as any)?.amenities;
      const isRent = amenities && typeof amenities === 'object' &&
        String(amenities.listingType || amenities.transactionType || '').toLowerCase() === 'rent';
      if (!isRent) {
        return res.status(400).json({ error: 'This endpoint is only for rent deals' });
      }

      const isSeller = dealRoom.sellerId === userId ||
        (dealRoom.participants as any[])?.some((p: any) => p.role === 'SELLER' && p.userId === userId);
      if (!isSeller) {
        return res.status(403).json({ error: 'Only the landlord can notify the tenant' });
      }

      const metadata = { landlordNotifiedTenantGovGrAt: new Date().toISOString() };
      await prisma.dealRoom.update({
        where: { id: dealRoomId },
        data: { rentSigningMetadata: metadata },
      });

      const buyerId = dealRoom.buyerId;
      if (buyerId) {
        await prisma.notification.create({
          data: {
            userId: buyerId,
            title: 'Έγγραφο προς υπογραφή στο Gov.gr',
            message: 'Ο ιδιοκτήτης ανέβασε το συμφωνητικό στο docs.gov.gr. Μεταβείτε στις Εκκρεμότητες για να το υπογράψετε.',
            type: 'RENT_LANDLORD_NOTIFIED_GOV_GR',
            metadata: { dealRoomId },
          },
        });
      }

      publishDealEvent(dealRoomId, {
        type: 'rent_landlord_notified_tenant_gov_gr',
        summary: 'Landlord notified tenant about gov.gr document',
        metadata: { dealRoomId },
      });

      res.json({ success: true, message: 'Η ειδοποίηση στάλθηκε στον ενοικιαστή' });
    } catch (error) {
      console.error('Error notifying tenant:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/rent-signing/notify-tenant' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to notify tenant' });
    }
  }
);

// POST /api/deals/:dealId/rent-myade-declaration - Seller submits the myAADE declaration number for tenant to accept
const rentMyAadeDeclarationSchema = z.object({ declarationNumber: z.string().min(1).max(50) });
router.post(
  '/:dealId/rent-myade-declaration',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  validateBody(rentMyAadeDeclarationSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;
      const { declarationNumber } = req.body;

      const dealRoom = await prisma.dealRoom.findUnique({
        where: { id: dealRoomId },
        include: { property: { select: { amenities: true } }, participants: true },
      });

      if (!dealRoom) return res.status(404).json({ error: 'Deal not found' });

      const amenities = (dealRoom.property as any)?.amenities;
      const isRent = amenities && typeof amenities === 'object' &&
        String(amenities.listingType || amenities.transactionType || '').toLowerCase() === 'rent';
      if (!isRent) {
        return res.status(400).json({ error: 'This endpoint is only for rent deals' });
      }

      const participants = dealRoom.participants as { role: string; userId: string }[] | undefined;
      const isSeller = dealRoom.sellerId === userId ||
        participants?.some((p) => p.role === 'SELLER' && p.userId === userId);
      if (!isSeller) {
        return res.status(403).json({ error: 'Only the landlord can submit the declaration number' });
      }

      const existing = ((dealRoom as any).rentCompletionMetadata as Record<string, unknown> | null) || {};
      const updated = { ...existing, sellerMyAadeDeclarationNumber: declarationNumber };

      await prisma.dealRoom.update({
        where: { id: dealRoomId },
        data: { rentCompletionMetadata: updated as any },
      });

      publishDealEvent(dealRoomId, {
        type: 'rent_seller_myade_declaration_submitted',
        summary: 'Landlord submitted myAADE declaration number',
        metadata: { dealRoomId },
      });

      res.json({ success: true, message: 'Ο αριθμός δήλωσης καταχωρήθηκε' });
    } catch (error) {
      console.error('Error submitting myAADE declaration:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/rent-myade-declaration' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to submit declaration number' });
    }
  }
);

// POST /api/deals/:dealId/rent-completion/confirm-myade - Buyer confirms they accepted in myAADE
router.post(
  '/:dealId/rent-completion/confirm-myade',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;

      const dealRoom = await prisma.dealRoom.findUnique({
        where: { id: dealRoomId },
        include: { property: { select: { amenities: true } } },
      });

      if (!dealRoom) return res.status(404).json({ error: 'Deal not found' });

      const amenities = (dealRoom.property as any)?.amenities;
      const isRent = amenities && typeof amenities === 'object' &&
        String(amenities.listingType || amenities.transactionType || '').toLowerCase() === 'rent';
      if (!isRent) {
        return res.status(400).json({ error: 'This endpoint is only for rent deals' });
      }

      if (dealRoom.buyerId !== userId) {
        return res.status(403).json({ error: 'Only the tenant can confirm myAADE acceptance' });
      }

      const existing = (dealRoom.rentCompletionMetadata as Record<string, string> | null) || {};
      const updated = { ...existing, buyerMyAadeConfirmedAt: new Date().toISOString() };

      await prisma.dealRoom.update({
        where: { id: dealRoomId },
        data: { rentCompletionMetadata: updated },
      });

      publishDealEvent(dealRoomId, {
        type: 'rent_buyer_myade_confirmed',
        summary: 'Tenant confirmed myAADE acceptance',
        metadata: { dealRoomId },
      });

      res.json({ success: true, message: 'Επιβεβαιώθηκε η αποδοχή στο myAADE' });
    } catch (error) {
      console.error('Error confirming myAADE:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/rent-completion/confirm-myade' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to confirm myAADE' });
    }
  }
);

// POST /api/deals/:dealId/rent-completion/confirm - Seller or buyer confirms deal completion
const rentCompletionConfirmSchema = z.object({ role: z.enum(['SELLER', 'BUYER']) });
router.post(
  '/:dealId/rent-completion/confirm',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  validateBody(rentCompletionConfirmSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;
      const { role } = req.body;

      const dealRoom = await prisma.dealRoom.findUnique({
        where: { id: dealRoomId },
        include: {
          property: { select: { amenities: true } },
          participants: true,
        },
      });

      if (!dealRoom) return res.status(404).json({ error: 'Deal not found' });

      const amenities = (dealRoom.property as any)?.amenities;
      const isRent = amenities && typeof amenities === 'object' &&
        String(amenities.listingType || amenities.transactionType || '').toLowerCase() === 'rent';
      if (!isRent) {
        return res.status(400).json({ error: 'This endpoint is only for rent deals' });
      }

      const participants = dealRoom.participants as { role: string; userId: string }[] | undefined;
      const isSeller = dealRoom.sellerId === userId ||
        participants?.some((p) => p.role === 'SELLER' && p.userId === userId);
      const isBuyer = dealRoom.buyerId === userId;

      if ((role === 'SELLER' && !isSeller) || (role === 'BUYER' && !isBuyer)) {
        return res.status(403).json({ error: 'Invalid role or not a participant' });
      }

      const existing = (dealRoom.rentCompletionMetadata as Record<string, string> | null) || {};
      const key = role === 'SELLER' ? 'sellerCompletionConfirmedAt' : 'buyerCompletionConfirmedAt';
      if (existing[key]) {
        return res.json({ success: true, message: 'Έχετε ήδη επιβεβαιώσει', alreadyConfirmed: true });
      }

      const updated = { ...existing, [key]: new Date().toISOString() };
      const bothConfirmed = !!(updated.sellerCompletionConfirmedAt && updated.buyerCompletionConfirmedAt);

      await prisma.dealRoom.update({
        where: { id: dealRoomId },
        data: {
          rentCompletionMetadata: updated,
          ...(bothConfirmed && { status: 'CLOSED' as const }),
        },
      });

      publishDealEvent(dealRoomId, {
        type: 'rent_completion_confirmed',
        summary: `${role} confirmed completion${bothConfirmed ? ' - Deal closed' : ''}`,
        metadata: { dealRoomId, role, bothConfirmed },
      });

      res.json({
        success: true,
        message: bothConfirmed ? 'Το Deal ολοκληρώθηκε με επιτυχία!' : 'Η επιβεβαίωση καταχωρήθηκε. Αναμένετε τον άλλο μέρος.',
        dealClosed: bothConfirmed,
      });
    } catch (error) {
      console.error('Error confirming rent completion:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/rent-completion/confirm' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to confirm completion' });
    }
  }
);

// POST /api/deals/:dealId/requests - Request professional
router.post(
  '/:dealId/requests',
  professionalRequestLimiter,
  validateJwtToken,
  requireDealRole('BUYER', 'SELLER'),
  validateBody(requestProfessionalSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;
      const { professionalId, message } = req.body;

      // Verify professional exists
      const professional = await prisma.professionalProfile.findUnique({
        where: { id: professionalId },
        include: {
          user: {
            select: { id: true, email: true, role: true },
          },
        },
      });

      if (!professional) {
        console.error(`[POST /api/deals/${dealRoomId}/requests] Professional not found: professionalId=${professionalId}`);
        return res.status(404).json({ error: 'Professional not found' });
      }

      console.log(`[POST /api/deals/${dealRoomId}/requests] Professional found: id=${professional.id}, userId=${professional.userId}, type=${professional.type}, user.email=${professional.user?.email}`);

      // Removed verification status check - allow requests to all professionals regardless of verification status

      // Check if request already exists
      const existingRequest = await prisma.professionalRequest.findUnique({
        where: {
          dealRoomId_professionalId: {
            dealRoomId,
            professionalId,
          },
        },
      });

      if (existingRequest) {
        return res.status(400).json({ error: 'Request already exists' });
      }

      console.log(`[POST /api/deals/${dealRoomId}/requests] Creating request: professionalId=${professionalId}, userId=${userId}, professional.userId=${professional.userId}, type=${professional.type}`);

      // Check current participants before creating request
      const participantsBefore = await prisma.dealParticipant.findMany({
        where: { dealRoomId, removedAt: null },
        select: { id: true, userId: true, role: true, removedAt: true },
      });
      console.log(`[POST /api/deals/${dealRoomId}/requests] Participants before request:`, participantsBefore.map(p => ({ userId: p.userId, role: p.role, removedAt: p.removedAt })));

      // Create request
      const request = await prisma.professionalRequest.create({
        data: {
          dealRoomId,
          professionalId,
          requestedById: userId,
          type: professional.type,
          status: 'REQUESTED',
          message: message || null,
        },
        include: {
          professional: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      auditLogger.professionalRequested(req, dealRoomId, professionalId);

      console.log(`[POST /api/deals/${dealRoomId}/requests] Request created: id=${request.id}, professionalId=${request.professionalId}, status=${request.status}`);

      // Check participants after creating request
      const participantsAfter = await prisma.dealParticipant.findMany({
        where: { dealRoomId },
        select: { id: true, userId: true, role: true, removedAt: true },
      });
      console.log(`[POST /api/deals/${dealRoomId}/requests] Participants after request:`, participantsAfter.map(p => ({ userId: p.userId, role: p.role, removedAt: p.removedAt })));

      // Publish events
      publishDealEvent(dealRoomId, {
        type: 'professional_requested',
        requestId: request.id,
        actorUserId: userId,
        summary: `Professional ${request.type} requested`,
        metadata: {
          type: request.type,
        },
      });

      // Also publish to professional's event stream
      if (professional.userId) {
        publishProfessionalEvent(professional.userId, {
          type: 'request_received',
          requestId: request.id,
          dealId: dealRoomId,
          actorUserId: userId,
          summary: `New ${request.type} request received`,
        });
      }

      res.json(request);
    } catch (error) {
      console.error('Error creating professional request:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/requests' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to create professional request' });
    }
  }
);

// Professional invite schemas
const inviteProfessionalSchema = z.object({
  type: z.enum(['LAWYER', 'ENGINEER']),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  registrationNumber: z.string().optional(),
  sendOtpTo: z.enum(['email', 'phone']),
}).strict();

const verifyInviteSchema = z.object({
  inviteId: z.string(),
  otpCode: z.string().min(6),
}).strict();

// POST /api/deals/:dealId/invite-professional/verify - Must be before invite-professional (more specific)
router.post(
  '/:dealId/invite-professional/verify',
  otpRateLimit,
  validateJwtToken,
  requireDealRole('SELLER'),
  validateBody(verifyInviteSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;
      const { inviteId, otpCode } = req.body;

      const invite = await prisma.professionalInvite.findFirst({
        where: { id: inviteId, dealRoomId, requestedById: userId },
      });
      if (!invite) return res.status(404).json({ error: 'Αίτημα δεν βρέθηκε' });
      if (invite.verifiedAt) return res.status(400).json({ error: 'Το αίτημα έχει ήδη επαληθευτεί' });
      if (!invite.otpExpires || invite.otpExpires < new Date()) {
        return res.status(400).json({ error: 'Το OTP έχει λήξει' });
      }
      if (invite.otpCode !== otpCode) {
        return res.status(400).json({ error: 'Λάθος κωδικός OTP' });
      }

      let professionalUserId: string;
      let professionalProfileId: string;

      const existingUser = await prisma.user.findUnique({
        where: { email: invite.email },
        include: { professionalProfile: true },
      });

      if (existingUser) {
        professionalUserId = existingUser.id;
        if (existingUser.professionalProfile) {
          if (existingUser.professionalProfile.type !== invite.type) {
            return res.status(400).json({
              error: `Ο χρήστης είναι ήδη ${existingUser.professionalProfile.type === 'LAWYER' ? 'δικηγόρος' : 'μηχανικός'}. Δεν μπορεί να προστεθεί ως ${invite.type === 'LAWYER' ? 'δικηγόρος' : 'μηχανικός'}.`,
            });
          }
          professionalProfileId = existingUser.professionalProfile.id;
        } else {
          const profile = await prisma.professionalProfile.create({
            data: {
              userId: existingUser.id,
              type: invite.type,
              displayName: invite.name,
              phone: invite.phone,
              services: invite.registrationNumber ? { registryNumber: invite.registrationNumber } : {},
              languages: ['Greek'],
              verificationStatus: 'VERIFIED',
              verifiedAt: new Date(),
            },
          });
          professionalProfileId = profile.id;
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { role: invite.type },
          });
        }
      } else {
        const tempPassword = await hash(Math.random().toString(36).slice(-12) + 'A1!', 12);
        const newUser = await prisma.user.create({
          data: {
            name: invite.name,
            email: invite.email,
            password: tempPassword,
            role: invite.type,
            phone: invite.phone,
          },
        });
        professionalUserId = newUser.id;
        const profile = await prisma.professionalProfile.create({
          data: {
            userId: newUser.id,
            type: invite.type,
            displayName: invite.name,
            phone: invite.phone,
            services: invite.registrationNumber ? { registryNumber: invite.registrationNumber } : {},
            languages: ['Greek'],
            verificationStatus: 'VERIFIED',
            verifiedAt: new Date(),
          },
        });
        professionalProfileId = profile.id;
      }

      const participantRole = invite.type === 'LAWYER' ? 'LAWYER' : 'ENGINEER';
      await prisma.dealParticipant.upsert({
        where: { dealRoomId_userId: { dealRoomId, userId: professionalUserId } },
        create: { dealRoomId, userId: professionalUserId, role: participantRole },
        update: { removedAt: null, role: participantRole },
      });

      await prisma.professionalRequest.create({
        data: {
          dealRoomId,
          professionalId: professionalProfileId,
          requestedById: userId,
          type: invite.type,
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
      });

      const groupThread = await prisma.dealThread.findFirst({
        where: { dealRoomId, type: 'GROUP' },
      });
      if (groupThread) {
        await prisma.dealThreadMember.upsert({
          where: { threadId_userId: { threadId: groupThread.id, userId: professionalUserId } },
          create: { threadId: groupThread.id, userId: professionalUserId },
          update: {},
        });
      }

      const existingDirect = await prisma.dealThread.findFirst({
        where: {
          dealRoomId,
          type: 'DIRECT',
          AND: [
            { members: { some: { userId } } },
            { members: { some: { userId: professionalUserId } } },
          ],
        },
        include: { _count: { select: { members: true } } },
      });
      const hasDirectThread = existingDirect && existingDirect._count.members === 2;
      if (!hasDirectThread) {
        await prisma.dealThread.create({
          data: {
            dealRoomId,
            type: 'DIRECT',
            members: {
              create: [
                { userId },
                { userId: professionalUserId },
              ],
            },
          },
        });
      }

      await prisma.professionalInvite.update({
        where: { id: inviteId },
        data: {
          verifiedAt: new Date(),
          linkedUserId: professionalUserId,
          linkedProfessionalId: professionalProfileId,
          otpCode: null,
          otpExpires: null,
        },
      });

      publishDealEvent(dealRoomId, {
        type: 'professional_accepted',
        actorUserId: userId,
        summary: `${invite.type === 'LAWYER' ? 'Δικηγόρος' : 'Μηχανικός'} προστέθηκε επιτυχώς`,
        metadata: { type: invite.type },
      });

      res.json({
        success: true,
        message: invite.type === 'LAWYER' ? 'Ο δικηγόρος προστέθηκε στο deal room' : 'Ο μηχανικός προστέθηκε στο deal room',
      });
    } catch (error) {
      console.error('Error verifying professional invite:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/invite-professional/verify' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Αποτυχία επαλήθευσης' });
    }
  }
);

// POST /api/deals/:dealId/invite-professional - Seller invites lawyer/engineer by details, sends OTP
router.post(
  '/:dealId/invite-professional',
  otpRateLimit,
  validateJwtToken,
  requireDealRole('SELLER'),
  validateBody(inviteProfessionalSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;
      const { type, name, email, phone, registrationNumber, sendOtpTo } = req.body;

      const dealRoom = await prisma.dealRoom.findUnique({
        where: { id: dealRoomId },
        include: { participants: true },
      });
      if (!dealRoom) return res.status(404).json({ error: 'Deal room not found' });

      if (sendOtpTo === 'phone' && !phone) {
        return res.status(400).json({ error: 'Τηλέφωνο απαιτείται για αποστολή OTP' });
      }

      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

      const invite = await prisma.professionalInvite.create({
        data: {
          dealRoomId,
          type,
          name,
          email,
          phone: phone || null,
          registrationNumber: registrationNumber || null,
          sendOtpTo,
          otpCode: otp,
          otpExpires,
          requestedById: userId,
        },
      });

      if (sendOtpTo === 'email') {
        await sendOtpEmail(email, otp);
      } else {
        await sendOtpSms(phone!, otp);
      }

      res.json({ inviteId: invite.id, message: 'OTP στάλθηκε' });
    } catch (error: any) {
      console.error('Error inviting professional:', error);
      console.error('Error details:', error?.message, error?.stack);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/invite-professional' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      const msg = error?.message || 'Αποτυχία αποστολής OTP';
      res.status(500).json({ error: msg });
    }
  }
);

// POST /api/deals/:dealId/requests/:requestId/accept - Accept professional request
router.post(
  '/:dealId/requests/:requestId/accept',
  generalRateLimit,
  validateJwtToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;
      const requestId = req.params.requestId;

      // Get request
      const request = await prisma.professionalRequest.findUnique({
        where: { id: requestId },
        include: {
          professional: {
            select: { userId: true, type: true },
          },
        },
      });

      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }

      if (request.dealRoomId !== dealRoomId) {
        return res.status(400).json({ error: 'Request does not belong to this deal room' });
      }

      // Verify user is the professional
      if (request.professional.userId !== userId) {
        return res.status(403).json({ error: 'Only the professional can accept requests' });
      }

      // Update request status
      const updatedRequest = await prisma.professionalRequest.update({
        where: { id: requestId },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
      });

      // Add professional as participant (update role so engineer is never stored as NOTARY)
      const participantRole = request.type === 'LAWYER' ? 'LAWYER' : request.type === 'NOTARY' ? 'NOTARY' : 'ENGINEER';
      await prisma.dealParticipant.upsert({
        where: {
          dealRoomId_userId: {
            dealRoomId,
            userId: request.professional.userId,
          },
        },
        create: {
          dealRoomId,
          userId: request.professional.userId,
          role: participantRole,
        },
        update: {
          removedAt: null,
          role: participantRole, // Ensure role matches the request type (e.g. engineer stays ENGINEER)
        },
      });

      // Add professional to GROUP thread
      const groupThread = await prisma.dealThread.findFirst({
        where: {
          dealRoomId,
          type: 'GROUP',
        },
      });

      if (groupThread) {
        await prisma.dealThreadMember.upsert({
          where: {
            threadId_userId: {
              threadId: groupThread.id,
              userId: request.professional.userId,
            },
          },
          create: {
            threadId: groupThread.id,
            userId: request.professional.userId,
          },
          update: {},
        });
      }

      // Create DIRECT thread between the requester (requestedById) and professional
      // - Engineer: always requested by seller → seller ↔ engineer
      // - Lawyer: requested by buyer or seller → requester ↔ lawyer
      // - Notary: typically requested by buyer → requester ↔ notary
      const requesterId = request.requestedById;
      const requesterParticipant = await prisma.dealParticipant.findFirst({
        where: {
          dealRoomId,
          userId: requesterId,
          removedAt: null,
        },
      });

      if (requesterParticipant) {
        const existingDirectThread = await prisma.dealThread.findFirst({
          where: {
            dealRoomId,
            type: 'DIRECT',
            members: {
              every: {
                userId: {
                  in: [requesterId, request.professional.userId],
                },
              },
            },
          },
        });

        if (!existingDirectThread) {
          await prisma.dealThread.create({
            data: {
              dealRoomId,
              type: 'DIRECT',
              members: {
                create: [
                  { userId: requesterId },
                  { userId: request.professional.userId },
                ],
              },
            },
          });
        }
      }

      auditLogger.professionalAccepted(req, dealRoomId, request.professionalId);

      // Publish events
      publishDealEvent(dealRoomId, {
        type: 'professional_accepted',
        requestId: updatedRequest.id,
        actorUserId: userId,
        summary: `Professional ${request.type} accepted`,
        metadata: {
          type: request.type,
        },
      });

      res.json(updatedRequest);
    } catch (error) {
      console.error('Error accepting professional request:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/requests/:requestId/accept' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to accept professional request' });
    }
  }
);

// POST /api/deals/:dealId/requests/:requestId/decline - Decline professional request
router.post(
  '/:dealId/requests/:requestId/decline',
  generalRateLimit,
  validateJwtToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;
      const requestId = req.params.requestId;

      // Get request
      const request = await prisma.professionalRequest.findUnique({
        where: { id: requestId },
        include: {
          professional: {
            select: { userId: true },
          },
        },
      });

      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }

      if (request.dealRoomId !== dealRoomId) {
        return res.status(400).json({ error: 'Request does not belong to this deal room' });
      }

      // Verify user is the professional
      if (request.professional.userId !== userId) {
        return res.status(403).json({ error: 'Only the professional can decline requests' });
      }

      // Update request status
      const updatedRequest = await prisma.professionalRequest.update({
        where: { id: requestId },
        data: {
          status: 'DECLINED',
          respondedAt: new Date(),
        },
      });

      auditLogger.professionalDeclined(req, dealRoomId, request.professionalId);

      // Publish events
      publishDealEvent(dealRoomId, {
        type: 'professional_declined',
        requestId: updatedRequest.id,
        actorUserId: userId,
        summary: `Professional ${request.type} declined`,
        metadata: {
          type: request.type,
        },
      });

      res.json(updatedRequest);
    } catch (error) {
      console.error('Error declining professional request:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/requests/:requestId/decline' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to decline professional request' });
    }
  }
);

// POST /api/deals/:dealId/lawyer/approve - Approve buyer progress (lawyer only)
router.post(
  '/:dealId/lawyer/approve',
  generalRateLimit,
  validateJwtToken,
  requireDealRole('LAWYER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;

      // Verify user is a lawyer participant
      const participant = await prisma.dealParticipant.findFirst({
        where: {
          dealRoomId,
          userId,
          role: 'LAWYER',
        },
      });

      if (!participant) {
        return res.status(403).json({ error: 'Only lawyers can approve buyer progress' });
      }

      // Note: We allow lawyer to approve even if not all documents are approved
      // The frontend shows a confirmation modal to ensure lawyer has reviewed everything
      // This gives flexibility while maintaining accountability through the confirmation step

      // Publish event for lawyer approval
      publishDealEvent(dealRoomId, {
        type: 'lawyer_approved_buyer_progress',
        actorUserId: userId,
        summary: 'Lawyer approved buyer progress - ready for next stage',
        metadata: {
          approvedBy: userId,
          approvedAt: new Date().toISOString(),
        },
      });

      auditLogger.dealCreated(req, dealRoomId); // Using existing audit logger

      res.json({ 
        success: true, 
        message: 'Buyer progress approved. Buyer can now proceed to next stage.',
        approvedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error approving buyer progress:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/lawyer/approve' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to approve buyer progress' });
    }
  }
);

// POST /api/deals/:dealId/lawyer/approve-basic-documents - Approve basic documents for deposit (lawyer only)
router.post(
  '/:dealId/lawyer/approve-basic-documents',
  generalRateLimit,
  validateJwtToken,
  requireDealRole('LAWYER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;

      // Verify user is a lawyer participant
      const participant = await prisma.dealParticipant.findFirst({
        where: {
          dealRoomId,
          userId,
          role: 'LAWYER',
        },
      });

      if (!participant) {
        return res.status(403).json({ error: 'Only lawyers can approve basic documents' });
      }

      // Lawyer attestation only: no server-side requirement that each basic doc is APPROVED.

      const now = new Date();
      await prisma.dealRoom.update({
        where: { id: dealRoomId },
        data: { lawyerApprovedBasicDocumentsAt: now },
      });

      publishDealEvent(dealRoomId, {
        type: 'lawyer_approved_basic_documents_for_deposit',
        actorUserId: userId,
        summary: 'Lawyer approved basic documents - ready for deposit payment',
        metadata: {
          approvedBy: userId,
          approvedAt: now.toISOString(),
        },
      });

      auditLogger.dealCreated(req, dealRoomId);

      res.json({ 
        success: true, 
        message: 'Basic documents approved. Buyer can now proceed to deposit payment.',
        approvedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error approving basic documents:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/lawyer/approve-basic-documents' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to approve basic documents' });
    }
  }
);

// POST /api/deals/:dealId/lawyer/complete-buyer-folder — buyer's lawyer marks buyer folder complete (unlocks seller lawyer overview step 2)
router.post(
  '/:dealId/lawyer/complete-buyer-folder',
  generalRateLimit,
  validateJwtToken,
  requireDealRole('LAWYER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;

      const participant = await prisma.dealParticipant.findFirst({
        where: { dealRoomId, userId, role: 'LAWYER' },
      });
      if (!participant) {
        return res.status(403).json({ error: 'Only lawyers can complete this step' });
      }

      const dealRoom = await prisma.dealRoom.findUnique({
        where: { id: dealRoomId },
        select: { id: true, buyerId: true, buyerLawyerCompletedBuyerFolderAt: true },
      });
      if (!dealRoom) {
        return res.status(404).json({ error: 'Deal room not found' });
      }

      const buyerLawyerRequest = await prisma.professionalRequest.findFirst({
        where: {
          dealRoomId,
          type: 'LAWYER',
          status: 'ACCEPTED',
          requestedById: dealRoom.buyerId,
          professional: { userId },
        },
      });
      if (!buyerLawyerRequest) {
        return res.status(403).json({ error: 'Only the buyer\'s lawyer can complete the buyer folder step' });
      }

      if (dealRoom.buyerLawyerCompletedBuyerFolderAt) {
        return res.json({
          success: true,
          message: 'Buyer folder step already completed.',
          completedAt: dealRoom.buyerLawyerCompletedBuyerFolderAt.toISOString(),
        });
      }

      const now = new Date();
      await prisma.dealRoom.update({
        where: { id: dealRoomId },
        data: { buyerLawyerCompletedBuyerFolderAt: now },
      });

      publishDealEvent(dealRoomId, {
        type: 'buyer_lawyer_completed_buyer_folder',
        actorUserId: userId,
        summary: 'Buyer\'s lawyer completed buyer folder — seller\'s lawyer can review buyer folder',
        metadata: { completedAt: now.toISOString() },
      });

      auditLogger.dealCreated(req, dealRoomId);

      res.json({
        success: true,
        message: 'Buyer folder marked complete.',
        completedAt: now.toISOString(),
      });
    } catch (error) {
      console.error('Error completing buyer folder step:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/lawyer/complete-buyer-folder' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to complete buyer folder step' });
    }
  }
);

// POST /api/deals/:dealId/buyer/complete-deposit-step — buyer marks ActionsTab step 5 (deposit flow) complete; persists across refresh
router.post(
  '/:dealId/buyer/complete-deposit-step',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;

      const dealRoom = await prisma.dealRoom.findUnique({
        where: { id: dealRoomId },
        include: { property: { select: { amenities: true } } },
      });
      if (!dealRoom) {
        return res.status(404).json({ error: 'Deal room not found' });
      }
      if (dealRoom.buyerId !== userId) {
        return res.status(403).json({ error: 'Only the buyer can complete this step' });
      }

      const amenities = dealRoom.property?.amenities as Record<string, unknown> | null;
      const isRent =
        amenities &&
        typeof amenities === 'object' &&
        String(amenities.listingType || amenities.transactionType || '').toLowerCase() === 'rent';

      if (!isRent && !dealRoom.lawyerApprovedBasicDocumentsAt) {
        return res.status(400).json({
          error:
            'Η ενέργεια δεν είναι διαθέσιμη πριν την επιβεβαίωση βασικών εγγράφων από τον δικηγόρο σας.',
        });
      }

      if (dealRoom.buyerCompletedDepositStepAt) {
        return res.json({
          success: true,
          message: 'Step already completed.',
          completedAt: dealRoom.buyerCompletedDepositStepAt.toISOString(),
        });
      }

      const now = new Date();
      await prisma.dealRoom.update({
        where: { id: dealRoomId },
        data: { buyerCompletedDepositStepAt: now },
      });

      publishDealEvent(dealRoomId, {
        type: 'buyer_completed_deposit_step',
        actorUserId: userId,
        summary: 'Buyer completed deposit / private agreement step',
        metadata: { completedAt: now.toISOString() },
      });

      auditLogger.dealCreated(req, dealRoomId);

      res.json({
        success: true,
        message: 'Deposit step completed.',
        completedAt: now.toISOString(),
      });
    } catch (error) {
      console.error('Error completing buyer deposit step:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/buyer/complete-deposit-step' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to complete deposit step' });
    }
  }
);

// POST /api/deals/:dealId/notary/approve-documents - Approve documents for final signing (notary only)
router.post(
  '/:dealId/notary/approve-documents',
  generalRateLimit,
  validateJwtToken,
  requireDealRole('NOTARY'),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;

      // Verify user is a notary participant
      const participant = await prisma.dealParticipant.findFirst({
        where: {
          dealRoomId,
          userId,
          role: 'NOTARY',
        },
      });

      if (!participant) {
        return res.status(403).json({ error: 'Only notaries can approve documents for final signing' });
      }

      // Persist approval - completes step 5 for both buyer and seller
      await prisma.dealRoom.update({
        where: { id: dealRoomId },
        data: { notaryApprovedDocumentsAt: new Date() },
      });

      // Publish event for notary approval
      publishDealEvent(dealRoomId, {
        type: 'notary_approved_documents',
        actorUserId: userId,
        summary: 'Notary approved documents - ready for final signing',
        metadata: {
          approvedBy: userId,
          approvedAt: new Date().toISOString(),
        },
      });

      auditLogger.dealCreated(req, dealRoomId);

      res.json({ 
        success: true, 
        message: 'Documents approved. Ready for final signing.',
        approvedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error approving documents:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/notary/approve-documents' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to approve documents' });
    }
  }
);

// POST /api/deals/:dealId/engineer/approve-seller-documents - Approve seller documents (engineer only, seller's engineer)
router.post(
  '/:dealId/engineer/approve-seller-documents',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;

      const dealRoom = await prisma.dealRoom.findUnique({
        where: { id: dealRoomId },
        include: { property: { select: { userId: true } } },
      });
      if (!dealRoom) {
        return res.status(404).json({ error: 'Deal room not found' });
      }
      const sellerId = dealRoom.sellerId ?? dealRoom.property?.userId;
      if (!sellerId) {
        return res.status(400).json({ error: 'Deal has no seller' });
      }

      // Verify user is the seller's engineer (requested by seller)
      const engineerRequest = await prisma.professionalRequest.findFirst({
        where: {
          dealRoomId,
          type: 'ENGINEER',
          status: 'ACCEPTED',
          requestedById: sellerId,
        },
        include: { professional: { select: { userId: true } } },
      });
      if (!engineerRequest || engineerRequest.professional.userId !== userId) {
        return res.status(403).json({ error: 'Only the seller\'s engineer can approve seller documents' });
      }

      await prisma.dealRoom.update({
        where: { id: dealRoomId },
        data: { engineerApprovedSellerDocumentsAt: new Date() },
      });

      publishDealEvent(dealRoomId, {
        type: 'engineer_approved_seller_documents',
        actorUserId: userId,
        summary: 'Engineer approved seller documents',
        metadata: { approvedBy: userId, approvedAt: new Date().toISOString() },
      });

      auditLogger.dealCreated(req, dealRoomId);

      res.json({
        success: true,
        message: 'Seller documents approved.',
        approvedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error approving seller documents (engineer):', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/engineer/approve-seller-documents' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to approve seller documents' });
    }
  }
);

// POST /api/deals/:dealId/lawyer/approve-seller-documents - Approve seller documents (lawyer only, buyer's lawyer)
router.post(
  '/:dealId/lawyer/approve-seller-documents',
  generalRateLimit,
  validateJwtToken,
  requireDealRole('LAWYER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;

      const dealRoom = await prisma.dealRoom.findUnique({
        where: { id: dealRoomId },
        include: { property: { select: { userId: true } } },
      });
      if (!dealRoom) {
        return res.status(404).json({ error: 'Deal room not found' });
      }
      const buyerId = dealRoom.buyerId;
      if (!buyerId) {
        return res.status(400).json({ error: 'Deal has no buyer' });
      }

      // Verify user is the buyer's lawyer (requested by buyer)
      const lawyerRequest = await prisma.professionalRequest.findFirst({
        where: {
          dealRoomId,
          type: 'LAWYER',
          status: 'ACCEPTED',
          requestedById: buyerId,
        },
        include: { professional: { select: { userId: true } } },
      });
      if (!lawyerRequest || lawyerRequest.professional.userId !== userId) {
        return res.status(403).json({ error: 'Only the buyer\'s lawyer can approve seller documents' });
      }

      const sellerId = dealRoom.sellerId ?? dealRoom.property?.userId ?? null;
      if (sellerId) {
        const sellerLawyerRequest = await prisma.professionalRequest.findFirst({
          where: {
            dealRoomId,
            type: 'LAWYER',
            status: 'ACCEPTED',
            requestedById: sellerId,
          },
        });
        if (sellerLawyerRequest) {
          const sellerDocs = await prisma.dealDocument.findMany({
            where: { dealRoomId, requestedFromRole: 'SELLER' },
            select: { status: true },
          });
          const pendingRequested = sellerDocs.filter((d) => d.status === 'REQUESTED').length;
          const hasUploadedOrApproved = sellerDocs.some(
            (d) => d.status === 'UPLOADED' || d.status === 'APPROVED'
          );
          if (!hasUploadedOrApproved || pendingRequested > 0) {
            return res.status(400).json({
              error:
                'Η έγκριση δεν είναι διαθέσιμη μέχρι ο δικηγόρος του πωλητή να ολοκληρώσει το Βήμα 1 (φάκελος πωλητή χωρίς εκκρεμή αιτήματα).',
            });
          }
        }
      }

      await prisma.dealRoom.update({
        where: { id: dealRoomId },
        data: { lawyerApprovedSellerDocumentsAt: new Date() },
      });

      publishDealEvent(dealRoomId, {
        type: 'lawyer_approved_seller_documents',
        actorUserId: userId,
        summary: 'Lawyer approved seller documents',
        metadata: { approvedBy: userId, approvedAt: new Date().toISOString() },
      });

      auditLogger.dealCreated(req, dealRoomId);

      res.json({
        success: true,
        message: 'Seller documents approved.',
        approvedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error approving seller documents (lawyer):', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/lawyer/approve-seller-documents' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to approve seller documents' });
    }
  }
);

// POST /api/deals/:dealId/notary/availability - Set available hours for signing (notary only)
router.post(
  '/:dealId/notary/availability',
  generalRateLimit,
  validateJwtToken,
  requireDealRole('NOTARY'),
  validateBody(
    z.object({
      availableSlots: z.array(
        z.object({
          date: z.string(), // ISO date string
          startTime: z.string(), // HH:mm format
          endTime: z.string(), // HH:mm format
        })
      ),
    }).strict()
  ),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;
      const { availableSlots } = req.body as { availableSlots: Array<{ date: string; startTime: string; endTime: string }> };

      // Verify user is a notary participant
      const participant = await prisma.dealParticipant.findFirst({
        where: {
          dealRoomId,
          userId,
          role: 'NOTARY',
        },
      });

      if (!participant) {
        return res.status(403).json({ error: 'Only notaries can set availability' });
      }

      // Get notary professional profile
      const notaryRequest = await prisma.professionalRequest.findFirst({
        where: {
          dealRoomId,
          type: 'NOTARY',
          status: 'ACCEPTED',
        },
        include: {
          professional: {
            select: { id: true, userId: true },
          },
        },
      });

      if (!notaryRequest || notaryRequest.professional.userId !== userId) {
        return res.status(403).json({ error: 'You are not the notary for this deal' });
      }

      // Delete existing availability slots for this deal (slots with note = 'AVAILABLE_SLOT')
      await prisma.dealAppointment.deleteMany({
        where: {
          dealRoomId,
          professionalId: notaryRequest.professionalId,
          note: 'AVAILABLE_SLOT',
        },
      });

      // Create new availability slots
      const createdSlots = await Promise.all(
        availableSlots.map(async (slot: { date: string; startTime: string; endTime: string }) => {
          const date = new Date(slot.date);
          const [startHours, startMinutes] = slot.startTime.split(':').map(Number);
          const [endHours, endMinutes] = slot.endTime.split(':').map(Number);
          
          const startAt = new Date(date);
          startAt.setHours(startHours, startMinutes, 0, 0);
          
          const endAt = new Date(date);
          endAt.setHours(endHours, endMinutes, 0, 0);

          return prisma.dealAppointment.create({
            data: {
              dealRoomId,
              professionalId: notaryRequest.professionalId,
              bookedById: userId, // Set to notary userId to indicate it's an available slot
              startAt,
              endAt,
              type: 'IN_PERSON',
              status: 'REQUESTED',
              note: 'AVAILABLE_SLOT', // Special note to indicate this is an available slot
            },
          });
        })
      );

      // Publish event
      publishDealEvent(dealRoomId, {
        type: 'notary_availability_set',
        actorUserId: userId,
        summary: 'Notary set available hours for signing',
        metadata: {
          slotsCount: createdSlots.length,
        },
      });

      res.json({
        success: true,
        message: 'Availability set successfully',
        slots: createdSlots,
      });
    } catch (error) {
      console.error('Error setting availability:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/notary/availability' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to set availability' });
    }
  }
);

// GET /api/deals/:dealId/notary/availability - Get available hours for signing
router.get(
  '/:dealId/notary/availability',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  async (req: AuthRequest, res: Response) => {
    try {
      const dealRoomId = req.params.dealId;

      // Get notary professional profile
      const notaryRequest = await prisma.professionalRequest.findFirst({
        where: {
          dealRoomId,
          type: 'NOTARY',
          status: 'ACCEPTED',
        },
        include: {
          professional: {
            select: { id: true },
          },
        },
      });

      if (!notaryRequest) {
        return res.json({ slots: [] });
      }

      // Get available slots (slots with note = 'AVAILABLE_SLOT')
      const availableSlots = await prisma.dealAppointment.findMany({
        where: {
          dealRoomId,
          professionalId: notaryRequest.professionalId,
          note: 'AVAILABLE_SLOT',
          startAt: { gte: new Date() }, // Only future slots
        },
        orderBy: { startAt: 'asc' },
      });

      res.json({ slots: availableSlots });
    } catch (error) {
      console.error('Error fetching availability:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'GET /api/deals/:dealId/notary/availability' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to fetch availability' });
    }
  }
);

// DELETE /api/deals/:dealId/requests/:requestId - Cancel professional request (buyer or seller - only the requester)
router.delete(
  '/:dealId/requests/:requestId',
  generalRateLimit,
  validateJwtToken,
  requireDealRole('BUYER', 'SELLER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;
      const requestId = req.params.requestId;

      // Get request
      const request = await prisma.professionalRequest.findUnique({
        where: { id: requestId },
        include: {
          professional: {
            select: { userId: true, type: true },
          },
        },
      });

      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }

      if (request.dealRoomId !== dealRoomId) {
        return res.status(400).json({ error: 'Request does not belong to this deal room' });
      }

      // Verify user is the one who requested (buyer or seller)
      if (request.requestedById !== userId) {
        return res.status(403).json({ error: 'Μόνο ο χρήστης που έκανε το αίτημα μπορεί να το ακυρώσει' });
      }

      // Only allow canceling REQUESTED status requests
      if (request.status !== 'REQUESTED') {
        return res.status(400).json({ 
          error: 'Can only cancel requests that are pending. Accepted requests cannot be cancelled.' 
        });
      }

      // Delete the request
      await prisma.professionalRequest.delete({
        where: { id: requestId },
      });

      auditLogger.professionalRequestCancelled(req, dealRoomId, request.professionalId);

      // Publish events
      publishDealEvent(dealRoomId, {
        type: 'professional_request_cancelled',
        requestId: requestId,
        actorUserId: userId,
        summary: `Professional ${request.type} request cancelled`,
        metadata: {
          type: request.type,
        },
      });

      res.json({ success: true, message: 'Request cancelled successfully' });
    } catch (error) {
      console.error('Error cancelling professional request:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'DELETE /api/deals/:dealId/requests/:requestId' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to cancel professional request' });
    }
  }
);

// POST /api/deals/:dealId/confirm-signing - Confirm signing completion (buyer or seller)
router.post(
  '/:dealId/confirm-signing',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;

      // Get deal room and verify user is buyer or seller
      const dealRoom = await prisma.dealRoom.findUnique({
        where: { id: dealRoomId },
        include: {
          participants: {
            where: { userId },
            select: { role: true },
          },
        },
      });

      if (!dealRoom) {
        return res.status(404).json({ error: 'Deal room not found' });
      }

      const participant = dealRoom.participants[0];
      if (!participant) {
        return res.status(403).json({ error: 'You are not a participant in this deal room' });
      }

      if (!['BUYER', 'SELLER'].includes(participant.role)) {
        return res.status(403).json({ error: 'Only buyer or seller can confirm signing completion' });
      }

      // Check if appointment time has passed
      const confirmedSigningAppointment = await prisma.dealAppointment.findFirst({
        where: {
          dealRoomId,
          status: 'CONFIRMED',
          type: 'IN_PERSON',
        },
      });

      if (!confirmedSigningAppointment) {
        return res.status(400).json({ error: 'No confirmed signing appointment found' });
      }

      const appointmentEndTime = new Date(confirmedSigningAppointment.endAt);
      const now = new Date();

      if (appointmentEndTime > now) {
        return res.status(400).json({ error: 'Appointment time has not passed yet' });
      }

      // Update the appropriate field
      const updateData: any = {};
      if (participant.role === 'BUYER') {
        updateData.buyerSigningConfirmed = true;
      } else if (participant.role === 'SELLER') {
        updateData.sellerSigningConfirmed = true;
      }

      await prisma.dealRoom.update({
        where: { id: dealRoomId },
        data: updateData,
      });

      // Fetch updated deal room to check both confirmations
      const updatedDealRoom = await prisma.dealRoom.findUnique({
        where: { id: dealRoomId },
        select: {
          buyerSigningConfirmed: true,
          sellerSigningConfirmed: true,
        } as any,
      }) as { buyerSigningConfirmed: boolean; sellerSigningConfirmed: boolean } | null;

      if (!updatedDealRoom) {
        return res.status(404).json({ error: 'Deal room not found after update' });
      }

      // Check if both have confirmed - if so, mark deal as completed
      const buyerConfirmed = updatedDealRoom.buyerSigningConfirmed;
      const sellerConfirmed = updatedDealRoom.sellerSigningConfirmed;
      
      if (buyerConfirmed && sellerConfirmed) {
        await prisma.dealRoom.update({
          where: { id: dealRoomId },
          data: { status: 'COMPLETED' as any },
        });

        // Close all other deal rooms for the same property (property sold/rented to someone else)
        await prisma.dealRoom.updateMany({
          where: {
            propertyId: dealRoom.propertyId,
            id: { not: dealRoomId },
            status: { in: ['ACTIVE', 'DRAFT'] as any },
          },
          data: { status: 'CLOSED_PROPERTY_SOLD' as any },
        });

        // Publish event for deal completion
        publishDealEvent(dealRoomId, {
          type: 'deal_completed',
          actorUserId: userId,
          summary: 'Deal completed - both parties confirmed signing',
          metadata: {
            completedAt: new Date().toISOString(),
          },
        });
      }

      auditLogger.dealCreated(req, dealRoomId);

      res.json({
        success: true,
        message: 'Signing confirmation saved successfully',
        buyerConfirmed,
        sellerConfirmed,
        dealCompleted: buyerConfirmed && sellerConfirmed,
      });
    } catch (error) {
      console.error('Error confirming signing:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/confirm-signing' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to confirm signing' });
    }
  }
);

// POST /api/deals/:dealId/buyer-skip-viewing - Buyer confirms skip (continue without appointment)
router.post(
  '/:dealId/buyer-skip-viewing',
  generalRateLimit,
  validateJwtToken,
  requireDealRole('BUYER'),
  validateBody(z.object({ skipped: z.boolean() }).strict()),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;
      const { skipped } = req.body;

      const dealRoom = await prisma.dealRoom.findUnique({
        where: { id: dealRoomId },
      });

      if (!dealRoom) {
        return res.status(404).json({ error: 'Deal room not found' });
      }

      if (dealRoom.buyerId !== userId) {
        return res.status(403).json({ error: 'Only the buyer can update skip viewing' });
      }

      await prisma.dealRoom.update({
        where: { id: dealRoomId },
        data: { buyerSkippedViewingAt: skipped ? new Date() : null } as Record<string, unknown>,
      });

      publishDealEvent(dealRoomId, {
        type: 'buyer_skip_viewing_updated',
        actorUserId: userId,
        summary: skipped ? 'Buyer chose to continue without appointment' : 'Buyer chose to reschedule',
        metadata: { skipped },
      });

      res.json({ success: true, skipped });
    } catch (error) {
      console.error('Error updating buyer skip viewing:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/buyer-skip-viewing' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to update' });
    }
  }
);

// POST /api/deals/:dealId/buyer-confirm-interest - Buyer confirms interest (continue)
router.post(
  '/:dealId/buyer-confirm-interest',
  generalRateLimit,
  validateJwtToken,
  requireDealRole('BUYER'),
  validateBody(z.object({ confirmed: z.boolean() }).strict()),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;
      const { confirmed } = req.body;

      const dealRoom = await prisma.dealRoom.findUnique({
        where: { id: dealRoomId },
      });

      if (!dealRoom) {
        return res.status(404).json({ error: 'Deal room not found' });
      }

      if (dealRoom.buyerId !== userId) {
        return res.status(403).json({ error: 'Only the buyer can confirm interest' });
      }

      await prisma.dealRoom.update({
        where: { id: dealRoomId },
        data: { buyerConfirmedInterestAt: confirmed ? new Date() : null } as Record<string, unknown>,
      });

      publishDealEvent(dealRoomId, {
        type: 'buyer_confirmed_interest',
        actorUserId: userId,
        summary: confirmed ? 'Buyer confirmed interest to continue' : 'Buyer interest cleared',
        metadata: { confirmed },
      });

      res.json({ success: true, confirmed });
    } catch (error) {
      console.error('Error updating buyer confirm interest:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/buyer-confirm-interest' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to update' });
    }
  }
);

export default router;

