import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  userEmail?: string;
}

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  exp: number;
}

/**
 * Middleware to validate JWT token from Authorization header
 * Supports both Bearer token format
 */
export const validateJwtToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Μη εξουσιοδοτημένη πρόσβαση - Token λείπει' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'Agapao_ton_stivo05';

    try {
      const decoded = jwt.verify(token, secret) as JwtPayload;
      
      console.log('[DEBUG] validateJwtToken - Decoded token:', {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        exp: decoded.exp,
        timestamp: new Date().toISOString()
      });
      
      req.userId = decoded.userId;
      req.userRole = decoded.role;
      req.userEmail = decoded.email;
      
      next();
    } catch (error) {
      console.error('[DEBUG] validateJwtToken - Token verification failed:', error);
      res.status(401).json({ error: 'Μη έγκυρο token' });
      return;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Σφάλμα εξουσιοδότησης' });
    return;
  }
};

/**
 * Middleware to check if user has specific role
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.userRole) {
      res.status(401).json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' });
      return;
    }

    if (!roles.includes(req.userRole.toUpperCase())) {
      res.status(403).json({ error: 'Δεν έχετε δικαίωμα πρόσβασης' });
      return;
    }

    next();
  };
};

/**
 * Optional auth - doesn't fail if no token, but sets user if token exists
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const secret = process.env.JWT_SECRET || 'Agapao_ton_stivo05';

      try {
        const decoded = jwt.verify(token, secret) as JwtPayload;
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        req.userEmail = decoded.email;
      } catch (error) {
        // Token invalid but continue without auth
      }
    }

    next();
  } catch (error) {
    // Continue without auth
    next();
  }
};





