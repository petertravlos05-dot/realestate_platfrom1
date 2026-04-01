import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../lib/utils/jwt-secret';
import { prisma } from '../lib/prisma';

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
 * Middleware to validate JWT token from Authorization header or cookie
 * Supports both Bearer token format and cookie-based auth
 */
export const validateJwtToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Prefer Authorization header when present (reflects latest active session),
    // fallback to cookie for cookie-only requests.
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    if (!token) {
      token = req.cookies?.access_token;
    }

    // Fallback for SSE requests: check query parameter (less secure, but needed for EventSource)
    // EventSource API doesn't support custom headers, so we need this fallback
    if (!token && req.method === 'GET' && req.path?.includes('/events')) {
      const tokenFromQuery = req.query.token as string | undefined;
      if (tokenFromQuery) {
        token = tokenFromQuery;
      }
    }

    if (!token) {
      // Debug logging for SSE requests
      if (req.path?.includes('/events')) {
        console.log(`[DEBUG] validateJwtToken - No token found for SSE request:`, {
          path: req.path,
          method: req.method,
          hasCookies: !!req.cookies,
          cookieKeys: req.cookies ? Object.keys(req.cookies) : [],
          hasAuthHeader: !!req.headers.authorization,
          hasQueryToken: !!req.query.token,
        });
      }
      res.status(401).json({ error: 'Μη εξουσιοδοτημένη πρόσβαση - Token λείπει' });
      return;
    }

    const secret = getJwtSecret();

    try {
      const decoded = jwt.verify(token, secret) as JwtPayload;
      
      // Debug logging removed in production for security
      if (process.env.NODE_ENV !== 'production') {
        console.log('[DEBUG] validateJwtToken - Decoded token:', {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          exp: decoded.exp,
          timestamp: new Date().toISOString()
        });
      }
      
      req.userId = decoded.userId;
      req.userRole = decoded.role;
      req.userEmail = decoded.email;
      
      // Check if user account is deleted
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { isDeleted: true },
      });
      
      if (user?.isDeleted) {
        res.status(403).json({ 
          error: 'ACCOUNT_DELETED',
          message: 'This account has been deleted and access is no longer available.'
        });
        return;
      }
      
      next();
    } catch (error) {
      // Safe error logging - only log safe fields, never the token or headers
      const safeError = error instanceof Error ? {
        name: error.name,
        message: error.message,
        ...(error as any).code && { code: (error as any).code }
      } : { message: String(error) };
      
      if (process.env.NODE_ENV !== 'production') {
        console.error('[DEBUG] validateJwtToken - Token verification failed:', safeError);
      }
      res.status(401).json({ error: 'Μη έγκυρο token' });
      return;
    }
  } catch (error) {
    // Safe error logging - only log safe fields, never the token or headers
    const safeError = error instanceof Error ? {
      name: error.name,
      message: error.message,
      ...(error as any).code && { code: (error as any).code }
    } : { message: String(error) };
    
    console.error('Auth middleware error:', safeError);
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
      const secret = getJwtSecret();

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





