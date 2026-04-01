# Deal Room Model - Implementation Plan

**Last Updated:** 2025-01-XX  
**Status:** Ready for Implementation  
**Related:** `docs/DEAL_ROOM_SPEC.md`

---

## Table of Contents

1. [Phase 1: Data Model (Prisma)](#phase-1-data-model-prisma)
2. [Phase 2: Backend Routes + Security](#phase-2-backend-routes--security)
3. [Phase 3: Frontend UI Integration](#phase-3-frontend-ui-integration)
4. [Phase 4: GDPR / Security / Compliance](#phase-4-gdpr--security--compliance)
5. [Phase 5: Testing & Smoke Scripts](#phase-5-testing--smoke-scripts)
6. [Implementation Order Checklist](#implementation-order-checklist)

---

## Phase 1: Data Model (Prisma)

### 1.1 Prisma Schema Updates

**File:** `backend/prisma/schema.prisma`

Add the following models after the existing models:

```prisma
// ============================================
// DEAL ROOM MODELS
// ============================================

enum ProfessionalType {
  LAWYER
  NOTARY
}

enum VerificationStatus {
  PENDING
  VERIFIED
  REJECTED
}

model ProfessionalProfile {
  id                String   @id @default(cuid())
  userId            String   @unique
  type              ProfessionalType
  displayName       String
  officeName        String?
  phone             String?
  city              String?
  areaTags          String[] // e.g. ["Athens", "Palaio Faliro"]
  address           String?
  bio               String?
  languages         String[]
  services          Json?
  verificationStatus VerificationStatus @default(PENDING)
  verifiedAt        DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  user              User     @relation("ProfessionalProfile", fields: [userId], references: [id], onDelete: Cascade)
  availability      ProfessionalAvailability?
  requests          ProfessionalRequest[]
  appointments      DealAppointment[]
  
  @@index([type])
  @@index([verificationStatus])
  @@index([city])
  @@map("professional_profiles")
}

model ProfessionalAvailability {
  id             String @id @default(cuid())
  professionalId String @unique
  timezone       String @default("Europe/Athens")
  weeklyRules    Json   // ex: [{ weekday: 1, start: "10:00", end: "14:00" }, ...]
  exceptions     Json?  // ex: [{ date: "2026-01-12", unavailable: true }, ...]
  meetingTypes   String[] // ["ONLINE", "IN_PERSON"]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  professional   ProfessionalProfile @relation(fields: [professionalId], references: [id], onDelete: Cascade)
  
  @@map("professional_availability")
}

enum DealStatus {
  DRAFT
  ACTIVE
  CLOSED
  CANCELLED
}

enum DealRole {
  BUYER
  SELLER
  AGENT
  LAWYER
  NOTARY
  ADMIN
}

model DealRoom {
  id         String @id @default(cuid())
  propertyId String
  buyerId    String
  sellerId   String? // optional (derived from Property.userId)
  agentId    String? // optional if agent is attached via referral/lead
  status     DealStatus @default(DRAFT)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  property   Property @relation("DealRoomProperty", fields: [propertyId], references: [id], onDelete: Cascade)
  buyer      User     @relation("DealBuyer", fields: [buyerId], references: [id], onDelete: Cascade)
  seller     User?    @relation("DealSeller", fields: [sellerId], references: [id], onDelete: SetNull)
  agent      User?    @relation("DealAgent", fields: [agentId], references: [id], onDelete: SetNull)

  participants DealParticipant[]
  requests     ProfessionalRequest[]
  threads      DealThread[]
  documents    DealDocument[]
  appointments DealAppointment[]

  @@unique([propertyId, buyerId]) // prevent duplicate rooms per buyer-property
  @@index([buyerId])
  @@index([propertyId])
  @@index([status])
  @@map("deal_rooms")
}

model DealParticipant {
  id         String @id @default(cuid())
  dealRoomId String
  userId     String
  role       DealRole
  permissions Json? // e.g. { canSeeSellerDocs: true, canSeeBuyerDocs: true } - keep minimal first
  joinedAt   DateTime @default(now())
  removedAt  DateTime?
  
  dealRoom   DealRoom @relation(fields: [dealRoomId], references: [id], onDelete: Cascade)
  user       User     @relation("DealParticipant", fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([dealRoomId, userId])
  @@index([userId])
  @@index([dealRoomId])
  @@map("deal_participants")
}

enum RequestStatus {
  REQUESTED
  ACCEPTED
  DECLINED
  CANCELLED
}

model ProfessionalRequest {
  id             String @id @default(cuid())
  dealRoomId     String
  professionalId String
  requestedById  String
  type           ProfessionalType
  status         RequestStatus @default(REQUESTED)
  message        String?
  respondedAt    DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  dealRoom       DealRoom @relation(fields: [dealRoomId], references: [id], onDelete: Cascade)
  professional   ProfessionalProfile @relation(fields: [professionalId], references: [id], onDelete: Cascade)
  requestedBy    User     @relation("ProfessionalRequestRequester", fields: [requestedById], references: [id], onDelete: Cascade)

  @@index([dealRoomId])
  @@index([professionalId])
  @@index([requestedById])
  @@unique([dealRoomId, professionalId]) // prevent duplicates
  @@map("professional_requests")
}

enum ThreadType {
  GROUP
  DIRECT
}

model DealThread {
  id         String @id @default(cuid())
  dealRoomId String
  type       ThreadType @default(GROUP)
  title      String?
  createdAt  DateTime @default(now())
  
  dealRoom   DealRoom @relation(fields: [dealRoomId], references: [id], onDelete: Cascade)
  members    DealThreadMember[]
  messages   DealMessage[]
  
  @@index([dealRoomId])
  @@index([type])
  @@map("deal_threads")
}

model DealThreadMember {
  id        String @id @default(cuid())
  threadId  String
  userId    String
  joinedAt  DateTime @default(now())
  
  thread    DealThread @relation(fields: [threadId], references: [id], onDelete: Cascade)
  user      User       @relation("DealThreadMember", fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([threadId, userId])
  @@index([userId])
  @@index([threadId])
  @@map("deal_thread_members")
}

model DealMessage {
  id        String @id @default(cuid())
  threadId  String
  senderId  String
  body      String
  createdAt DateTime @default(now())
  // future: editedAt, deletedAt, attachments
  
  thread    DealThread @relation(fields: [threadId], references: [id], onDelete: Cascade)
  sender    User       @relation("DealMessageSender", fields: [senderId], references: [id], onDelete: Cascade)
  
  @@index([threadId, createdAt])
  @@map("deal_messages")
}

enum DocumentCategory {
  IDENTITY
  TAX_E9
  TITLE_DEEDS
  CONTRACT_DRAFT
  POWER_OF_ATTORNEY
  OTHER
}

enum DocumentStatus {
  REQUESTED
  UPLOADED
  UNDER_REVIEW
  APPROVED
  CHANGES_REQUESTED
}

model DealDocument {
  id         String @id @default(cuid())
  dealRoomId String
  category   DocumentCategory
  status     DocumentStatus @default(REQUESTED)
  requestedById String? // lawyer/notary who requested
  requestedFromRole DealRole? // BUYER/SELLER
  uploadedById String?
  reviewById   String?
  reviewNote   String?
  s3Key        String?
  fileName     String?
  mimeType     String?
  sizeBytes    Int?
  visibility   Json? // { visibleToRoles: ["BUYER","LAWYER","NOTARY"] } minimal
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  dealRoom  DealRoom @relation(fields: [dealRoomId], references: [id], onDelete: Cascade)
  requestedBy User?  @relation("DealDocumentRequester", fields: [requestedById], references: [id], onDelete: SetNull)
  uploadedBy User?   @relation("DealDocumentUploader", fields: [uploadedById], references: [id], onDelete: SetNull)
  reviewedBy User?   @relation("DealDocumentReviewer", fields: [reviewById], references: [id], onDelete: SetNull)
  
  @@index([dealRoomId])
  @@index([status])
  @@index([category])
  @@map("deal_documents")
}

enum AppointmentStatus {
  REQUESTED
  CONFIRMED
  CANCELLED
  COMPLETED
}

model DealAppointment {
  id            String @id @default(cuid())
  dealRoomId    String
  professionalId String
  bookedById    String // buyer (usually)
  startAt       DateTime
  endAt         DateTime
  type          String // "ONLINE" | "IN_PERSON"
  location      String?
  meetingLink   String?
  status        AppointmentStatus @default(REQUESTED)
  note          String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  dealRoom      DealRoom @relation(fields: [dealRoomId], references: [id], onDelete: Cascade)
  professional  ProfessionalProfile @relation(fields: [professionalId], references: [id], onDelete: Cascade)
  bookedBy      User     @relation("DealAppointmentBooker", fields: [bookedById], references: [id], onDelete: Cascade)
  
  @@index([dealRoomId])
  @@index([professionalId, startAt])
  @@index([bookedById])
  @@map("deal_appointments")
}
```

### 1.2 Update User Model Relations

Add these relations to the `User` model in `schema.prisma`:

```prisma
model User {
  // ... existing fields ...
  
  // Deal Room relations
  professionalProfile ProfessionalProfile? @relation("ProfessionalProfile")
  dealRoomsAsBuyer    DealRoom[]            @relation("DealBuyer")
  dealRoomsAsSeller   DealRoom[]            @relation("DealSeller")
  dealRoomsAsAgent    DealRoom[]            @relation("DealAgent")
  dealParticipants    DealParticipant[]     @relation("DealParticipant")
  professionalRequestsMade ProfessionalRequest[] @relation("ProfessionalRequestRequester")
  dealThreadMembers   DealThreadMember[]    @relation("DealThreadMember")
  dealMessages        DealMessage[]        @relation("DealMessageSender")
  dealDocumentsRequested DealDocument[]    @relation("DealDocumentRequester")
  dealDocumentsUploaded DealDocument[]     @relation("DealDocumentUploader")
  dealDocumentsReviewed DealDocument[]     @relation("DealDocumentReviewer")
  dealAppointmentsBooked DealAppointment[] @relation("DealAppointmentBooker")
}
```

### 1.3 Update Property Model Relations

Add this relation to the `Property` model:

```prisma
model Property {
  // ... existing fields ...
  
  dealRooms DealRoom[] @relation("DealRoomProperty")
}
```

### 1.4 Create Migration

**Checklist:**
- [ ] Add all models to `schema.prisma`
- [ ] Update `User` model relations
- [ ] Update `Property` model relations
- [ ] Run `npx prisma format` to validate schema
- [ ] Run `npx prisma migrate dev --name add_deal_room_models`
- [ ] Verify migration SQL looks correct
- [ ] Run `npx prisma generate` to update Prisma Client

**Migration Command:**
```bash
cd backend
npx prisma migrate dev --name add_deal_room_models
```

---

## Phase 2: Backend Routes + Security

### 2.1 Create Authorization Utilities

**File:** `backend/src/lib/utils/deal-authorization.ts`

```typescript
/**
 * Deal Room Authorization Utilities
 * Prevents IDOR/BOLA vulnerabilities
 */

import { prisma } from '../prisma';
import { AuthorizationResult } from './authorization';

/**
 * Check if user is a participant in a deal room
 */
export async function checkDealParticipantAccess(
  dealRoomId: string,
  userId: string
): Promise<AuthorizationResult & { participant?: { role: string; permissions?: any } }> {
  try {
    const participant = await prisma.dealParticipant.findUnique({
      where: {
        dealRoomId_userId: {
          dealRoomId,
          userId,
        },
      },
      select: {
        role: true,
        permissions: true,
        removedAt: true,
      },
    });

    if (!participant) {
      return { allowed: false, reason: 'User is not a participant in this deal room' };
    }

    if (participant.removedAt) {
      return { allowed: false, reason: 'User has been removed from this deal room' };
    }

    return { allowed: true, participant };
  } catch (error) {
    console.error('Error checking deal participant access:', error);
    return { allowed: false, reason: 'Error checking access' };
  }
}

/**
 * Check if user has specific role(s) in deal room
 */
export async function checkDealRole(
  dealRoomId: string,
  userId: string,
  allowedRoles: string[]
): Promise<AuthorizationResult> {
  const result = await checkDealParticipantAccess(dealRoomId, userId);
  
  if (!result.allowed || !result.participant) {
    return result;
  }

  if (!allowedRoles.includes(result.participant.role)) {
    return { allowed: false, reason: `User role ${result.participant.role} not allowed. Required: ${allowedRoles.join(', ')}` };
  }

  return { allowed: true };
}

/**
 * Check if user can access a deal document
 */
export async function canAccessDealDocument(
  documentId: string,
  userId: string
): Promise<AuthorizationResult> {
  try {
    const document = await prisma.dealDocument.findUnique({
      where: { id: documentId },
      include: {
        dealRoom: {
          include: {
            participants: {
              where: { userId },
              select: { role: true, permissions: true },
            },
          },
        },
      },
    });

    if (!document) {
      return { allowed: false, reason: 'Document not found' };
    }

    const participant = document.dealRoom.participants[0];
    if (!participant) {
      return { allowed: false, reason: 'User is not a participant' };
    }

    // Check visibility rules
    const visibility = document.visibility as { visibleToRoles?: string[] } | null;
    if (visibility?.visibleToRoles) {
      if (!visibility.visibleToRoles.includes(participant.role)) {
        return { allowed: false, reason: 'Document not visible to your role' };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking document access:', error);
    return { allowed: false, reason: 'Error checking access' };
  }
}

/**
 * Check if user can access a deal thread
 */
export async function canAccessDealThread(
  threadId: string,
  userId: string
): Promise<AuthorizationResult> {
  try {
    const member = await prisma.dealThreadMember.findUnique({
      where: {
        threadId_userId: {
          threadId,
          userId,
        },
      },
    });

    if (!member) {
      return { allowed: false, reason: 'User is not a member of this thread' };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking thread access:', error);
    return { allowed: false, reason: 'Error checking access' };
  }
}
```

### 2.2 Create Authorization Middleware

**File:** `backend/src/middleware/authorization.ts` (add to existing file)

```typescript
import {
  checkDealParticipantAccess,
  checkDealRole,
  canAccessDealDocument,
  canAccessDealThread,
} from '../lib/utils/deal-authorization';

/**
 * Middleware to require deal participant access
 */
export const requireDealParticipant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const dealRoomId = req.params.dealId || req.params.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!dealRoomId) {
      res.status(400).json({ error: 'Deal room ID is required' });
      return;
    }

    const result = await checkDealParticipantAccess(dealRoomId, userId);

    if (!result.allowed) {
      auditLogger.authorizationFailed(req, 'deal_room', dealRoomId, result.reason || 'Access denied');
      res.status(403).json({ error: result.reason || 'You do not have permission to access this deal room' });
      return;
    }

    // Attach participant info to request for use in handlers
    (req as any).dealParticipant = result.participant;
    next();
  } catch (error) {
    console.error('Authorization middleware error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
    return;
  }
};

/**
 * Middleware to require specific deal role(s)
 */
export const requireDealRole = (...roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId;
      const dealRoomId = req.params.dealId || req.params.id;

      if (!userId || !dealRoomId) {
        res.status(400).json({ error: 'User ID and deal room ID are required' });
        return;
      }

      const result = await checkDealRole(dealRoomId, userId, roles);

      if (!result.allowed) {
        auditLogger.authorizationFailed(req, 'deal_room', dealRoomId, result.reason || 'Access denied');
        res.status(403).json({ error: result.reason || 'You do not have permission' });
        return;
      }

      next();
    } catch (error) {
      console.error('Authorization middleware error:', error);
      res.status(500).json({ error: 'Authorization check failed' });
      return;
    }
  };
};
```

### 2.3 Create Validation Schemas

**File:** `backend/src/lib/validation/schemas.ts` (add to existing file)

```typescript
import { z } from 'zod';

// Deal Room Schemas

export const createDealRoomSchema = z.object({
  propertyId: z.string().min(1, 'Property ID is required'),
}).strict();

export const requestProfessionalSchema = z.object({
  professionalId: z.string().min(1, 'Professional ID is required'),
  message: z.string().max(1000).optional(),
}).strict();

export const createDirectThreadSchema = z.object({
  otherUserId: z.string().min(1, 'Other user ID is required'),
}).strict();

export const sendMessageSchema = z.object({
  body: z.string().min(1, 'Message body is required').max(5000, 'Message too long'),
}).strict();

export const requestDocumentSchema = z.object({
  category: z.enum(['IDENTITY', 'TAX_E9', 'TITLE_DEEDS', 'CONTRACT_DRAFT', 'POWER_OF_ATTORNEY', 'OTHER']),
  requestedFromRole: z.enum(['BUYER', 'SELLER']),
  note: z.string().max(500).optional(),
}).strict();

export const reviewDocumentSchema = z.object({
  status: z.enum(['APPROVED', 'CHANGES_REQUESTED']),
  note: z.string().max(1000).optional(),
}).strict();

export const requestAppointmentSchema = z.object({
  professionalId: z.string().min(1, 'Professional ID is required'),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  type: z.enum(['ONLINE', 'IN_PERSON']),
  note: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
}).strict();

export const registerProfessionalSchema = z.object({
  type: z.enum(['LAWYER', 'NOTARY']),
  displayName: z.string().min(1).max(200),
  officeName: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  city: z.string().max(100).optional(),
  areaTags: z.array(z.string()).default([]),
  address: z.string().max(500).optional(),
  bio: z.string().max(2000).optional(),
  languages: z.array(z.string()).default([]),
  services: z.record(z.any()).optional(),
}).strict();

export const updateAvailabilitySchema = z.object({
  timezone: z.string().default('Europe/Athens'),
  weeklyRules: z.array(z.object({
    weekday: z.number().int().min(0).max(6),
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  })),
  exceptions: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    unavailable: z.boolean(),
  })).optional(),
  meetingTypes: z.array(z.enum(['ONLINE', 'IN_PERSON'])).default([]),
}).strict();
```

### 2.4 Create Rate Limiters

**File:** `backend/src/middleware/rateLimit.ts` (add to existing file)

```typescript
// Deal Room Rate Limiters

export const dealCreationRateLimit = rateLimit({
  keyPrefix: 'rl_deal_create',
  points: 10,
  duration: 3600, // 1 hour
  blockDuration: 3600,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    return authReq.userId || req.ip || 'unknown';
  },
});

export const professionalRequestRateLimit = rateLimit({
  keyPrefix: 'rl_professional_request',
  points: 10,
  duration: 86400, // 24 hours
  blockDuration: 3600,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    return authReq.userId || req.ip || 'unknown';
  },
});

export const chatMessageRateLimit = rateLimit({
  keyPrefix: 'rl_chat_message',
  points: 30,
  duration: 60, // 1 minute
  blockDuration: 60,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    const threadId = (req as any).params?.threadId || 'unknown';
    return `${authReq.userId || req.ip || 'unknown'}_${threadId}`;
  },
});

export const documentDownloadRateLimit = rateLimit({
  keyPrefix: 'rl_doc_download',
  points: 60,
  duration: 3600, // 1 hour
  blockDuration: 3600,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    return authReq.userId || req.ip || 'unknown';
  },
});
```

### 2.5 Create Deal Routes

**File:** `backend/src/routes/deals.ts`

```typescript
import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, AuthRequest } from '../middleware/auth';
import { requireDealParticipant, requireDealRole } from '../middleware/authorization';
import { validateBody, validateQuery } from '../middleware/validation';
import { createDealRoomSchema } from '../lib/validation/schemas';
import { parsePagination, createPaginationMeta } from '../lib/validation/pagination';
import { dealCreationRateLimit } from '../middleware/rateLimit';
import { auditLogger } from '../lib/utils/audit-logger';

const router = Router();

// POST /api/deals - Create or get existing deal room
router.post(
  '/',
  dealCreationRateLimit,
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
              address: true,
              price: true,
              images: true,
            },
          },
        },
      });

      if (!dealRoom) {
        // Create new deal room
        dealRoom = await prisma.dealRoom.create({
          data: {
            propertyId,
            buyerId: userId,
            sellerId: property.userId,
            status: 'DRAFT',
            participants: {
              create: [
                { userId, role: 'BUYER' },
                { userId: property.userId, role: 'SELLER' },
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
                address: true,
                price: true,
                images: true,
              },
            },
          },
        });

        auditLogger.dealCreated(req, dealRoom.id);
      }

      res.json(dealRoom);
    } catch (error) {
      console.error('Error creating deal room:', error);
      res.status(500).json({ error: 'Failed to create deal room' });
    }
  }
);

// GET /api/deals - List user's deal rooms
router.get(
  '/',
  validateJwtToken,
  validateQuery(z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED', 'CANCELLED']).optional(),
  })),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const { page, limit, skip } = parsePagination(req.query);
      const status = req.query.status as string | undefined;

      const where = {
        participants: {
          some: { userId },
        },
        ...(status && { status }),
      };

      const [dealRooms, total] = await Promise.all([
        prisma.dealRoom.findMany({
          where,
          skip,
          take: limit,
          include: {
            property: {
              select: {
                id: true,
                title: true,
                address: true,
                price: true,
                images: true,
              },
            },
            participants: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
            _count: {
              select: {
                threads: true,
                documents: true,
                appointments: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.dealRoom.count({ where }),
      ]);

      const pagination = createPaginationMeta(page, limit, total);

      res.json({ data: dealRooms, pagination });
    } catch (error) {
      console.error('Error fetching deal rooms:', error);
      res.status(500).json({ error: 'Failed to fetch deal rooms' });
    }
  }
);

// GET /api/deals/:id - Get deal room details
router.get(
  '/:id',
  validateJwtToken,
  requireDealParticipant,
  async (req: AuthRequest, res: Response) => {
    try {
      const dealRoomId = req.params.id;

      const dealRoom = await prisma.dealRoom.findUnique({
        where: { id: dealRoomId },
        include: {
          property: true,
          participants: {
            include: { user: { select: { id: true, name: true, email: true, image: true } } },
          },
          requests: {
            include: {
              professional: {
                include: { user: { select: { id: true, name: true, email: true } } },
              },
            },
          },
          threads: {
            include: {
              members: { select: { userId: true } },
              _count: { select: { messages: true } },
            },
          },
          documents: {
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
        },
      });

      if (!dealRoom) {
        return res.status(404).json({ error: 'Deal room not found' });
      }

      res.json(dealRoom);
    } catch (error) {
      console.error('Error fetching deal room:', error);
      res.status(500).json({ error: 'Failed to fetch deal room' });
    }
  }
);

export default router;
```

**Continue with remaining routes...** (See full implementation in separate files)

### 2.6 Register Routes in Main App

**File:** `backend/src/index.ts` (add to existing routes)

```typescript
import dealsRouter from './routes/deals';
import professionalsRouter from './routes/professionals';
import dealChatRouter from './routes/deal-chat';
import dealDocumentsRouter from './routes/deal-documents';
import dealAppointmentsRouter from './routes/deal-appointments';

// ... existing app setup ...

app.use('/api/deals', dealsRouter);
app.use('/api/professionals', professionalsRouter);
app.use('/api/deal-chat', dealChatRouter);
app.use('/api/deal-documents', dealDocumentsRouter);
app.use('/api/deal-appointments', dealAppointmentsRouter);
```

**Checklist:**
- [ ] Create `deal-authorization.ts` utilities
- [ ] Add authorization middleware
- [ ] Create validation schemas
- [ ] Create rate limiters
- [ ] Create `deals.ts` route file
- [ ] Create `professionals.ts` route file
- [ ] Create `deal-chat.ts` route file
- [ ] Create `deal-documents.ts` route file
- [ ] Create `deal-appointments.ts` route file
- [ ] Register all routes in `index.ts`
- [ ] Add audit logging to all endpoints
- [ ] Test all endpoints with Postman/curl

---

## Phase 3: Frontend UI Integration

### 3.1 Create API Client Functions

**File:** `listings/frontend/src/lib/api/deals.ts`

```typescript
import { apiClient } from './client'; // Assuming existing API client

export interface DealRoom {
  id: string;
  propertyId: string;
  buyerId: string;
  sellerId?: string;
  agentId?: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  property: {
    id: string;
    title: string;
    address: string;
    price: number;
    images: string[];
  };
  participants: Array<{
    id: string;
    role: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

export async function createDealRoom(propertyId: string): Promise<DealRoom> {
  const { data } = await apiClient.post('/deals', { propertyId });
  return data;
}

export async function getDealRooms(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{ data: DealRoom[]; pagination: any }> {
  const { data } = await apiClient.get('/deals', { params });
  return data;
}

export async function getDealRoom(dealId: string): Promise<DealRoom> {
  const { data } = await apiClient.get(`/deals/${dealId}`);
  return data;
}
```

**Create similar files for:**
- `professionals.ts`
- `dealChat.ts`
- `dealDocs.ts`
- `dealAppointments.ts`

### 3.2 Create Deal Room Pages

**File:** `listings/frontend/src/app/deals/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getDealRooms, DealRoom } from '@/lib/api/deals';

export default function DealsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [dealRooms, setDealRooms] = useState<DealRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }

    loadDealRooms();
  }, [session]);

  const loadDealRooms = async () => {
    try {
      const result = await getDealRooms();
      setDealRooms(result.data);
    } catch (error) {
      console.error('Error loading deal rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Deals</h1>
      
      {dealRooms.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No deal rooms yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dealRooms.map((deal) => (
            <Link
              key={deal.id}
              href={`/deals/${deal.id}`}
              className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2">{deal.property.title}</h2>
              <p className="text-gray-600 mb-4">{deal.property.address}</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Status: {deal.status}</span>
                <span className="text-lg font-bold">{deal.property.price.toLocaleString()} €</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

**File:** `listings/frontend/src/app/deals/[dealId]/page.tsx`

Create comprehensive deal room detail page with:
- Property summary card
- Participants list
- Timeline/progress section
- Professionals selection (buyer only)
- Chat section (threads + messages)
- Documents section
- Appointments section

### 3.3 Update Dashboards

**File:** `listings/frontend/src/app/dashboard/buyer/page.tsx`

Add "My Deals" section/widget:

```typescript
// Add to existing component
const [dealRooms, setDealRooms] = useState([]);

useEffect(() => {
  // Load deal rooms
  loadDealRooms();
}, []);

// Add widget in JSX
<div className="mb-6">
  <h2 className="text-xl font-semibold mb-4">My Deals</h2>
  {dealRooms.length > 0 ? (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {dealRooms.slice(0, 4).map((deal) => (
        <Link
          key={deal.id}
          href={`/deals/${deal.id}`}
          className="border rounded-lg p-4 hover:shadow-md"
        >
          <h3 className="font-semibold">{deal.property.title}</h3>
          <p className="text-sm text-gray-600">{deal.status}</p>
        </Link>
      ))}
    </div>
  ) : (
    <p className="text-gray-500">No active deals</p>
  )}
  <Link href="/deals" className="text-blue-600 hover:underline">
    View all deals →
  </Link>
</div>
```

**Similar updates for:**
- `dashboard/seller/page.tsx`
- `dashboard/agent/page.tsx`

### 3.4 Update Navigation

**File:** `listings/frontend/src/components/navigation/DynamicNavbar.tsx`

Add "Deals" link for buyer/seller/agent roles:

```typescript
// In getRoleSpecificLinks or similar function
{
  label: 'Deals',
  icon: <FaHandshake />,
  href: '/deals',
}
```

**Checklist:**
- [ ] Create API client functions for all deal room endpoints
- [ ] Create `/deals` list page
- [ ] Create `/deals/[dealId]` detail page
- [ ] Create professional directory page
- [ ] Create professional dashboard
- [ ] Update buyer dashboard with "My Deals" widget
- [ ] Update seller dashboard with "Deals" widget
- [ ] Update agent dashboard with "Deals" widget
- [ ] Update navigation to include "Deals" link
- [ ] Test all UI flows

---

## Phase 4: GDPR / Security / Compliance

### 4.1 Update DSAR Export

**File:** `backend/src/lib/utils/export-helpers.ts`

Add deal room data collection:

```typescript
// In collectUserDataForExport function, add:

// Deal Rooms (where user is participant)
const dealRooms = await prisma.dealRoom.findMany({
  where: {
    participants: {
      some: { userId },
    },
  },
  include: {
    property: {
      select: {
        id: true,
        title: true,
        address: true,
      },
    },
    participants: {
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    },
  },
  orderBy: { createdAt: 'desc' },
});

// Deal Messages (authored by user)
const dealMessages = await prisma.dealMessage.findMany({
  where: { senderId: userId },
  include: {
    thread: {
      select: {
        id: true,
        type: true,
        dealRoomId: true,
      },
    },
  },
  orderBy: { createdAt: 'desc' },
  take: limits?.messages || 1000,
});

// Deal Documents (metadata only, not file content)
const dealDocuments = await prisma.dealDocument.findMany({
  where: {
    dealRoom: {
      participants: {
        some: { userId },
      },
    },
  },
  select: {
    id: true,
    category: true,
    status: true,
    fileName: true,
    createdAt: true,
    updatedAt: true,
    // Exclude: s3Key, file content
  },
  orderBy: { createdAt: 'desc' },
});

// Add to exportData object
exportData.dealRooms = dealRooms.map(room => ({
  id: room.id,
  propertyId: room.propertyId,
  propertyTitle: room.property.title,
  status: room.status,
  role: room.participants.find(p => p.userId === userId)?.role,
  createdAt: room.createdAt,
  updatedAt: room.updatedAt,
}));

exportData.dealMessages = dealMessages.map(msg => ({
  id: msg.id,
  threadId: msg.threadId,
  body: msg.body,
  createdAt: msg.createdAt,
}));

exportData.dealDocuments = dealDocuments;
```

### 4.2 Update Account Deletion

**File:** `backend/src/routes/user.ts`

Add deal room cleanup:

```typescript
// In account deletion handler, add:

// Remove user from deal participants
await prisma.dealParticipant.updateMany({
  where: { userId },
  data: { removedAt: new Date() },
});

// Anonymize deal messages
await prisma.dealMessage.updateMany({
  where: { senderId: userId },
  data: {
    body: '[Message deleted]',
  },
});

// Queue deal documents for S3 deletion
const dealDocs = await prisma.dealDocument.findMany({
  where: { uploadedById: userId },
  select: { s3Key: true },
});

for (const doc of dealDocs) {
  if (doc.s3Key) {
    await prisma.fileDeletionJob.create({
      data: {
        userId,
        s3Key: doc.s3Key,
        status: 'QUEUED',
      },
    });
  }
}
```

### 4.3 Update Audit Logger

**File:** `backend/src/lib/utils/audit-logger.ts`

Add new event types:

```typescript
export type AuditEventType =
  // ... existing types ...
  | 'deal.created'
  | 'deal.professional_requested'
  | 'deal.professional_accepted'
  | 'deal.professional_declined'
  | 'deal.thread_created'
  | 'deal.message_sent'
  | 'deal.document_requested'
  | 'deal.document_uploaded'
  | 'deal.document_reviewed'
  | 'deal.document_downloaded'
  | 'deal.appointment_requested'
  | 'deal.appointment_confirmed'
  | 'deal.appointment_cancelled';

// Add convenience functions
export const auditLogger = {
  // ... existing functions ...
  
  dealCreated: (req: Request | AuthRequest, dealRoomId: string) => {
    auditLog(req, 'deal.created', 'Deal room created', 'success', {
      resourceType: 'deal_room',
      resourceId: dealRoomId,
    });
  },
  
  professionalRequested: (req: Request | AuthRequest, dealRoomId: string, professionalId: string) => {
    auditLog(req, 'deal.professional_requested', 'Professional requested', 'success', {
      resourceType: 'deal_room',
      resourceId: dealRoomId,
      details: { professionalId },
    });
  },
  
  // ... add all other convenience functions ...
};
```

**Checklist:**
- [ ] Update DSAR export to include deal room data
- [ ] Update account deletion to handle deal rooms
- [ ] Update audit logger with new event types
- [ ] Test DSAR export includes deal room data
- [ ] Test account deletion removes deal participants
- [ ] Verify S3 cleanup includes deal documents

---

## Phase 5: Testing & Smoke Scripts

### 5.1 Create Smoke Test Scripts

**File:** `backend/scripts/test-dealroom-idor.js`

```javascript
/**
 * Test IDOR/BOLA vulnerabilities in deal room access
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

async function testDealRoomIDOR() {
  // Create two users
  // User A creates deal room
  // User B tries to access User A's deal room
  // Should fail with 403
}

testDealRoomIDOR();
```

**Create similar scripts for:**
- `test-doc-visibility.js` - Test document visibility rules
- `test-professional-request-flow.js` - Test request → accept flow
- `test-chat-rate-limit.js` - Test chat rate limiting
- `test-appointment-booking.js` - Test appointment booking

### 5.2 Create Smoke Tests Documentation

**File:** `docs/DEAL_ROOM_SMOKE_TESTS.md`

Document all smoke test scenarios and expected results.

**Checklist:**
- [ ] Create IDOR test script
- [ ] Create document visibility test script
- [ ] Create professional request flow test script
- [ ] Create chat rate limit test script
- [ ] Create appointment booking test script
- [ ] Document all smoke tests
- [ ] Run all tests and verify results

---

## Implementation Order Checklist

Follow this exact order:

1. **Phase 0:** ✅ System mapping (complete)
2. **Phase 1:** Prisma models + migration
   - [ ] Add models to schema.prisma
   - [ ] Update User/Property relations
   - [ ] Run migration
   - [ ] Verify schema
3. **Phase 2:** Backend routes + security
   - [ ] Create authorization utilities
   - [ ] Create authorization middleware
   - [ ] Create validation schemas
   - [ ] Create rate limiters
   - [ ] Create deals.ts route
   - [ ] Create professionals.ts route
   - [ ] Create deal-chat.ts route
   - [ ] Create deal-documents.ts route
   - [ ] Create deal-appointments.ts route
   - [ ] Register routes in index.ts
   - [ ] Test all endpoints
4. **Phase 3:** Frontend UI integration
   - [ ] Create API client functions
   - [ ] Create /deals list page
   - [ ] Create /deals/[dealId] detail page
   - [ ] Create professional directory
   - [ ] Create professional dashboard
   - [ ] Update buyer dashboard
   - [ ] Update seller dashboard
   - [ ] Update agent dashboard
   - [ ] Update navigation
   - [ ] Test all UI flows
5. **Phase 4:** GDPR updates
   - [ ] Update DSAR export
   - [ ] Update account deletion
   - [ ] Update audit logger
   - [ ] Test GDPR compliance
6. **Phase 5:** Testing & smoke scripts
   - [ ] Create all test scripts
   - [ ] Document smoke tests
   - [ ] Run all tests
   - [ ] Fix any issues

---

**End of Implementation Plan**


