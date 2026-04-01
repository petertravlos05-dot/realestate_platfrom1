/**
 * Consent management utilities
 * Handles consent version checking and validation
 */

import { prisma } from '../prisma';

export type ConsentType = 'TERMS' | 'PRIVACY' | 'MARKETING';

export interface ConsentVersion {
  TERMS: string;
  PRIVACY: string;
  MARKETING?: string;
}

/**
 * Get current consent versions from environment variables
 */
export function getCurrentConsentVersions(): ConsentVersion {
  const termsVersion = process.env.TERMS_VERSION || '2026-01-01';
  const privacyVersion = process.env.PRIVACY_VERSION || '2026-01-01';
  const marketingVersion = process.env.MARKETING_VERSION; // Optional

  return {
    TERMS: termsVersion,
    PRIVACY: privacyVersion,
    ...(marketingVersion && { MARKETING: marketingVersion }),
  };
}

/**
 * Check if user has accepted required consent versions
 * Returns missing consents if any
 */
export async function checkUserConsents(
  userId: string,
  requiredTypes: ConsentType[] = ['TERMS', 'PRIVACY']
): Promise<{
  hasAllConsents: boolean;
  missingConsents: ConsentType[];
  currentVersions: ConsentVersion;
}> {
  const currentVersions = getCurrentConsentVersions();
  const missingConsents: ConsentType[] = [];

  // Get user's latest consent for each type
  const userConsents = await prisma.userConsent.findMany({
    where: {
      userId,
      consentType: {
        in: requiredTypes,
      },
    },
    orderBy: {
      acceptedAt: 'desc',
    },
  });

  // Group by consent type and get latest version for each
  const latestConsents = new Map<ConsentType, string>();
  for (const consent of userConsents) {
    const type = consent.consentType as ConsentType;
    if (!latestConsents.has(type) || consent.version > latestConsents.get(type)!) {
      latestConsents.set(type, consent.version);
    }
  }

  // Check each required consent type
  for (const type of requiredTypes) {
    const requiredVersion = currentVersions[type];
    if (!requiredVersion) {
      // Version not configured, skip
      continue;
    }

    const userVersion = latestConsents.get(type);
    if (!userVersion || userVersion < requiredVersion) {
      missingConsents.push(type);
    }
  }

  return {
    hasAllConsents: missingConsents.length === 0,
    missingConsents,
    currentVersions,
  };
}

/**
 * Record user consent acceptance
 */
export async function recordConsent(
  userId: string,
  consentType: ConsentType,
  version: string,
  ip?: string,
  userAgent?: string
): Promise<void> {
  // Check if consent already exists (idempotent)
  const existing = await prisma.userConsent.findUnique({
    where: {
      userId_consentType_version: {
        userId,
        consentType,
        version,
      },
    },
  });

  if (existing) {
    // Already recorded, skip
    return;
  }

  // Record new consent
  await prisma.userConsent.create({
    data: {
      userId,
      consentType,
      version,
      ip: ip || null,
      userAgent: userAgent || null,
    },
  });
}


