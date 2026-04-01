/**
 * Secure file upload middleware
 * Validates files before they reach route handlers
 */

import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import {
  validateFile,
  sanitizeFilename,
  generateSecureFilename,
  hasForbiddenExtension,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_IMAGE_SIZE,
  MAX_DOCUMENT_SIZE,
} from '../lib/utils/file-validation';

/**
 * File upload type
 */
export type FileUploadType = 'image' | 'document' | 'any';

/**
 * Create secure multer configuration
 */
export function createSecureUpload(
  type: FileUploadType = 'image',
  maxFiles: number = 1,
  maxSize?: number
) {
  const allowedMimeTypes =
    type === 'image'
      ? ALLOWED_IMAGE_MIME_TYPES
      : type === 'document'
      ? ALLOWED_DOCUMENT_MIME_TYPES
      : [...ALLOWED_IMAGE_MIME_TYPES, ...ALLOWED_DOCUMENT_MIME_TYPES];

  const fileSizeLimit = maxSize || (type === 'image' ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE);

  const storage = multer.memoryStorage();

  return multer({
    storage,
    limits: {
      fileSize: fileSizeLimit,
      files: maxFiles,
    },
    fileFilter: async (req, file, cb) => {
      try {
        // Check filename for forbidden extensions
        if (hasForbiddenExtension(file.originalname)) {
          const error = new Error(
            `Forbidden file extension. File appears to be executable or script file.`
          ) as any;
          error.status = 400;
          error.statusCode = 400;
          return cb(error);
        }

        // Sanitize filename
        file.originalname = sanitizeFilename(file.originalname);

        // Check MIME type is allowed
        if (!(allowedMimeTypes as readonly string[]).includes(file.mimetype)) {
          const error = new Error(
            `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`
          ) as any;
          error.status = 400;
          error.statusCode = 400;
          return cb(error);
        }

        cb(null, true);
      } catch (error) {
        const err = error as any;
        err.status = err.status || 400;
        err.statusCode = err.statusCode || 400;
        cb(err);
      }
    },
  });
}

/**
 * Middleware to validate file after multer processing
 * Validates magic bytes and performs additional checks
 */
export const validateUploadedFile = (type: FileUploadType = 'image') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const files = req.files
        ? (Array.isArray(req.files) ? req.files : [req.files]).flat()
        : req.file
        ? [req.file]
        : [];

      if (files.length === 0) {
        next();
        return;
      }

      const allowedMimeTypes =
        type === 'image'
          ? ALLOWED_IMAGE_MIME_TYPES
          : type === 'document'
          ? ALLOWED_DOCUMENT_MIME_TYPES
          : [...ALLOWED_IMAGE_MIME_TYPES, ...ALLOWED_DOCUMENT_MIME_TYPES];

      // Validate each file
      for (const file of files) {
        if (!file.buffer || !Buffer.isBuffer(file.buffer)) {
          res.status(400).json({
            error: 'File buffer is missing or invalid',
          });
          return;
        }

        // Ensure mimetype is a string
        const mimetype = typeof file.mimetype === 'string' ? file.mimetype : '';

        // Validate file using magic bytes
        const validation = await validateFile(
          file.buffer,
          mimetype,
          allowedMimeTypes as readonly string[]
        );

        if (!validation.valid) {
          res.status(400).json({
            error: validation.error || 'File validation failed',
            detectedMimeType: validation.detectedMimeType,
          });
          return;
        }

        // Generate secure filename
        if (file.originalname && typeof file.originalname === 'string') {
          file.filename = generateSecureFilename(file.originalname);
        }
      }

      next();
    } catch (error) {
      console.error('File validation error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'File validation failed',
      });
    }
  };
};

/**
 * Malware scanning hook (stub for now)
 * TODO: Integrate with ClamAV or cloud malware scanning service
 */
export async function scanForMalware(
  buffer: Buffer,
  filename: string
): Promise<{ clean: boolean; threat?: string }> {
  // TODO: Implement actual malware scanning
  // Options:
  // 1. ClamAV integration (local)
  // 2. Cloud service (AWS GuardDuty, VirusTotal API, etc.)
  // 3. File signature database

  // For now, just check file size and basic validation
  if (buffer.length === 0) {
    return { clean: false, threat: 'Empty file' };
  }

  // Stub: Always return clean for now
  // In production, implement actual scanning
  console.log(`[MALWARE SCAN] Scanning file: ${filename} (${buffer.length} bytes)`);
  console.log(`[MALWARE SCAN] TODO: Implement actual malware scanning`);

  return { clean: true };
}

