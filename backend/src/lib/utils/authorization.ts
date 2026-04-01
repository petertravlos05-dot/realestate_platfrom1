/**
 * Authorization utilities for object-level permission checks
 * Prevents BOLA/IDOR vulnerabilities
 */

import { prisma } from '../prisma';
import { AuthRequest } from '../../middleware/auth';

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if user owns a property
 */
export async function checkPropertyOwnership(
  propertyId: string,
  userId: string
): Promise<AuthorizationResult> {
  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { userId: true },
    });

    if (!property) {
      return { allowed: false, reason: 'Property not found' };
    }

    if (property.userId !== userId) {
      return { allowed: false, reason: 'User does not own this property' };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking property ownership:', error);
    return { allowed: false, reason: 'Error checking ownership' };
  }
}

/**
 * Check if user is involved in a transaction (buyer, seller, or agent)
 */
export async function checkTransactionAccess(
  transactionId: string,
  userId: string,
  userRole?: string
): Promise<AuthorizationResult> {
  try {
    // Admins can access all transactions
    if (userRole === 'ADMIN') {
      return { allowed: true };
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        buyerId: true,
        sellerId: true,
        agentId: true,
        property: {
          select: {
            userId: true, // Property owner (seller)
          },
        },
      },
    });

    if (!transaction) {
      return { allowed: false, reason: 'Transaction not found' };
    }

    // Check if user is buyer, seller, or agent
    const isBuyer = transaction.buyerId === userId;
    const isSeller = transaction.property?.userId === userId || transaction.sellerId === userId;
    const isAgent = transaction.agentId === userId;

    if (isBuyer || isSeller || isAgent) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'User is not involved in this transaction' };
  } catch (error) {
    console.error('Error checking transaction access:', error);
    return { allowed: false, reason: 'Error checking access' };
  }
}

/**
 * Check if user owns a viewing request
 */
export async function checkViewingRequestAccess(
  viewingRequestId: string,
  userId: string,
  userRole?: string
): Promise<AuthorizationResult> {
  try {
    // Admins can access all viewing requests
    if (userRole === 'ADMIN') {
      return { allowed: true };
    }

    const viewingRequest = await prisma.viewingRequest.findUnique({
      where: { id: viewingRequestId },
      select: {
        buyerId: true,
        agentId: true,
        property: {
          select: {
            userId: true, // Property owner (seller)
          },
        },
      },
    });

    if (!viewingRequest) {
      return { allowed: false, reason: 'Viewing request not found' };
    }

    // Check if user is buyer, seller, or agent
    const isBuyer = viewingRequest.buyerId === userId;
    const isSeller = viewingRequest.property?.userId === userId;
    const isAgent = viewingRequest.agentId === userId;

    if (isBuyer || isSeller || isAgent) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'User is not involved in this viewing request' };
  } catch (error) {
    console.error('Error checking viewing request access:', error);
    return { allowed: false, reason: 'Error checking access' };
  }
}

/**
 * Check if user owns a property lead
 */
export async function checkPropertyLeadAccess(
  leadId: string,
  userId: string,
  userRole?: string
): Promise<AuthorizationResult> {
  try {
    // Admins can access all leads
    if (userRole === 'ADMIN') {
      return { allowed: true };
    }

    const lead = await prisma.propertyLead.findUnique({
      where: { id: leadId },
      select: {
        buyerId: true,
        agentId: true,
        property: {
          select: {
            userId: true, // Property owner (seller)
          },
        },
      },
    });

    if (!lead) {
      return { allowed: false, reason: 'Lead not found' };
    }

    // Check if user is buyer, seller, or agent
    const isBuyer = lead.buyerId === userId;
    const isSeller = lead.property?.userId === userId;
    const isAgent = lead.agentId === userId;

    if (isBuyer || isSeller || isAgent) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'User is not involved in this lead' };
  } catch (error) {
    console.error('Error checking lead access:', error);
    return { allowed: false, reason: 'Error checking access' };
  }
}

/**
 * Check if user owns a favorite
 */
export async function checkFavoriteOwnership(
  favoriteId: string,
  userId: string
): Promise<AuthorizationResult> {
  try {
    const favorite = await prisma.favorite.findUnique({
      where: { id: favoriteId },
      select: { userId: true },
    });

    if (!favorite) {
      return { allowed: false, reason: 'Favorite not found' };
    }

    if (favorite.userId !== userId) {
      return { allowed: false, reason: 'User does not own this favorite' };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking favorite ownership:', error);
    return { allowed: false, reason: 'Error checking ownership' };
  }
}

/**
 * Check if user can access a property (owner, admin, or has relationship)
 */
export async function checkPropertyAccess(
  propertyId: string,
  userId: string,
  userRole?: string
): Promise<AuthorizationResult> {
  try {
    // Admins can access all properties
    if (userRole === 'ADMIN') {
      return { allowed: true };
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        userId: true,
        status: true,
        favorites: {
          where: { userId },
          select: { id: true },
        },
        connections: {
          where: {
            OR: [
              { agentId: userId },
              { buyerId: userId },
            ],
          },
          select: { id: true },
        },
      },
    });

    if (!property) {
      return { allowed: false, reason: 'Property not found' };
    }

    // Owner can always access
    if (property.userId === userId) {
      return { allowed: true };
    }

    // If property is unavailable, check relationships
    if (property.status === 'unavailable') {
      const hasFavorite = property.favorites.length > 0;
      const hasConnection = property.connections.length > 0;

      if (hasFavorite || hasConnection) {
        return { allowed: true };
      }

      return { allowed: false, reason: 'Property is unavailable and user has no relationship' };
    }

    // Available properties can be viewed by anyone (authenticated)
    return { allowed: true };
  } catch (error) {
    console.error('Error checking property access:', error);
    return { allowed: false, reason: 'Error checking access' };
  }
}

