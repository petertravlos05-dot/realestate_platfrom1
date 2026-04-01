/**
 * Consent management routes
 * Handles user consent acceptance and history
 */

import { Router, Request, Response } from 'express';
import { validateJwtToken, AuthRequest } from '../middleware/auth';
import { mediumRateLimit } from '../middleware/rateLimit';
import { validateBody } from '../middleware/validation';
import { z } from 'zod';
import { compare } from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { recordConsent, getCurrentConsentVersions, ConsentType } from '../lib/utils/consent-helpers';
import { auditLogger, auditLog } from '../lib/utils/audit-logger';

const router = Router();

/**
 * Schema for consent acceptance
 */
const acceptConsentsSchema = z.object({
  consents: z.array(
    z.object({
      type: z.enum(['TERMS', 'PRIVACY', 'MARKETING']),
      version: z.string().min(1),
    })
  ).min(1),
});

/**
 * Schema for consent acceptance with email/password (for pre-login consent)
 */
const acceptConsentsWithAuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  consents: z.array(
    z.object({
      type: z.enum(['TERMS', 'PRIVACY', 'MARKETING']),
      version: z.string().min(1),
    })
  ).min(1),
});

/**
 * POST /api/user/consents/accept-with-auth
 * Accept consent(s) using email/password (for users who haven't logged in yet)
 * This allows accepting consents before login when login returns 428 CONSENT_REQUIRED
 */
router.post(
  '/accept-with-auth',
  mediumRateLimit,
  validateBody(acceptConsentsWithAuthSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password, consents } = req.body;

      // Verify user credentials
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const passwordValid = await compare(password, user.password);
      if (!passwordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const userId = user.id;
      const ipAddress = req.ip || req.socket?.remoteAddress || undefined;
      const userAgent = req.headers['user-agent'] || undefined;

      // Get current versions for validation
      const currentVersions = getCurrentConsentVersions();

      // Record each consent
      const recordedConsents: Array<{ type: ConsentType; version: string }> = [];
      const errors: Array<{ type: string; error: string }> = [];

      for (const consent of consents) {
        const consentType = consent.type as ConsentType;
        const version = consent.version;

        try {
          await recordConsent(userId, consentType, version, ipAddress, userAgent);
          recordedConsents.push({ type: consentType, version });
        } catch (error) {
          console.error(`[CONSENT] Error recording consent ${consentType} ${version}:`, error);
          errors.push({
            type: consentType,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          
          // Sentry: Capture consent failure
          if (error instanceof Error) {
            const { captureDSARException } = require('../lib/sentry');
            captureDSARException(error, 'consent_failed', {
              consentType,
              version,
            });
          }
        }
      }

      // Audit log: Consent acceptance
      if (recordedConsents.length > 0) {
        try {
          for (const consent of recordedConsents) {
            auditLog(
              req,
              'consent.accepted',
              `Consent accepted: ${consent.type} version ${consent.version}`,
              'success',
              {
                resourceType: 'consent',
                details: {
                  consentType: consent.type,
                  version: consent.version,
                },
              }
            );
          }
        } catch (auditError) {
          console.error('Audit logging error (non-fatal):', auditError);
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Some consents could not be recorded',
          recorded: recordedConsents,
          errors,
        });
      }

      res.json({
        message: 'Consents recorded successfully',
        consents: recordedConsents,
      });
    } catch (error) {
      console.error('Error accepting consents:', error);
      auditLogger.apiError(req, error instanceof Error ? error : new Error('Unknown error'), '/consents/accept-with-auth');
      res.status(500).json({
        error: 'Failed to record consents',
      });
    }
  }
);

/**
 * POST /api/user/consents/accept
 * Accept consent(s) for the authenticated user
 */
router.post(
  '/accept',
  mediumRateLimit,
  validateJwtToken,
  validateBody(acceptConsentsSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { consents } = req.body;
      const ipAddress = req.ip || req.socket?.remoteAddress || undefined;
      const userAgent = req.headers['user-agent'] || undefined;

      // Get current versions for validation
      const currentVersions = getCurrentConsentVersions();

      // Record each consent
      const recordedConsents: Array<{ type: ConsentType; version: string }> = [];
      const errors: Array<{ type: string; error: string }> = [];

      for (const consent of consents) {
        const consentType = consent.type as ConsentType;
        const version = consent.version;

        // Validate version matches current version (or allow older versions for history)
        const currentVersion = currentVersions[consentType];
        if (currentVersion && version !== currentVersion) {
          // Allow recording older versions for history, but warn if not current
          console.warn(
            `[CONSENT] User ${userId} accepting ${consentType} version ${version}, but current is ${currentVersion}`
          );
        }

        try {
          await recordConsent(userId, consentType, version, ipAddress, userAgent);
          recordedConsents.push({ type: consentType, version });
        } catch (error) {
          console.error(`[CONSENT] Error recording consent ${consentType} ${version}:`, error);
          errors.push({
            type: consentType,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          
          // Sentry: Capture consent failure
          if (error instanceof Error) {
            const { captureDSARException } = require('../lib/sentry');
            captureDSARException(error, 'consent_failed', {
              consentType,
              version,
            });
          }
        }
      }

      // Audit log: Consent acceptance (minimal PII - only consent types and versions)
      if (recordedConsents.length > 0) {
        try {
          for (const consent of recordedConsents) {
            auditLog(
              req,
              'consent.accepted',
              `Consent accepted: ${consent.type} version ${consent.version}`,
              'success',
              {
                resourceType: 'consent',
                details: {
                  consentType: consent.type,
                  version: consent.version,
                },
              }
            );
          }
        } catch (auditError) {
          console.error('Audit logging error (non-fatal):', auditError);
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Some consents could not be recorded',
          recorded: recordedConsents,
          errors,
        });
      }

      res.json({
        message: 'Consents recorded successfully',
        consents: recordedConsents,
      });
    } catch (error) {
      console.error('Error accepting consents:', error);
      auditLogger.apiError(req, error instanceof Error ? error : new Error('Unknown error'), '/consents/accept');
      res.status(500).json({
        error: 'Failed to record consents',
      });
    }
  }
);

/**
 * GET /api/user/consents
 * Get consent history for the authenticated user
 */
router.get('/', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's consent history
    const consents = await prisma.userConsent.findMany({
      where: {
        userId,
      },
      orderBy: {
        acceptedAt: 'desc',
      },
      select: {
        id: true,
        consentType: true,
        version: true,
        acceptedAt: true,
        // Do not return IP or userAgent for privacy
      },
    });

    // Get current versions for comparison
    const currentVersions = getCurrentConsentVersions();

    // Group by consent type and get latest version for each
    const latestConsents = new Map<string, typeof consents[0]>();
    for (const consent of consents) {
      const type = consent.consentType;
      if (!latestConsents.has(type) || consent.acceptedAt > latestConsents.get(type)!.acceptedAt) {
        latestConsents.set(type, consent);
      }
    }

    // Check which consents are up to date
    const status: Record<string, { current: boolean; latestVersion: string }> = {};
    for (const [type, version] of Object.entries(currentVersions)) {
      const latestConsent = latestConsents.get(type);
      status[type] = {
        current: latestConsent?.version === version || false,
        latestVersion: version,
      };
    }

    res.json({
      consents,
      status,
      currentVersions,
    });
  } catch (error) {
    console.error('Error fetching consents:', error);
    auditLogger.apiError(req, error instanceof Error ? error : new Error('Unknown error'), '/consents');
    res.status(500).json({
      error: 'Failed to fetch consent history',
    });
  }
});

export default router;

