/**
 * Deal Documents Routes
 * Security: CRITICAL IDOR point - never expose s3Key, only signed URLs
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, AuthRequest } from '../middleware/auth';
import { requireDealParticipant, requireDealRole } from '../middleware/authorization';
import { validateBody } from '../middleware/validation';
import {
  requestDocumentSchema,
  reviewDocumentSchema,
} from '../lib/validation/schemas';
import {
  docUploadLimiter,
  docDownloadUrlLimiter,
  generalRateLimit,
} from '../middleware/rateLimit';
import { auditLogger } from '../lib/utils/audit-logger';
import {
  canAccessDealDocument,
  canAccessDealDocumentByRole,
  checkDealParticipantAccess,
  getDealParticipantOrThrow,
} from '../lib/utils/deal-authorization';
import { generateSignedUrl } from '../lib/utils/s3-signed-urls';
import { publishDealEvent } from '../services/realtime/eventBus';
import { createSecureUpload, validateUploadedFile, scanForMalware } from '../middleware/file-upload';
import {
  buildSellerFolderDealContext,
  canEngineerRemoveHtkTotalDocument,
  canRemoveSellerFolderTotalDocument,
} from '../lib/utils/seller-folder-document-eligibility';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { z } from 'zod';
import * as Sentry from '@sentry/node';

const router = Router();

// Configure secure multer for document uploads
const uploadDocument = createSecureUpload('document', 1);

// S3 Client (if using AWS S3)
let s3Client: S3Client | null = null;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

// POST /api/deals/:dealId/documents/request - Request document
router.post(
  '/deals/:dealId/documents/request',
  generalRateLimit,
  validateJwtToken,
  requireDealRole('LAWYER', 'NOTARY', 'ENGINEER', 'ADMIN'),
  validateBody(requestDocumentSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;
      const { category, requestedFromRole, note, guideWhere, guideInstructions } = req.body;

      // Create document request
      const document = await prisma.dealDocument.create({
        data: {
          dealRoomId,
          category,
          status: 'REQUESTED',
          requestedById: userId,
          requestedFromRole,
          reviewNote: note || null,
          guideWhere: guideWhere || null,
          guideInstructions: guideInstructions || null,
          // Set default visibility based on category
          // Contract drafts are visible to all participants, other documents to buyer and professionals
          visibility: {
            visibleToRoles:
              category.toLowerCase().includes('συμβόλαιο') || category === 'CONTRACT_DRAFT'
                ? ['BUYER', 'SELLER', 'AGENT', 'LAWYER', 'NOTARY', 'ENGINEER', 'ADMIN']
                : ['BUYER', 'SELLER', 'LAWYER', 'NOTARY', 'ENGINEER', 'ADMIN'],
          },
        },
      });

      auditLogger.documentRequested(req, document.id, dealRoomId);

      // Publish event
      publishDealEvent(dealRoomId, {
        type: 'document_requested',
        docId: document.id,
        actorUserId: userId,
        summary: `Document ${document.category} requested`,
        metadata: {
          category: document.category,
          requestedFromRole: document.requestedFromRole,
        },
      });

      res.json({
        id: document.id,
        category: document.category,
        status: document.status,
        requestedFromRole: document.requestedFromRole,
        createdAt: document.createdAt,
      });
    } catch (error) {
      console.error('Error requesting document:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/documents/request' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to request document' });
    }
  }
);

// POST /api/deals/:dealId/documents/upload - Upload document
router.post(
  '/deals/:dealId/documents/upload',
  docUploadLimiter,
  validateJwtToken,
  requireDealParticipant,
  uploadDocument.single('file'),
  validateUploadedFile('document'),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;
      const file = req.file;
      const { documentId, category } = req.body;

      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      // Get participant to check role
      const participant = await getDealParticipantOrThrow(dealRoomId, userId);

      console.log(`[POST /api/deals/${dealRoomId}/documents/upload] User ${userId} has role ${participant.role}, documentId=${documentId}, category=${category}`);
      
      // Allow BUYER, SELLER, AGENT, LAWYER, NOTARY to upload documents
      // Only restrict if document has specific requestedFromRole that doesn't match

      // If documentId provided, verify it exists and user can upload
      let document;
      if (documentId) {
        document = await prisma.dealDocument.findUnique({
          where: { id: documentId },
        });

        if (!document) {
          return res.status(404).json({ error: 'Document not found' });
        }

        if (document.dealRoomId !== dealRoomId) {
          return res.status(403).json({ error: 'Document does not belong to this deal room' });
        }

        console.log(`[POST /api/deals/${dealRoomId}/documents/upload] Document found:`, {
          id: document.id,
          category: document.category,
          status: document.status,
          requestedFromRole: document.requestedFromRole,
          participantRole: participant.role,
        });

        // Verify user is the requested party or has permission
        // ΗΤΚ: … + requestedFromRole SELLER:
        // - Αν το αίτημα το έβαλε ο μηχανικός (Ζητήστε έγγραφο στο tab ΗΤΚ) → ανεβάζει ο πωλητής / δικηγόρος πωλητή.
        // - Αν το αίτημα το έβαλε δικηγόρος πωλητή για να το συμπληρώσει ο μηχανικός → μόνο μηχανικός.
        if (document.requestedFromRole) {
          const isNonProfessional = ['BUYER', 'SELLER', 'AGENT'].includes(participant.role);
          const isProfessional = ['LAWYER', 'NOTARY', 'ENGINEER'].includes(participant.role);
          const isHtkSellerSideCategory =
            document.requestedFromRole === 'SELLER' &&
            typeof document.category === 'string' &&
            document.category.startsWith('ΗΤΚ: ');
          let requesterIsEngineer = false;
          if (isHtkSellerSideCategory && document.requestedById) {
            const requesterAccess = await checkDealParticipantAccess(dealRoomId, document.requestedById);
            requesterIsEngineer =
              requesterAccess.allowed && requesterAccess.participant?.role === 'ENGINEER';
          }
          const isHtkEngineerOnlyRequest = isHtkSellerSideCategory && !requesterIsEngineer;
          const engineerCanUploadHtk =
            participant.role === 'ENGINEER' &&
            (document.status === 'REQUESTED' || document.status === 'CHANGES_REQUESTED');
          
          const canUpload =
            participant.role === 'ADMIN' ||
            (isHtkEngineerOnlyRequest
              ? engineerCanUploadHtk
              : (
                  document.requestedFromRole === participant.role ||
                  isNonProfessional || // Allow buyers/sellers/agents to upload any document
                  (isProfessional &&
                    (document.status === 'REQUESTED' || document.status === 'CHANGES_REQUESTED'))
                ));
          
          if (!canUpload) {
            console.log(`[POST /api/deals/${dealRoomId}/documents/upload] Authorization failed:`, {
              userId,
              participantRole: participant.role,
              documentRequestedFromRole: document.requestedFromRole,
              documentStatus: document.status,
              documentId: document.id,
              isNonProfessional,
              isProfessional,
            });
            return res.status(403).json({ 
              error: 'You are not authorized to upload this document',
              message: `This document was requested from ${document.requestedFromRole}, but you are ${participant.role}`
            });
          }
        }
        // If no requestedFromRole, allow any participant to upload
      } else if (category) {
        // Create new document if category provided
        document = await prisma.dealDocument.create({
          data: {
            dealRoomId,
            category,
            status: 'UPLOADED',
            uploadedById: userId,
            visibility: {
              visibleToRoles:
                category.toLowerCase().includes('συμβόλαιο') || category === 'CONTRACT_DRAFT'
                  ? ['BUYER', 'SELLER', 'AGENT', 'LAWYER', 'NOTARY', 'ENGINEER', 'ADMIN']
                  : ['BUYER', 'SELLER', 'LAWYER', 'NOTARY', 'ENGINEER', 'ADMIN'],
            },
          },
        });
      } else {
        return res.status(400).json({ error: 'Either documentId or category is required' });
      }

      // Scan for malware
      const scanResult = await scanForMalware(file.buffer, file.filename || file.originalname);
      if (!scanResult.clean) {
        return res.status(400).json({
          error: 'File failed security scan',
          threat: scanResult.threat,
        });
      }

      // Upload to S3 or local storage (fallback for development)
      const secureFileName = file.filename || file.originalname;
      let s3Key: string;

      if (s3Client && process.env.AWS_S3_BUCKET) {
        s3Key = `deals/${dealRoomId}/documents/${document.id}/${secureFileName}`;
        await s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: s3Key,
            Body: file.buffer,
            ContentType: file.mimetype,
          })
        );
      } else {
        // Local storage fallback when S3 not configured (development)
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'deals', dealRoomId, document.id);
        await fs.mkdir(uploadsDir, { recursive: true });
        const filePath = path.join(uploadsDir, secureFileName);
        await fs.writeFile(filePath, file.buffer);
        s3Key = `local:deals/${dealRoomId}/${document.id}/${secureFileName}`;
      }

      // Update document with file info (NEVER return s3Key to client)
      const updated = await prisma.dealDocument.update({
        where: { id: document.id },
        data: {
          status: 'UPLOADED',
          s3Key,
          fileName: secureFileName,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          uploadedById: userId,
        },
        select: {
          id: true,
          category: true,
          status: true,
          fileName: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
          updatedAt: true,
          // NEVER return s3Key
        },
      });

      auditLogger.documentUploaded(req, updated.id, dealRoomId);

      // Publish event
      publishDealEvent(dealRoomId, {
        type: 'document_uploaded',
        docId: updated.id,
        actorUserId: userId,
        summary: `Document ${updated.category} uploaded`,
        metadata: {
          category: updated.category,
          fileName: updated.fileName,
        },
      });

      res.json(updated);
    } catch (error) {
      console.error('Error uploading document:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/documents/upload' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to upload document' });
    }
  }
);

// POST /api/documents/:docId/review - Review document
router.post(
  '/documents/:docId/review',
  generalRateLimit,
  validateJwtToken,
  validateBody(reviewDocumentSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const docId = req.params.docId;
      const { status, note } = req.body;

      // Get document and verify access
      const document = await prisma.dealDocument.findUnique({
        where: { id: docId },
        include: {
          dealRoom: {
            include: {
              property: { select: { amenities: true } },
              participants: {
                where: { userId },
                select: { role: true },
              },
            },
          },
        },
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      let userRole: string | undefined = document.dealRoom.participants[0]?.role;
      if (!userRole) {
        // Fallback: engineer/lawyer/notary with ACCEPTED ProfessionalRequest but no DealParticipant
        const acceptedRequest = await prisma.professionalRequest.findFirst({
          where: {
            dealRoomId: document.dealRoomId,
            status: 'ACCEPTED',
            professional: { userId },
          },
          include: { professional: { select: { type: true } } },
        });
        userRole = acceptedRequest?.professional?.type as string | undefined;
      }
      if (!userRole) return res.status(403).json({ error: 'Not a deal participant' });
      const canReview = ['LAWYER', 'NOTARY', 'ENGINEER', 'ADMIN'].includes(userRole);
      const a = (document.dealRoom as { property?: { amenities?: unknown } })?.property?.amenities as Record<string, unknown> | null;
      const isRent = a && typeof a === 'object' && (a.listingType || a.transactionType) && String(a.listingType || a.transactionType).toLowerCase() === 'rent';
      const sellerCanReviewRent = userRole === 'SELLER' && isRent && (document.requestedFromRole === 'BUYER' || document.uploadedById === document.dealRoom.buyerId);
      if (!canReview && !sellerCanReviewRent) {
        return res.status(403).json({ error: 'Only lawyers, notaries, engineers, admins, or seller (for rent) can review documents' });
      }

      // Update document
      const updated = await prisma.dealDocument.update({
        where: { id: docId },
        data: {
          status: status === 'APPROVED' ? 'APPROVED' : 'CHANGES_REQUESTED',
          reviewById: userId,
          reviewNote: note || null,
        },
        select: {
          id: true,
          category: true,
          status: true,
          reviewNote: true,
          updatedAt: true,
          // NEVER return s3Key
        },
      });

      auditLogger.documentReviewed(req, updated.id, document.dealRoomId, status);

      // Publish event
      publishDealEvent(document.dealRoomId, {
        type: 'document_reviewed',
        docId: updated.id,
        actorUserId: userId,
        summary: `Document ${updated.category} ${status === 'APPROVED' ? 'approved' : 'changes requested'}`,
        metadata: {
          category: updated.category,
          status: updated.status,
        },
      });

      res.json(updated);
    } catch (error) {
      console.error('Error reviewing document:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/documents/:docId/review' },
        extra: { userId: req.userId, docId: req.params.docId },
      });
      res.status(500).json({ error: 'Failed to review document' });
    }
  }
);

// POST /api/deals/:dealId/documents/ensure-rent-documents - Create Ταυτότητα & ΑΦΜ requests for rent (buyer or seller can call)
router.post(
  '/deals/:dealId/documents/ensure-rent-documents',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  async (req: AuthRequest, res: Response) => {
    try {
      const dealRoomId = req.params.dealId;
      const deal = await prisma.dealRoom.findUnique({
        where: { id: dealRoomId },
        include: {
          property: { select: { amenities: true } },
          documents: {
            where: { requestedFromRole: 'BUYER' },
            select: { category: true },
          },
          participants: {
            where: { role: 'SELLER' },
            select: { userId: true },
          },
        },
      });
      if (!deal) return res.status(404).json({ error: 'Deal not found' });
      const a = deal.property?.amenities as Record<string, unknown> | null;
      const isRent = a && typeof a === 'object' && (a.listingType || a.transactionType) && String(a.listingType || a.transactionType).toLowerCase() === 'rent';
      if (!isRent) return res.status(400).json({ error: 'Deal is not for rent' });
      const sellerId = deal.sellerId ?? deal.participants[0]?.userId;
      if (!sellerId) return res.status(400).json({ error: 'No seller in deal' });
      const categories = new Set(deal.documents.map((d) => d.category.toLowerCase()));
      const created: string[] = [];
      if (!categories.has('ταυτότητα') && !categories.has('identity')) {
        await prisma.dealDocument.create({
          data: {
            dealRoomId,
            category: 'Ταυτότητα',
            status: 'REQUESTED',
            requestedById: sellerId,
            requestedFromRole: 'BUYER',
            guideWhere: 'Ταυτότητα πολίτη ή διαβατήριο',
            guideInstructions: 'Ανεβάστε φωτογραφία ή σάρωση της ταυτότητάς σας (αμφότερες οι σελίδες) ή του διαβατηρίου σας. Το έγγραφο πρέπει να είναι έγκυρο και να φαίνονται καθαρά τα στοιχεία.',
            visibility: { visibleToRoles: ['BUYER', 'SELLER', 'AGENT', 'LAWYER', 'NOTARY', 'ENGINEER', 'ADMIN'] },
          },
        });
        created.push('Ταυτότητα');
      }
      if (!categories.has('αφμ') && !categories.has('αποδεικτικό αφμ') && !categories.has('tax_id')) {
        await prisma.dealDocument.create({
          data: {
            dealRoomId,
            category: 'Αποδεικτικό ΑΦΜ',
            status: 'REQUESTED',
            requestedById: sellerId,
            requestedFromRole: 'BUYER',
            guideWhere: 'myAADE (myaade.gov.gr) ή Εφορία',
            guideInstructions: 'Για αποδεικτικό ΑΦΜ: Συνδεθείτε στο myAADE (myaade.gov.gr) με τον κωδικό σας TaxisNet. Μεταβείτε στο "Στοιχεία Φορολογημένου" ή "Εκτύπωση Στοιχείων" και κατεβάστε/εκτυπώστε το πιστοποιητικό. Εναλλακτικά, μπορείτε να αιτηθείτε χάρτινο αποδεικτικό από τη ΔΟΥ σας.',
            visibility: { visibleToRoles: ['BUYER', 'SELLER', 'AGENT', 'LAWYER', 'NOTARY', 'ENGINEER', 'ADMIN'] },
          },
        });
        created.push('Αποδεικτικό ΑΦΜ');
      }
      res.json({ success: true, created });
    } catch (error) {
      console.error('Error ensuring rent documents:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/deals/:dealId/documents/ensure-rent-documents' },
      });
      res.status(500).json({ error: 'Failed to ensure rent documents' });
    }
  }
);

// GET /api/deals/:dealId/documents - List documents (filtered by visibility)
router.get(
  '/deals/:dealId/documents',
  generalRateLimit,
  validateJwtToken,
  requireDealParticipant,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealRoomId = req.params.dealId;

      // Get participant role
      const participant = await getDealParticipantOrThrow(dealRoomId, userId);

      // Get deal to check if rent (seller needs to see buyer docs for approval in step 3 and step 4)
      const deal = await prisma.dealRoom.findUnique({
        where: { id: dealRoomId },
        include: { property: { select: { amenities: true } } },
      });
      const a = deal?.property?.amenities as Record<string, unknown> | null;
      const isRent = a && typeof a === 'object' && (a.listingType || a.transactionType) && String(a.listingType || a.transactionType).toLowerCase() === 'rent';
      const isSeller = participant.role === 'SELLER';

      // Get all documents for this deal room
      const documents = await prisma.dealDocument.findMany({
        where: { dealRoomId },
        select: {
          id: true,
          category: true,
          status: true,
          requestedFromRole: true,
          requestedById: true,
          uploadedById: true,
          reviewById: true,
          reviewNote: true,
          guideWhere: true,
          guideInstructions: true,
          fileName: true,
          mimeType: true,
          sizeBytes: true,
          visibility: true,
          createdAt: true,
          updatedAt: true,
          // NEVER return s3Key
        },
        orderBy: { createdAt: 'desc' },
      });

      // Filter by visibility
      // Rent + Seller: include documents requested FROM buyer (step 3 KYC) and documents uploaded BY buyer (step 4 signed contract)
      const visibleDocuments = documents.filter((doc) => {
        if (isRent && isSeller && (doc.requestedFromRole === 'BUYER' || doc.uploadedById === deal?.buyerId)) {
          return true;
        }
        return canAccessDealDocumentByRole(doc, participant.role);
      });

      res.json({ documents: visibleDocuments });
    } catch (error) {
      console.error('Error fetching documents:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'GET /api/deals/:dealId/documents' },
        extra: { userId: req.userId, dealRoomId: req.params.dealId },
      });
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  }
);

// DELETE /api/documents/:docId - Delete REQUESTED request (requester) OR remove from «Συνολικά Έγγραφα» φακέλου πωλητή (authorized roles)
router.delete(
  '/documents/:docId',
  generalRateLimit,
  validateJwtToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const docId = req.params.docId;

      const document = await prisma.dealDocument.findUnique({
        where: { id: docId },
        include: {
          dealRoom: {
            include: {
              property: { select: { userId: true, amenities: true } },
              requests: {
                where: { status: 'ACCEPTED' },
                include: {
                  professional: { include: { user: { select: { id: true } } } },
                },
              },
              participants: {
                where: { removedAt: null },
                select: { userId: true, role: true },
              },
            },
          },
        },
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const access = await checkDealParticipantAccess(document.dealRoomId, userId);
      if (!access.allowed || !access.participant) {
        return res.status(403).json({ error: access.reason || 'Access denied' });
      }

      const userRole = access.participant.role;
      const isProfessional = ['LAWYER', 'NOTARY', 'ENGINEER', 'ADMIN'].includes(userRole);
      const isRequester = document.requestedById === userId;

      let allowDelete = false;

      if (document.status === 'REQUESTED' && isProfessional && isRequester) {
        allowDelete = true;
      } else {
        const ctx = buildSellerFolderDealContext(document.dealRoom);
        const docLike = {
          id: document.id,
          dealRoomId: document.dealRoomId,
          category: document.category,
          status: document.status,
          requestedFromRole: document.requestedFromRole,
          requestedById: document.requestedById,
          uploadedById: document.uploadedById,
          reviewById: document.reviewById,
        };
        if (canRemoveSellerFolderTotalDocument(docLike, ctx, userId, userRole)) {
          allowDelete = true;
        } else if (canEngineerRemoveHtkTotalDocument(docLike, userId, userRole)) {
          allowDelete = true;
        }
      }

      if (!allowDelete) {
        if (document.status === 'REQUESTED') {
          return res.status(403).json({
            error: 'Only the professional who requested the document can delete it',
          });
        }
        return res.status(403).json({
          error: 'You are not allowed to delete this document',
        });
      }

      const s3Key = document.s3Key;
      if (s3Key) {
        if (typeof s3Key === 'string' && s3Key.startsWith('local:')) {
          const relPath = s3Key.replace('local:', '');
          const filePath = path.join(process.cwd(), 'public', 'uploads', relPath);
          await fs.unlink(filePath).catch(() => {});
        } else if (s3Client && process.env.AWS_S3_BUCKET) {
          try {
            await s3Client.send(
              new DeleteObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: s3Key,
              })
            );
          } catch (s3Err) {
            console.error('[DELETE /documents/:docId] S3 delete failed:', s3Err);
          }
        }
      }

      await prisma.dealDocument.delete({
        where: { id: docId },
      });

      auditLogger.documentDeleted(req, docId, document.dealRoomId);

      publishDealEvent(document.dealRoomId, {
        type: 'document_deleted',
        docId: docId,
        actorUserId: userId,
        summary: `Document ${document.category} deleted`,
        metadata: {
          category: document.category,
        },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting document:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'DELETE /api/documents/:docId' },
        extra: { userId: req.userId, docId: req.params.docId },
      });
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }
);

// GET /api/documents/:docId/file - Stream local file (when S3 not configured)
router.get(
  '/documents/:docId/file',
  docDownloadUrlLimiter,
  validateJwtToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const docId = req.params.docId;

      const accessResult = await canAccessDealDocument(docId, userId);
      if (!accessResult.allowed) {
        return res.status(403).json({ error: accessResult.reason || 'Access denied' });
      }

      const document = await prisma.dealDocument.findUnique({
        where: { id: docId },
        select: { s3Key: true, fileName: true, mimeType: true, dealRoomId: true },
      });

      if (!document || !document.s3Key || !String(document.s3Key).startsWith('local:')) {
        return res.status(404).json({ error: 'Document not found or not local' });
      }

      const relPath = String(document.s3Key).replace('local:', '');
      const filePath = path.join(process.cwd(), 'public', 'uploads', relPath);

      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ error: 'File not found' });
      }

      auditLogger.documentDownloaded(req, docId, document.dealRoomId);

      res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${document.fileName || 'document'}"`);
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error('Error streaming document:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'GET /api/documents/:docId/file' },
        extra: { userId: req.userId, docId: req.params.docId },
      });
      res.status(500).json({ error: 'Failed to stream document' });
    }
  }
);

// GET /api/documents/:docId/download-url - Get signed URL (CRITICAL IDOR CHECK)
router.get(
  '/documents/:docId/download-url',
  docDownloadUrlLimiter,
  validateJwtToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const docId = req.params.docId;
      const expiresIn = req.query.expiresIn ? parseInt(req.query.expiresIn as string, 10) : 300;

      // Validate expiresIn
      if (expiresIn < 60 || expiresIn > 3600) {
        return res.status(400).json({ error: 'expiresIn must be between 60 and 3600 seconds' });
      }

      // CRITICAL: Verify document access
      const accessResult = await canAccessDealDocument(docId, userId);
      if (!accessResult.allowed) {
        return res.status(403).json({ error: accessResult.reason || 'Access denied' });
      }

      // Get document (to get s3Key and fileName)
      const document = await prisma.dealDocument.findUnique({
        where: { id: docId },
        select: { s3Key: true, dealRoomId: true, fileName: true },
      });

      if (!document || !document.s3Key) {
        return res.status(404).json({ error: 'Document not found or not uploaded' });
      }

      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      let url: string;

      // Local file (when S3 not configured)
      if (typeof document.s3Key === 'string' && document.s3Key.startsWith('local:')) {
        const baseUrl = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 3001}`;
        url = `${baseUrl}/api/documents/${docId}/file`;
      } else {
        const signedUrl = await generateSignedUrl(document.s3Key, expiresIn);
        if (!signedUrl) {
          return res.status(500).json({ error: 'Failed to generate signed URL' });
        }
        url = signedUrl;
      }

      // Audit log (NEVER log s3Key, only docId)
      auditLogger.documentDownloaded(req, docId, document.dealRoomId);

      res.json({
        url,
        expiresAt: expiresAt.toISOString(),
        expiresIn,
      });
    } catch (error) {
      console.error('Error generating download URL:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'GET /api/documents/:docId/download-url' },
        extra: { userId: req.userId, docId: req.params.docId },
      });
      res.status(500).json({ error: 'Failed to generate download URL' });
    }
  }
);

// PATCH /api/deals/:dealId/documents/:docId/update-guide - Update document guide (lawyer/notary only)
router.patch(
  '/deals/:dealId/documents/:docId/update-guide',
  generalRateLimit,
  validateJwtToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const dealId = req.params.dealId;
      const docId = req.params.docId;
      const { guideWhere, guideInstructions } = req.body;

      // Get document and verify access
      const document = await prisma.dealDocument.findUnique({
        where: { id: docId },
        include: {
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

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      if (document.dealRoomId !== dealId) {
        return res.status(400).json({ error: 'Document does not belong to this deal' });
      }

      const participant = document.dealRoom.participants[0];
      if (!participant || !['LAWYER', 'NOTARY', 'ENGINEER', 'ADMIN'].includes(participant.role)) {
        return res.status(403).json({ error: 'Only lawyers, notaries, engineers, or admins can update document guides' });
      }

      // Update document guide fields
      const updated = await prisma.dealDocument.update({
        where: { id: docId },
        data: {
          guideWhere: guideWhere !== undefined ? guideWhere : document.guideWhere,
          guideInstructions: guideInstructions !== undefined ? guideInstructions : document.guideInstructions,
        },
        select: {
          id: true,
          category: true,
          guideWhere: true,
          guideInstructions: true,
          updatedAt: true,
        },
      });

      auditLogger.documentUpdated(req, updated.id, document.dealRoomId);

      // Publish event
      publishDealEvent(document.dealRoomId, {
        type: 'document_guide_updated',
        docId: updated.id,
        actorUserId: userId,
        summary: `Document guide updated for ${updated.category}`,
        metadata: {
          category: updated.category,
        },
      });

      res.json(updated);
    } catch (error) {
      console.error('Error updating document guide:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'PATCH /api/deals/:dealId/documents/:docId/update-guide' },
        extra: { userId: req.userId, dealId: req.params.dealId, docId: req.params.docId },
      });
      res.status(500).json({ error: 'Failed to update document guide' });
    }
  }
);

export default router;

