/**
 * Authorization middleware for object-level permission checks
 * Prevents BOLA/IDOR vulnerabilities
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import {
  checkPropertyOwnership,
  checkTransactionAccess,
  checkViewingRequestAccess,
  checkPropertyLeadAccess,
  checkFavoriteOwnership,
  checkPropertyAccess,
} from '../lib/utils/authorization';
import {
  checkDealParticipantAccess,
  checkDealRole,
  canAccessDealDocument,
  canAccessDealThread,
} from '../lib/utils/deal-authorization';
import { auditLogger } from '../lib/utils/audit-logger';

/**
 * Middleware to require property ownership
 * Use: router.get('/:id', requirePropertyOwnership, handler)
 */
export const requirePropertyOwnership = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const propertyId = req.params.property_id || req.params.id || req.params.propertyId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!propertyId) {
      res.status(400).json({ error: 'Property ID is required' });
      return;
    }

    const result = await checkPropertyOwnership(propertyId, userId);

    if (!result.allowed) {
      auditLogger.authorizationFailed(req, 'property', propertyId, result.reason || 'Access denied');
      res.status(403).json({
        error: result.reason || 'You do not have permission to access this property',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Authorization middleware error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
    return;
  }
};

/**
 * Middleware to require transaction access (buyer, seller, agent, or admin)
 * Use: router.get('/:id', requireTransactionAccess, handler)
 */
export const requireTransactionAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;
    const transactionId = req.params.id || req.params.transactionId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!transactionId) {
      res.status(400).json({ error: 'Transaction ID is required' });
      return;
    }

    const result = await checkTransactionAccess(transactionId, userId, userRole);

    if (!result.allowed) {
      auditLogger.authorizationFailed(req, 'transaction', transactionId, result.reason || 'Access denied');
      res.status(403).json({
        error: result.reason || 'You do not have permission to access this transaction',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Authorization middleware error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
    return;
  }
};

/**
 * Middleware to require viewing request access
 */
export const requireViewingRequestAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;
    const viewingRequestId = req.params.id || req.params.viewingRequestId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!viewingRequestId) {
      res.status(400).json({ error: 'Viewing request ID is required' });
      return;
    }

    const result = await checkViewingRequestAccess(viewingRequestId, userId, userRole);

    if (!result.allowed) {
      res.status(403).json({
        error: result.reason || 'You do not have permission to access this viewing request',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Authorization middleware error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
    return;
  }
};

/**
 * Middleware to require property lead access
 */
export const requirePropertyLeadAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;
    const leadId = req.params.id || req.params.leadId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!leadId) {
      res.status(400).json({ error: 'Lead ID is required' });
      return;
    }

    const result = await checkPropertyLeadAccess(leadId, userId, userRole);

    if (!result.allowed) {
      res.status(403).json({
        error: result.reason || 'You do not have permission to access this lead',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Authorization middleware error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
    return;
  }
};

/**
 * Middleware to require favorite ownership
 */
export const requireFavoriteOwnership = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const favoriteId = req.params.id || req.params.favoriteId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!favoriteId) {
      res.status(400).json({ error: 'Favorite ID is required' });
      return;
    }

    const result = await checkFavoriteOwnership(favoriteId, userId);

    if (!result.allowed) {
      res.status(403).json({
        error: result.reason || 'You do not have permission to access this favorite',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Authorization middleware error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
    return;
  }
};

/**
 * Middleware to check property access (more permissive than ownership)
 * Allows access if user owns, is admin, or has relationship (favorite/connection)
 */
export const requirePropertyAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;
    const propertyId = req.params.property_id || req.params.id || req.params.propertyId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!propertyId) {
      res.status(400).json({ error: 'Property ID is required' });
      return;
    }

    const result = await checkPropertyAccess(propertyId, userId, userRole);

    if (!result.allowed) {
      res.status(403).json({
        error: result.reason || 'You do not have permission to access this property',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Authorization middleware error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
    return;
  }
};

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

    const result = await checkDealParticipantAccess(dealRoomId, userId, req.userRole);

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

      const result = await checkDealRole(dealRoomId, userId, roles, req.userRole);

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

