/**
 * Request ID Middleware
 * 
 * Generates a unique request ID for each request to enable log correlation
 */

import { Request, Response, NextFunction } from 'express';

export interface RequestWithId extends Request {
  requestId?: string;
}

export function requestIdMiddleware(req: RequestWithId, res: Response, next: NextFunction): void {
  // Generate unique request ID
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;

  // Add request ID to response header for client correlation
  res.setHeader('X-Request-ID', requestId);

  next();
}





