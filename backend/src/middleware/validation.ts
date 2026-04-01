/**
 * Validation middleware using Zod schemas
 * Prevents mass assignment vulnerabilities
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { validateAndSanitize } from '../lib/validation/schemas';

/**
 * Middleware to validate request body against a Zod schema
 * Rejects unknown fields and validates types
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validateAndSanitize(schema, req.body);

    if (!result.success) {
      res.status(400).json({
        error: result.error,
        details: process.env.NODE_ENV === 'development' && result.details instanceof z.ZodError ? result.details.issues : undefined,
      });
      return;
    }

    // Replace req.body with validated and sanitized data
    req.body = result.data;
    next();
  };
};

/**
 * Middleware to validate request query parameters
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validateAndSanitize(schema, req.query);

    if (!result.success) {
      res.status(400).json({
        error: result.error,
        details: process.env.NODE_ENV === 'development' && result.details instanceof z.ZodError ? result.details.issues : undefined,
      });
      return;
    }

    req.query = result.data as any;
    next();
  };
};

/**
 * Middleware to validate request params
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validateAndSanitize(schema, req.params);

    if (!result.success) {
      res.status(400).json({
        error: result.error,
        details: process.env.NODE_ENV === 'development' && result.details instanceof z.ZodError ? result.details.issues : undefined,
      });
      return;
    }

    req.params = result.data as any;
    next();
  };
};

/**
 * Middleware to reject unknown fields in request body
 * Use this when you want to manually validate but still reject unknown fields
 */
export const rejectUnknownFields = (allowedFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const bodyKeys = Object.keys(req.body);
    const unknownFields = bodyKeys.filter(key => !allowedFields.includes(key));

    if (unknownFields.length > 0) {
      res.status(400).json({
        error: `Unknown fields not allowed: ${unknownFields.join(', ')}`,
        unknownFields,
      });
      return;
    }

    next();
  };
};

