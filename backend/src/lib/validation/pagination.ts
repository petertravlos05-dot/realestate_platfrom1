/**
 * Pagination utilities and validation
 */

import { z } from 'zod';

/**
 * Pagination query schema
 */
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(1000)).default(1),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default(20),
  offset: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0)).optional(),
}).strict();

/**
 * Default pagination values
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
export const MAX_PAGE = 1000;

/**
 * Parse and validate pagination parameters
 */
export function parsePagination(query: any): { page: number; limit: number; skip: number } {
  const page = Math.max(1, Math.min(MAX_PAGE, parseInt(query.page) || DEFAULT_PAGE));
  const limit = Math.max(1, Math.min(MAX_LIMIT, parseInt(query.limit) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

