/**
 * Resolve property image entries to full URLs.
 * Used by deals API to return displayable image URLs (local path → absolute, S3 key → signed URL).
 */

import { generateSignedUrl } from './s3-signed-urls';

const BACKEND_BASE = process.env.BACKEND_URL || process.env.FRONTEND_ORIGIN?.replace(':3004', ':3001') || 'http://localhost:3001';

/** Resolve a single image entry to a full URL */
export async function resolveImageUrl(entry: string): Promise<string> {
  if (!entry || typeof entry !== 'string') return '';
  const t = entry.trim();
  if (!t) return '';
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  if (t.startsWith('/uploads/')) return `${BACKEND_BASE.replace(/\/$/, '')}${t}`;
  // S3 key (properties/xxx or other non-absolute paths)
  if (t.startsWith('properties/') || !t.startsWith('/')) {
    try {
      const signed = await generateSignedUrl(t, 3600);
      return signed || '';
    } catch {
      return '';
    }
  }
  return t.startsWith('/') ? `${BACKEND_BASE.replace(/\/$/, '')}${t}` : '';
}

/** Resolve an array of property image entries to full URLs */
export async function resolvePropertyImages(images: string[]): Promise<string[]> {
  if (!Array.isArray(images) || images.length === 0) return [];
  const resolved = await Promise.all(images.map(resolveImageUrl));
  return resolved.filter(Boolean);
}
