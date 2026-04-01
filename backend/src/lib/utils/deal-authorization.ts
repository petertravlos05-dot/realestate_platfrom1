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
  userId: string,
  viewerRole?: string | null
): Promise<AuthorizationResult & { participant?: { role: string; permissions?: any } }> {
  try {
    if (viewerRole && viewerRole.toUpperCase() === 'ADMIN') {
      const exists = await prisma.dealRoom.findUnique({
        where: { id: dealRoomId },
        select: { id: true },
      });
      if (!exists) {
        return { allowed: false, reason: 'Deal room not found' };
      }
      return { allowed: true, participant: { role: 'ADMIN' } };
    }

    const dealRoom = await prisma.dealRoom.findUnique({
      where: { id: dealRoomId },
      include: { property: { select: { userId: true } } },
    });
    if (!dealRoom) {
      return { allowed: false, reason: 'Deal room not found' };
    }

    // Buyer/seller are on the deal directly (often no DealParticipant). Check first.
    if (dealRoom.buyerId === userId) {
      return { allowed: true, participant: { role: 'BUYER' } };
    }
    const sellerId = dealRoom.sellerId ?? dealRoom.property?.userId;
    if (sellerId && sellerId === userId) {
      return { allowed: true, participant: { role: 'SELLER' } };
    }

    // Check DealParticipant (professionals: lawyer, notary, engineer)
    const participants = await prisma.dealParticipant.findMany({
      where: {
        dealRoomId,
        userId,
        removedAt: null,
      },
      select: {
        role: true,
        permissions: true,
        removedAt: true,
      },
    });

    console.log(`[checkDealParticipantAccess] Found ${participants.length} participants for userId=${userId}, dealRoomId=${dealRoomId}:`, participants.map(p => ({ role: p.role, removedAt: p.removedAt })));

    if (participants.length > 0) {
      const buyerParticipant = participants.find(p => p.role === 'BUYER');
      const participant = buyerParticipant || participants[0];
      return { allowed: true, participant };
    }

    // Fallback: check if user has ACCEPTED professional request (e.g. engineer accepted before participant was created)
    const acceptedRequest = await prisma.professionalRequest.findFirst({
      where: {
        dealRoomId,
        status: 'ACCEPTED',
        professional: { userId },
      },
      include: { professional: { select: { type: true } } },
    });

    if (acceptedRequest) {
      const role = acceptedRequest.professional.type as string; // LAWYER, NOTARY, ENGINEER
      return { allowed: true, participant: { role } };
    }

    return { allowed: false, reason: 'User is not a participant in this deal room' };
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
  allowedRoles: string[],
  viewerRole?: string | null
): Promise<AuthorizationResult> {
  try {
    if (viewerRole && viewerRole.toUpperCase() === 'ADMIN') {
      const exists = await prisma.dealRoom.findUnique({
        where: { id: dealRoomId },
        select: { id: true },
      });
      if (!exists) {
        return { allowed: false, reason: 'Deal room not found' };
      }
      return { allowed: true };
    }

    const dealRoom = await prisma.dealRoom.findUnique({
      where: { id: dealRoomId },
      include: { property: { select: { userId: true } } },
    });
    if (!dealRoom) {
      return { allowed: false, reason: 'Deal room not found' };
    }

    // Buyer/seller are on the deal directly. If user is buyer/seller and role allowed, pass.
    if (dealRoom.buyerId === userId && allowedRoles.includes('BUYER')) {
      return { allowed: true };
    }
    const sellerId = dealRoom.sellerId ?? dealRoom.property?.userId;
    if (sellerId && sellerId === userId && allowedRoles.includes('SELLER')) {
      return { allowed: true };
    }

    // Check DealParticipant (professionals)
    const participants = await prisma.dealParticipant.findMany({
      where: {
        dealRoomId,
        userId,
        removedAt: null,
      },
      select: {
        role: true,
        permissions: true,
        removedAt: true,
      },
    });

    console.log(`[checkDealRole] Checking role for userId=${userId}, dealRoomId=${dealRoomId}, allowedRoles=${allowedRoles.join(', ')}, found ${participants.length} participants:`, participants.map(p => p.role));

    // Check if user has at least one of the allowed roles via DealParticipant
    if (participants.length > 0) {
      const hasAllowedRole = participants.some(p => allowedRoles.includes(p.role));
      if (hasAllowedRole) return { allowed: true };
      const userRoles = participants.map(p => p.role).join(', ');
      console.log(`[checkDealRole] Role mismatch: user has roles [${userRoles}] but required [${allowedRoles.join(', ')}]`);
      return { allowed: false, reason: `User role ${userRoles} not allowed. Required: ${allowedRoles.join(', ')}` };
    }

    // Fallback: ACCEPTED ProfessionalRequest (no DealParticipant yet)
    const acceptedRequest = await prisma.professionalRequest.findFirst({
      where: {
        dealRoomId,
        status: 'ACCEPTED',
        professional: { userId },
      },
      include: { professional: { select: { type: true } } },
    });
    if (acceptedRequest && allowedRoles.includes(acceptedRequest.professional.type)) {
      return { allowed: true };
    }
    if (acceptedRequest) {
      return { allowed: false, reason: `User role ${acceptedRequest.professional.type} not allowed. Required: ${allowedRoles.join(', ')}` };
    }

    return { allowed: false, reason: 'User is not a participant in this deal room' };
  } catch (error) {
    console.error('Error checking deal role:', error);
    return { allowed: false, reason: 'Error checking access' };
  }
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
    if (!userRole) {
      return { allowed: false, reason: 'User is not a participant in this deal room' };
    }

    // Check visibility rules
    const visibility = document.visibility as { visibleToRoles?: string[] } | null;
    if (visibility?.visibleToRoles) {
      if (!visibility.visibleToRoles.includes(userRole)) {
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

/**
 * Get deal participant or throw (for use in routes after authz check)
 */
export async function getDealParticipantOrThrow(
  dealRoomId: string,
  userId: string
): Promise<{ role: string; permissions?: any }> {
  const result = await checkDealParticipantAccess(dealRoomId, userId);
  if (!result.allowed || !result.participant) {
    throw new Error(result.reason || 'Access denied');
  }
  return result.participant;
}

/**
 * Check if user is deal participant (simple boolean)
 */
export async function isDealParticipant(
  dealRoomId: string,
  userId: string
): Promise<boolean> {
  const result = await checkDealParticipantAccess(dealRoomId, userId);
  return result.allowed;
}

/**
 * Ensure user is thread member or throw
 */
export async function ensureThreadMember(
  threadId: string,
  userId: string
): Promise<void> {
  const result = await canAccessDealThread(threadId, userId);
  if (!result.allowed) {
    throw new Error(result.reason || 'Access denied');
  }
}

/**
 * Check document visibility based on participant role
 * Returns true if document is visible to the role
 */
export function canAccessDealDocumentByRole(
  document: { visibility?: any },
  participantRole: string
): boolean {
  // Admin can always access
  if (participantRole === 'ADMIN') {
    return true;
  }

  const visibility = document.visibility as { visibleToRoles?: string[] } | null;
  
  // If visibility rules exist, check them
  if (visibility?.visibleToRoles) {
    return visibility.visibleToRoles.includes(participantRole);
  }

  // Default visibility: BUYER + SELLER + LAWYER + NOTARY + ENGINEER + ADMIN (safe default)
  const defaultVisibleRoles = ['BUYER', 'SELLER', 'LAWYER', 'NOTARY', 'ENGINEER', 'ADMIN'];
  return defaultVisibleRoles.includes(participantRole);
}

