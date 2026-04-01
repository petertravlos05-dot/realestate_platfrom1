/**
 * File validation utilities
 * Validates MIME types, magic bytes, file sizes, and sanitizes filenames
 */

import { fileTypeFromBuffer } from 'file-type';

/**
 * Allowed MIME types for images
 */
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

/**
 * Allowed MIME types for documents
 */
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
] as const;

/**
 * Allowed file extensions (for additional validation)
 */
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'] as const;
export const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx'] as const;

/**
 * Forbidden file extensions (executables, scripts, etc.)
 */
export const FORBIDDEN_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
  '.sh', '.bash', '.zsh', '.php', '.asp', '.aspx', '.jsp', '.py', '.rb',
  '.pl', '.ps1', '.psm1', '.psd1', '.psc1', '.msi', '.dll', '.so', '.dylib',
] as const;

/**
 * Maximum file sizes (in bytes)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Magic bytes (file signatures) for common image types
 */
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]], // GIF87a or GIF89a
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF (needs additional check for WEBP)
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
};

/**
 * Check if buffer matches magic bytes for a given MIME type
 */
export function validateMagicBytes(buffer: Buffer, expectedMimeType: string): boolean {
  const signatures = MAGIC_BYTES[expectedMimeType];
  if (!signatures || buffer.length < 4) {
    return false;
  }

  // Check each possible signature for this MIME type
  for (const signature of signatures) {
    if (buffer.length < signature.length) {
      continue;
    }

    let matches = true;
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        matches = false;
        break;
      }
    }

    if (matches) {
      // Special check for WebP (RIFF + WEBP)
      if (expectedMimeType === 'image/webp') {
        const webpCheck = buffer.toString('ascii', 8, 12);
        return webpCheck === 'WEBP';
      }
      return true;
    }
  }

  return false;
}

/**
 * Sanitize filename - remove path separators and dangerous characters
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and dangerous characters
  let sanitized = filename
    .replace(/[\/\\]/g, '_') // Replace path separators
    .replace(/[<>:"|?*\x00-\x1F]/g, '_') // Replace dangerous characters
    .replace(/\.\./g, '_') // Replace parent directory references
    .trim();

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'));
    sanitized = sanitized.substring(0, 255 - ext.length) + ext;
  }

  return sanitized || 'file';
}

/**
 * Generate secure filename with UUID
 */
export function generateSecureFilename(originalFilename: string, useTimestamp = true): string {
  const { randomUUID } = require('crypto');
  const ext = originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase();
  
  // Validate extension is not forbidden
  const forbiddenExt = FORBIDDEN_EXTENSIONS.find(ext => 
    originalFilename.toLowerCase().endsWith(ext)
  );
  
  if (forbiddenExt) {
    throw new Error(`Forbidden file extension: ${forbiddenExt}`);
  }

  const uuid = randomUUID();
  const timestamp = useTimestamp ? `${Date.now()}_` : '';
  
  return `${timestamp}${uuid}${ext}`;
}

/**
 * Validate file using magic bytes and MIME type
 */
export async function validateFile(
  buffer: Buffer,
  declaredMimeType: string,
  allowedMimeTypes: readonly string[]
): Promise<{ valid: boolean; error?: string; detectedMimeType?: string }> {
  // Check declared MIME type is allowed
  if (!allowedMimeTypes.includes(declaredMimeType)) {
    return {
      valid: false,
      error: `MIME type ${declaredMimeType} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
    };
  }

  // Check file size
  if (buffer.length > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Detect actual MIME type from magic bytes
  let detectedMimeType: string | undefined;
  try {
    const fileType = await fileTypeFromBuffer(buffer);
    detectedMimeType = fileType?.mime;
  } catch (error) {
    // file-type might fail for some files, continue with magic byte check
  }

  // Validate magic bytes match declared MIME type
  const magicBytesValid = validateMagicBytes(buffer, declaredMimeType);

  if (!magicBytesValid) {
    return {
      valid: false,
      error: `File content does not match declared MIME type ${declaredMimeType}. Detected: ${detectedMimeType || 'unknown'}`,
      detectedMimeType,
    };
  }

  // If we detected a different MIME type, warn but allow if it's in allowed list
  if (detectedMimeType && detectedMimeType !== declaredMimeType) {
    if (!allowedMimeTypes.includes(detectedMimeType)) {
      return {
        valid: false,
        error: `Detected MIME type ${detectedMimeType} does not match declared type ${declaredMimeType} and is not allowed`,
        detectedMimeType,
      };
    }
    // Both are allowed, use detected type
  }

  return {
    valid: true,
    detectedMimeType: detectedMimeType || declaredMimeType,
  };
}

/**
 * Check if filename has forbidden extension
 */
export function hasForbiddenExtension(filename: string): boolean {
  const lowerFilename = filename.toLowerCase();
  return FORBIDDEN_EXTENSIONS.some(ext => lowerFilename.endsWith(ext));
}

