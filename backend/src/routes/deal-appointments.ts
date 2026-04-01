/**
 * Deal Appointments Routes
 * Security: All endpoints require JWT + authorization + rate limiting + audit logging
 */

import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, AuthRequest } from '../middleware/auth';
import { requireDealParticipant, requireDealRole } from '../middleware/authorization';
import { validateBody } from '../middleware/validation';
import { requestAppointmentSchema } from '../lib/validation/schemas';
import {
  appointmentRequestLimiter,
  generalRateLimit,
} from '../middleware/rateLimit';
import { auditLogger } from '../lib/utils/audit-logger';
import { getDealParticipantOrThrow } from '../lib/utils/deal-authorization';
import { publishDealEvent } from '../services/realtime/eventBus';
import { z } from 'zod';
import * as Sentry from '@sentry/node';

const router = Router();

// POST /api/deals/:dealId/appointments/request - Request appointment
router.post(
  '/deals/:dealId/appointments/request',
  appointmentRequestLimiter,
  validateJwtToken,
  requireDealRole('BUYER', 'SELLER'),
  validateBody(requestAppointmentSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;
      const { professionalId, startAt, endAt, type, note, location } = req.body;

      // Verify professional profile exists
      // Removed requirement for ACCEPTED professional request - allow appointments without prior acceptance
      const professional = await prisma.professionalProfile.findUnique({
        where: { id: professionalId },
        include: { availability: true },
      });

      if (!professional) {
        return res.status(404).json({ error: 'Professional not found' });
      }

      // Removed verification status check - allow appointments with all professionals regardless of verification status

      // Validate time slot (basic validation - can be enhanced)
      const start = new Date(startAt);
      const end = new Date(endAt);

      if (start >= end) {
        return res.status(400).json({ error: 'Start time must be before end time' });
      }

      if (start < new Date()) {
        return res.status(400).json({ error: 'Cannot book appointments in the past' });
      }

      // Check if this is booking an available slot (slot with note = 'AVAILABLE_SLOT')
      const availableSlot = await prisma.dealAppointment.findFirst({
        where: {
          dealRoomId,
          professionalId,
          note: 'AVAILABLE_SLOT',
          startAt: start,
          endAt: end,
        },
      });

      let appointment;
      if (availableSlot) {
        // Update the available slot to be a requested appointment
        appointment = await prisma.dealAppointment.update({
          where: { id: availableSlot.id },
          data: {
            bookedById: userId,
            status: 'REQUESTED',
            note: note || null, // Replace AVAILABLE_SLOT with buyer's note
            type,
            location: location || null,
          },
          include: {
            professional: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        });
      } else {
        // Create new appointment (buyer's own proposal)
        appointment = await prisma.dealAppointment.create({
          data: {
            dealRoomId,
            professionalId,
            bookedById: userId,
            startAt: start,
            endAt: end,
            type,
            location: location || null,
            status: 'REQUESTED',
            note: note || null,
          },
          include: {
            professional: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        });
      }

      auditLogger.appointmentRequested(req, appointment.id, dealRoomId);

      // Publish event
      publishDealEvent(dealRoomId, {
        type: 'appointment_requested',
        appointmentId: appointment.id,
        actorUserId: userId,
        summary: `Appointment requested with ${appointment.professional.user.name}`,
        metadata: {
          type: appointment.type,
          startAt: appointment.startAt.toISOString(),
        },
      });

      res.json(appointment);
    } catch (error) {
      console.error('Error requesting appointment:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/appointments/request' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to request appointment' });
    }
  }
);

// POST /api/appointments/:id/confirm - Confirm appointment (professional only)
router.post(
  '/appointments/:id/confirm',
  generalRateLimit,
  validateJwtToken,
  validateBody(
    z
      .object({
        meetingLink: z.string().url().optional(),
      })
      .strict()
  ),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const appointmentId = req.params.id;
      const { meetingLink } = req.body;

      // Get appointment
      const appointment = await prisma.dealAppointment.findUnique({
        where: { id: appointmentId },
        include: {
          professional: {
            select: { userId: true },
          },
          dealRoom: {
            select: {
              buyerId: true,
              sellerId: true,
              participants: {
                where: { userId },
                select: { role: true },
              },
            },
          },
        },
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      // Verify user is the professional
      if (appointment.professional.userId !== userId) {
        return res.status(403).json({ error: 'Only the professional can confirm appointments' });
      }

      // Verify professional is participant
      const participant = appointment.dealRoom.participants[0];
      if (!participant || !['LAWYER', 'NOTARY'].includes(participant.role)) {
        return res.status(403).json({ error: 'You are not a participant in this deal room' });
      }

      const isSigningProposal =
        appointment.status === 'REQUESTED' &&
        appointment.type === 'IN_PERSON' &&
        appointment.note !== 'AVAILABLE_SLOT';

      if (isSigningProposal) {
        if (appointment.bookedById === appointment.dealRoom.buyerId && !appointment.sellerApprovedAt) {
          return res.status(400).json({
            error:
              'Ο πωλητής πρέπει να εγκρίνει την πρόταση του αγοραστή πριν την επιβεβαιώσετε.',
          });
        }
        let dealSellerIdForConfirm = appointment.dealRoom.sellerId;
        if (!dealSellerIdForConfirm) {
          const sp = await prisma.dealParticipant.findFirst({
            where: { dealRoomId: appointment.dealRoomId, role: 'SELLER' },
            select: { userId: true },
          });
          dealSellerIdForConfirm = sp?.userId ?? null;
        }
        if (
          dealSellerIdForConfirm &&
          appointment.bookedById === dealSellerIdForConfirm &&
          !appointment.buyerApprovedAt
        ) {
          return res.status(400).json({
            error:
              'Ο αγοραστής πρέπει να εγκρίνει την πρόταση του πωλητή πριν την επιβεβαιώσετε.',
          });
        }
      }

      // Update appointment
      const updated = await prisma.dealAppointment.update({
        where: { id: appointmentId },
        data: {
          status: 'CONFIRMED',
          meetingLink: meetingLink || null,
        },
        include: {
          professional: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      auditLogger.appointmentConfirmed(req, updated.id, appointment.dealRoomId);

      // Publish event
      publishDealEvent(appointment.dealRoomId, {
        type: 'appointment_confirmed',
        appointmentId: updated.id,
        actorUserId: userId,
        summary: `Appointment confirmed`,
        metadata: {
          type: updated.type,
          startAt: updated.startAt.toISOString(),
        },
      });

      res.json(updated);
    } catch (error) {
      console.error('Error confirming appointment:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/appointments/:id/confirm' },
        extra: { userId: req.userId, appointmentId: req.params.id },
      });
      res.status(500).json({ error: 'Failed to confirm appointment' });
    }
  }
);

// POST /api/appointments/:id/reject - Reject appointment (professional only)
router.post(
  '/appointments/:id/reject',
  generalRateLimit,
  validateJwtToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const appointmentId = req.params.id;

      // Get appointment
      const appointment = await prisma.dealAppointment.findUnique({
        where: { id: appointmentId },
        include: {
          professional: {
            select: { userId: true },
          },
          dealRoom: {
            include: {
              participants: {
                where: { userId },
                select: { role: true },
              },
            },
          },
        },
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      // Verify user is the professional
      if (appointment.professional.userId !== userId) {
        return res.status(403).json({ error: 'Only the professional can reject appointments' });
      }

      // Verify professional is participant
      const participant = appointment.dealRoom.participants[0];
      if (!participant || !['LAWYER', 'NOTARY'].includes(participant.role)) {
        return res.status(403).json({ error: 'You are not a participant in this deal room' });
      }

      // Only allow rejecting REQUESTED appointments
      if (appointment.status !== 'REQUESTED') {
        return res.status(400).json({ error: 'Can only reject requested appointments' });
      }

      // Update appointment
      const updated = await prisma.dealAppointment.update({
        where: { id: appointmentId },
        data: {
          status: 'CANCELLED',
        },
        include: {
          professional: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      auditLogger.appointmentCancelled(req, updated.id, appointment.dealRoomId);

      // Publish event
      publishDealEvent(appointment.dealRoomId, {
        type: 'appointment_rejected',
        appointmentId: updated.id,
        actorUserId: userId,
        summary: `Appointment rejected by professional`,
        metadata: {
          type: updated.type,
        },
      });

      res.json(updated);
    } catch (error) {
      console.error('Error rejecting appointment:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/appointments/:id/reject' },
        extra: { userId: req.userId, appointmentId: req.params.id },
      });
      res.status(500).json({ error: 'Failed to reject appointment' });
    }
  }
);

// POST /api/appointments/:id/cancel - Cancel appointment
router.post(
  '/appointments/:id/cancel',
  generalRateLimit,
  validateJwtToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const appointmentId = req.params.id;

      // Get appointment
      const appointment = await prisma.dealAppointment.findUnique({
        where: { id: appointmentId },
        include: {
          professional: {
            select: { userId: true },
          },
          dealRoom: {
            include: {
              participants: {
                where: { userId },
                select: { role: true },
              },
            },
          },
        },
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      // Verify user is participant (buyer or professional)
      const participant = appointment.dealRoom.participants[0];
      if (!participant) {
        return res.status(403).json({ error: 'You are not a participant in this deal room' });
      }

      // Verify user is either buyer or professional
      const isBuyer = appointment.bookedById === userId;
      const isProfessional = appointment.professional.userId === userId;

      if (!isBuyer && !isProfessional) {
        return res.status(403).json({
          error: 'Only the buyer or professional can cancel appointments',
        });
      }

      // For CONFIRMED IN_PERSON (signing) appointments: require > 24 hours before start (buyer or professional)
      if (appointment.status === 'CONFIRMED' && appointment.type === 'IN_PERSON') {
        const startAt = new Date(appointment.startAt);
        const now = new Date();
        const hoursUntil = (startAt.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursUntil <= 24) {
          return res.status(400).json({
            error: 'Δεν μπορείτε να ακυρώσετε το ραντεβού λιγότερο από 24 ώρες πριν την ημερομηνία του.',
          });
        }
      }

      // Update appointment
      const updated = await prisma.dealAppointment.update({
        where: { id: appointmentId },
        data: {
          status: 'CANCELLED',
        },
        include: {
          professional: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      auditLogger.appointmentCancelled(req, updated.id, appointment.dealRoomId);

      // Publish event
      publishDealEvent(appointment.dealRoomId, {
        type: 'appointment_cancelled',
        appointmentId: updated.id,
        actorUserId: userId,
        summary: `Appointment cancelled`,
        metadata: {
          type: updated.type,
        },
      });

      res.json(updated);
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/appointments/:id/cancel' },
        extra: { userId: req.userId, appointmentId: req.params.id },
      });
      res.status(500).json({ error: 'Failed to cancel appointment' });
    }
  }
);

// POST /api/deals/:dealId/appointments/:appointmentId/seller-approve - Seller approves buyer's proposal
router.post(
  '/deals/:dealId/appointments/:appointmentId/seller-approve',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  requireDealRole('SELLER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;
      const appointmentId = req.params.appointmentId;

      const appointment = await prisma.dealAppointment.findUnique({
        where: { id: appointmentId, dealRoomId },
        include: {
          dealRoom: {
            select: { buyerId: true },
          },
        },
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      if (appointment.status !== 'REQUESTED') {
        return res.status(400).json({ error: 'Can only approve requested appointments' });
      }

      // Must be proposed by buyer (bookedById = buyerId)
      if (appointment.bookedById !== appointment.dealRoom.buyerId) {
        return res.status(400).json({ error: 'Can only approve appointments proposed by the buyer' });
      }

      await prisma.dealAppointment.update({
        where: { id: appointmentId },
        data: { sellerApprovedAt: new Date() } as Record<string, unknown>,
      });

      publishDealEvent(dealRoomId, {
        type: 'appointment_seller_approved',
        appointmentId,
        actorUserId: userId,
        summary: 'Seller approved signing appointment proposal',
        metadata: { startAt: appointment.startAt.toISOString() },
      });

      res.json({ success: true, message: 'Proposal approved. Waiting for notary confirmation.' });
    } catch (error) {
      console.error('Error approving appointment:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/appointments/:id/seller-approve' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to approve appointment' });
    }
  }
);

// POST /api/deals/:dealId/appointments/:appointmentId/seller-reject - Seller rejects buyer's proposal
router.post(
  '/deals/:dealId/appointments/:appointmentId/seller-reject',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  requireDealRole('SELLER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;
      const appointmentId = req.params.appointmentId;

      const appointment = await prisma.dealAppointment.findUnique({
        where: { id: appointmentId, dealRoomId },
        include: {
          dealRoom: {
            select: { buyerId: true },
          },
        },
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      if (appointment.status !== 'REQUESTED') {
        return res.status(400).json({ error: 'Can only reject requested appointments' });
      }

      if (appointment.bookedById !== appointment.dealRoom.buyerId) {
        return res.status(400).json({ error: 'Can only reject appointments proposed by the buyer' });
      }

      await prisma.dealAppointment.update({
        where: { id: appointmentId },
        data: { status: 'CANCELLED' },
      });

      publishDealEvent(dealRoomId, {
        type: 'appointment_seller_rejected',
        appointmentId,
        actorUserId: userId,
        summary: 'Seller rejected signing appointment proposal',
        metadata: { startAt: appointment.startAt.toISOString() },
      });

      res.json({ success: true, message: 'Η πρόταση απορρίφθηκε.' });
    } catch (error) {
      console.error('Error rejecting appointment:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/appointments/:id/seller-reject' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to reject appointment' });
    }
  }
);

// POST /api/deals/:dealId/appointments/:appointmentId/buyer-approve - Buyer approves seller's signing proposal
router.post(
  '/deals/:dealId/appointments/:appointmentId/buyer-approve',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  requireDealRole('BUYER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;
      const appointmentId = req.params.appointmentId;

      const appointment = await prisma.dealAppointment.findUnique({
        where: { id: appointmentId, dealRoomId },
        include: {
          dealRoom: {
            select: {
              buyerId: true,
              sellerId: true,
              participants: { where: { role: 'SELLER' }, select: { userId: true } },
            },
          },
        },
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      if (appointment.status !== 'REQUESTED') {
        return res.status(400).json({ error: 'Can only approve requested appointments' });
      }

      const effectiveSellerId =
        appointment.dealRoom.sellerId || appointment.dealRoom.participants[0]?.userId;
      if (!effectiveSellerId || appointment.bookedById !== effectiveSellerId) {
        return res.status(400).json({ error: 'Can only approve appointments proposed by the seller' });
      }

      if (appointment.type !== 'IN_PERSON' || appointment.note === 'AVAILABLE_SLOT') {
        return res.status(400).json({ error: 'Invalid appointment type for this action' });
      }

      if (appointment.dealRoom.buyerId !== userId) {
        return res.status(403).json({ error: 'Only the buyer for this deal can approve' });
      }

      await prisma.dealAppointment.update({
        where: { id: appointmentId },
        data: { buyerApprovedAt: new Date() } as Record<string, unknown>,
      });

      publishDealEvent(dealRoomId, {
        type: 'appointment_buyer_approved',
        appointmentId,
        actorUserId: userId,
        summary: 'Buyer approved seller signing appointment proposal',
        metadata: { startAt: appointment.startAt.toISOString() },
      });

      res.json({ success: true, message: 'Η πρόταση εγκρίθηκε. Ο συμβολαιογράφος θα την επιβεβαιώσει.' });
    } catch (error) {
      console.error('Error buyer-approving appointment:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/appointments/:id/buyer-approve' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to approve appointment' });
    }
  }
);

// POST /api/deals/:dealId/appointments/:appointmentId/buyer-reject - Buyer rejects seller's signing proposal
router.post(
  '/deals/:dealId/appointments/:appointmentId/buyer-reject',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  requireDealRole('BUYER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;
      const appointmentId = req.params.appointmentId;

      const appointment = await prisma.dealAppointment.findUnique({
        where: { id: appointmentId, dealRoomId },
        include: {
          dealRoom: {
            select: {
              buyerId: true,
              sellerId: true,
              participants: { where: { role: 'SELLER' }, select: { userId: true } },
            },
          },
        },
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      if (appointment.status !== 'REQUESTED') {
        return res.status(400).json({ error: 'Can only reject requested appointments' });
      }

      const effectiveSellerIdReject =
        appointment.dealRoom.sellerId || appointment.dealRoom.participants[0]?.userId;
      if (!effectiveSellerIdReject || appointment.bookedById !== effectiveSellerIdReject) {
        return res.status(400).json({ error: 'Can only reject appointments proposed by the seller' });
      }

      if (appointment.dealRoom.buyerId !== userId) {
        return res.status(403).json({ error: 'Only the buyer for this deal can reject' });
      }

      await prisma.dealAppointment.update({
        where: { id: appointmentId },
        data: { status: 'CANCELLED' },
      });

      publishDealEvent(dealRoomId, {
        type: 'appointment_buyer_rejected',
        appointmentId,
        actorUserId: userId,
        summary: 'Buyer rejected seller signing appointment proposal',
        metadata: { startAt: appointment.startAt.toISOString() },
      });

      res.json({ success: true, message: 'Η πρόταση απορρίφθηκε.' });
    } catch (error) {
      console.error('Error buyer-rejecting appointment:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/appointments/:id/buyer-reject' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to reject appointment' });
    }
  }
);

// POST /api/deals/:dealId/appointments/:appointmentId/seller-cancel - Seller cancels confirmed signing appointment
router.post(
  '/deals/:dealId/appointments/:appointmentId/seller-cancel',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  requireDealRole('SELLER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const dealRoomId = req.params.dealId;
      const appointmentId = req.params.appointmentId;

      const appointment = await prisma.dealAppointment.findUnique({
        where: { id: appointmentId, dealRoomId },
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      if (appointment.status !== 'CONFIRMED') {
        return res.status(400).json({ error: 'Can only cancel confirmed appointments' });
      }

      if (appointment.type !== 'IN_PERSON') {
        return res.status(400).json({ error: 'Can only cancel signing (IN_PERSON) appointments' });
      }

      const startAt = new Date(appointment.startAt);
      const now = new Date();
      const hoursUntil = (startAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntil <= 24) {
        return res.status(400).json({
          error: 'Δεν μπορείτε να ακυρώσετε το ραντεβού λιγότερο από 24 ώρες πριν την ημερομηνία του.',
        });
      }

      await prisma.dealAppointment.update({
        where: { id: appointmentId },
        data: { status: 'CANCELLED' },
      });

      auditLogger.appointmentCancelled(req, appointmentId, dealRoomId);

      publishDealEvent(dealRoomId, {
        type: 'appointment_seller_cancelled',
        appointmentId,
        actorUserId: req.userId!,
        summary: 'Seller cancelled confirmed signing appointment',
        metadata: { startAt: appointment.startAt.toISOString() },
      });

      res.json({ success: true, message: 'Το ραντεβού ακυρώθηκε.' });
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/appointments/:id/seller-cancel' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to cancel appointment' });
    }
  }
);

// GET /api/deals/:dealId/appointments - List appointments
router.get(
  '/deals/:dealId/appointments',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  async (req: AuthRequest, res: Response) => {
    try {
      const dealRoomId = req.params.dealId;

      const appointments = await prisma.dealAppointment.findMany({
        where: { dealRoomId },
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

      res.json({ appointments });
    } catch (error) {
      console.error('Error fetching appointments:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'GET /api/deals/:dealId/appointments' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to fetch appointments' });
    }
  }
);

export default router;

