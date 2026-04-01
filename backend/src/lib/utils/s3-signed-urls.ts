/**
 * S3 Signed URL Service
 * 
 * Generates short-lived signed URLs for S3 objects with authorization checks.
 * All file access must go through this service - no direct S3 URLs.
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '../prisma';

let s3Client: S3Client | null = null;

// Initialize S3 client if credentials are available
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

const S3_BUCKET = process.env.AWS_S3_BUCKET;

/**
 * Generate signed URL for S3 object
 * 
 * @param s3Key S3 object key (e.g., "properties/123/document/abc.pdf")
 * @param expiresIn Expiration time in seconds (default: 300 = 5 minutes)
 * @returns Signed URL or null if S3 not configured
 */
export async function generateSignedUrl(
  s3Key: string,
  expiresIn: number = 300
): Promise<string | null> {
  if (!s3Client || !S3_BUCKET) {
    console.warn('[S3-SIGNED-URL] S3 not configured, cannot generate signed URL');
    return null;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error(`[S3-SIGNED-URL] Error generating signed URL for key ${s3Key}:`, error);
    throw error;
  }
}

/**
 * Check if user can access a property file
 * 
 * @param userId User ID
 * @param userRole User role
 * @param propertyId Property ID
 * @returns true if user can access property files
 */
export async function canAccessPropertyFiles(
  userId: string,
  userRole: string | undefined,
  propertyId: string
): Promise<boolean> {
  // Admins can access all files
  if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
    return true;
  }

  // Check if user owns the property
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { userId: true },
  });

  if (!property) {
    return false;
  }

  // Owner can access
  if (property.userId === userId) {
    return true;
  }

  // Check if user has transaction access (buyer, seller, agent)
  const transaction = await prisma.transaction.findFirst({
    where: {
      propertyId,
      OR: [
        { buyerId: userId },
        { sellerId: userId },
        { agentId: userId },
      ],
    },
    select: { id: true },
  });

  if (transaction) {
    return true;
  }

  return false;
}

/**
 * Extract property ID from S3 key
 * 
 * @param s3Key S3 key (e.g., "properties/123/document/abc.pdf" or "123/document/abc.pdf")
 * @returns Property ID or null
 */
export function extractPropertyIdFromS3Key(s3Key: string): string | null {
  // Handle both formats: "properties/123/..." and "123/..."
  const parts = s3Key.split('/');
  if (parts.length < 2) {
    return null;
  }

  // If first part is "properties", propertyId is second part
  if (parts[0] === 'properties') {
    return parts[1] || null;
  }

  // Otherwise, propertyId is first part
  return parts[0] || null;
}


