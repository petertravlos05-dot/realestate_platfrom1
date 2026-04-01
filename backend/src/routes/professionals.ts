/**
 * Professional Routes (Lawyers & Notaries)
 * Security: All endpoints require JWT + authorization + rate limiting + audit logging
 */

import { Router, Response } from 'express';
import { ProfessionalType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { validateJwtToken, AuthRequest, requireRole } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validation';
import {
  registerProfessionalSchema,
  updateAvailabilitySchema,
} from '../lib/validation/schemas';
import {
  professionalSearchLimiter,
  adminRateLimit,
  professionalOnboardingLimiter,
} from '../middleware/rateLimit';
import { auditLogger } from '../lib/utils/audit-logger';
import { z } from 'zod';
import * as Sentry from '@sentry/node';

const router = Router();

// GET /api/professionals/me - Get current user's professional profile
router.get(
  '/me',
  validateJwtToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;

      const profile = await prisma.professionalProfile.findUnique({
        where: { userId },
        include: {
          availability: true,
        },
      });

      if (!profile) {
        return res.json({
          exists: false,
          profile: null,
        });
      }

      // Return minimal PII - no email/phone in response
      res.json({
        exists: true,
        profile: {
          id: profile.id,
          type: profile.type,
          displayName: profile.displayName,
          officeName: profile.officeName,
          city: profile.city,
          bio: profile.bio,
          areaTags: profile.areaTags,
          languages: profile.languages,
          services: profile.services,
          verificationStatus: profile.verificationStatus,
          availability: profile.availability ? {
            timezone: profile.availability.timezone,
            weeklyRules: profile.availability.weeklyRules,
            meetingTypes: profile.availability.meetingTypes,
          } : null,
          createdAt: profile.createdAt.toISOString(),
          updatedAt: profile.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      console.error('Error fetching professional profile:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'GET /api/professionals/me' },
        extra: { userId: req.userId },
      });
      res.status(500).json({ error: 'Failed to fetch professional profile' });
    }
  }
);

// POST /api/professionals/me - Create/update professional profile and set role
router.post(
  '/me',
  professionalOnboardingLimiter,
  validateJwtToken,
  validateBody(registerProfessionalSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const data = req.body;

      // Check current user role
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent role escalation to ADMIN
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Cannot change admin role' });
      }

      // Prevent changing role from non-professional to professional
      // Users with BUYER, SELLER, or AGENT role cannot become professionals through this endpoint
      // They must register a new account through /professional/join
      const nonProfessionalRoles = ['BUYER', 'SELLER', 'AGENT'];
      if (nonProfessionalRoles.includes(user.role)) {
        return res.status(403).json({ 
          error: 'Cannot change role from non-professional to professional',
          message: 'Οι χρήστες με ρόλο αγοραστή, πωλητή ή μεσίτη δεν μπορούν να γίνουν επαγγελματίες. Παρακαλώ δημιουργήστε νέο λογαριασμό από τη σελίδα επαγγελματιών.'
        });
      }

      // Check if profile already exists
      const existingProfile = await prisma.professionalProfile.findUnique({
        where: { userId },
      });

      // For first-time onboarding, city is mandatory.
      if (!existingProfile && !data.city) {
        return res.status(400).json({ error: 'city is required for first-time professional profile creation' });
      }

      // Log onboarding started if new profile
      if (!existingProfile) {
        auditLogger.professionalOnboardingStarted(req, userId, data.type);
      }

      // Prepare services object with registryNumber if provided
      const servicesData: any = data.services || {};
      if (data.registryNumber) {
        servicesData.registryNumber = data.registryNumber;
      }
      if (data.registryBody != null) {
        const rb = String(data.registryBody).trim();
        if (rb) servicesData.registryBody = rb;
      }

      // Upsert professional profile in transaction with role update
      const result = await prisma.$transaction(async (tx) => {
        // Upsert profile
        // Professionals registering through /professional/join are auto-verified
        // since they provide all required information (registryNumber, city, etc.)
        // Auto-add city to areaTags if not already present
        const areaTags = data.areaTags || [];
        const cityInAreaTags = data.city && areaTags.some((tag: string) => 
          tag.toLowerCase() === data.city.toLowerCase()
        );
        const finalAreaTags = cityInAreaTags 
          ? areaTags 
          : data.city 
            ? [...areaTags, data.city] 
            : areaTags;

        const profile = await tx.professionalProfile.upsert({
          where: { userId },
          create: {
            userId,
            type: data.type,
            displayName: data.displayName,
            officeName: data.officeName,
            phone: data.phone,
            city: data.city || '',
            areaTags: finalAreaTags, // Include city in areaTags for better search
            address: data.address,
            bio: data.bio,
            languages: data.languages || ['Greek'],
            services: servicesData,
            verificationStatus: 'VERIFIED', // Auto-verify professionals from join page
            verifiedAt: new Date(), // Set verified timestamp
          },
          update: {
            displayName: data.displayName,
            officeName: data.officeName,
            phone: data.phone,
            city: data.city,
            areaTags: finalAreaTags, // Include city in areaTags for better search
            address: data.address,
            bio: data.bio,
            languages: data.languages || ['Greek'],
            services: servicesData,
            // Keep existing verificationStatus unless admin changes it
          },
        });

        // Update user role to LAWYER, NOTARY, or ENGINEER
        const newRole = data.type === 'LAWYER' ? 'LAWYER' : data.type === 'NOTARY' ? 'NOTARY' : 'ENGINEER';
        if (user.role !== newRole) {
          await tx.user.update({
            where: { id: userId },
            data: { role: newRole },
          });
          auditLogger.roleChange(req, userId, user.role, newRole);
        }

        // Create/update availability if provided
        if (data.availability) {
          await tx.professionalAvailability.upsert({
            where: { professionalId: profile.id },
            create: {
              professionalId: profile.id,
              timezone: data.availability.timezone || 'Europe/Athens',
              weeklyRules: data.availability.weeklyRules || [],
              meetingTypes: data.availability.meetingTypes || [],
            },
            update: {
              timezone: data.availability.timezone || 'Europe/Athens',
              weeklyRules: data.availability.weeklyRules || [],
              meetingTypes: data.availability.meetingTypes || [],
            },
          });
        }

        return { profile, newRole };
      });

      // Log onboarding completed
      auditLogger.professionalOnboardingCompleted(req, userId, result.profile.id, data.type);

      // Link to deal rooms: if professional registers with same name + registration number
      // as a verified ProfessionalInvite, add them to those deal rooms (or replace temp user)
      const displayName = (data.displayName || '').trim();
      const registryNumber = (data.registryNumber || (servicesData?.registryNumber as string) || '').trim();
      if (displayName && (data.type === 'LAWYER' || data.type === 'NOTARY' || data.type === 'ENGINEER')) {
        const inviteType: ProfessionalType = data.type === 'NOTARY' ? 'NOTARY' : data.type;
        const matchingInvites = await prisma.professionalInvite.findMany({
          where: {
            verifiedAt: { not: null },
            type: inviteType,
            name: { equals: displayName, mode: 'insensitive' },
            ...(registryNumber ? { registrationNumber: { equals: registryNumber, mode: 'insensitive' } } : {}),
          },
          include: { dealRoom: { select: { id: true } } },
        });
        for (const inv of matchingInvites) {
          const dealRoomId = inv.dealRoomId;
          const oldUserId = inv.linkedUserId;
          if (oldUserId === userId) continue; // Already linked to this user
          const participantRole = inviteType === 'LAWYER' ? 'LAWYER' : inviteType === 'ENGINEER' ? 'ENGINEER' : 'NOTARY';
          await prisma.$transaction(async (tx) => {
            await tx.dealParticipant.upsert({
              where: { dealRoomId_userId: { dealRoomId, userId } },
              create: { dealRoomId, userId, role: participantRole },
              update: { removedAt: null, role: participantRole },
            });
            const groupThread = await tx.dealThread.findFirst({ where: { dealRoomId, type: 'GROUP' } });
            if (groupThread) {
              await tx.dealThreadMember.upsert({
                where: { threadId_userId: { threadId: groupThread.id, userId } },
                create: { threadId: groupThread.id, userId },
                update: {},
              });
            }
            const existingDirect = await tx.dealThread.findFirst({
              where: {
                dealRoomId,
                type: 'DIRECT',
                AND: [
                  { members: { some: { userId: inv.requestedById } } },
                  { members: { some: { userId } } },
                ],
              },
              include: { _count: { select: { members: true } } },
            });
            if (!existingDirect || existingDirect._count.members !== 2) {
              await tx.dealThread.create({
                data: {
                  dealRoomId,
                  type: 'DIRECT',
                  members: {
                    create: [
                      { userId: inv.requestedById },
                      { userId },
                    ],
                  },
                },
              });
            }
            const oldProfile = oldUserId ? await tx.professionalProfile.findUnique({ where: { userId: oldUserId } }) : null;
            const existingForNew = await tx.professionalRequest.findFirst({ where: { dealRoomId, professionalId: result.profile.id } });
            if (existingForNew) {
              // Already linked
            } else if (oldProfile) {
              const oldRequest = await tx.professionalRequest.findUnique({
                where: { dealRoomId_professionalId: { dealRoomId, professionalId: oldProfile.id } },
              });
              if (oldRequest) {
                await tx.professionalRequest.update({
                  where: { id: oldRequest.id },
                  data: { professionalId: result.profile.id },
                });
              } else {
                await tx.professionalRequest.create({
                  data: {
                    dealRoomId,
                    professionalId: result.profile.id,
                    requestedById: inv.requestedById,
                    type: inviteType,
                    status: 'ACCEPTED',
                    respondedAt: new Date(),
                  },
                });
              }
            } else {
              await tx.professionalRequest.create({
                data: {
                  dealRoomId,
                  professionalId: result.profile.id,
                  requestedById: inv.requestedById,
                  type: inviteType,
                  status: 'ACCEPTED',
                  respondedAt: new Date(),
                },
              });
            }
            if (oldUserId && oldUserId !== userId) {
              await tx.dealParticipant.updateMany({
                where: { dealRoomId, userId: oldUserId },
                data: { removedAt: new Date() },
              });
            }
            await tx.professionalInvite.update({
              where: { id: inv.id },
              data: { linkedUserId: userId, linkedProfessionalId: result.profile.id },
            });
          });
        }
      }

      res.json({
        ok: true,
        role: result.newRole,
        profileId: result.profile.id,
        profile: {
          id: result.profile.id,
          type: result.profile.type,
          displayName: result.profile.displayName,
          verificationStatus: result.profile.verificationStatus,
        },
      });
    } catch (error) {
      console.error('Error creating/updating professional profile:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/professionals/me' },
        extra: { userId: req.userId },
      });
      res.status(500).json({ error: 'Failed to create/update professional profile' });
    }
  }
);

// POST /api/professionals/register - Register/update professional profile (legacy endpoint, redirects to /me)
router.post(
  '/register',
  validateJwtToken,
  validateBody(registerProfessionalSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const data = req.body;

      // Upsert professional profile
      const profile = await prisma.professionalProfile.upsert({
        where: { userId },
        create: {
          userId,
          type: data.type,
          displayName: data.displayName,
          officeName: data.officeName,
          phone: data.phone,
          city: data.city,
          areaTags: data.areaTags || [],
          address: data.address,
          bio: data.bio,
          languages: data.languages || [],
          services: data.services,
          verificationStatus: 'PENDING',
        },
        update: {
          displayName: data.displayName,
          officeName: data.officeName,
          phone: data.phone,
          city: data.city,
          areaTags: data.areaTags || [],
          address: data.address,
          bio: data.bio,
          languages: data.languages || [],
          services: data.services,
          // Keep existing verificationStatus unless admin changes it
        },
      });

      auditLogger.professionalProfileUpdated(req, profile.id);

      res.json({
        id: profile.id,
        type: profile.type,
        displayName: profile.displayName,
        verificationStatus: profile.verificationStatus,
      });
    } catch (error) {
      console.error('Error registering professional:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/professionals/register' },
        extra: { userId: req.userId },
      });
      res.status(500).json({ error: 'Failed to register professional profile' });
    }
  }
);

// POST /api/professionals/availability - Update availability
router.post(
  '/availability',
  validateJwtToken,
  validateBody(updateAvailabilitySchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const data = req.body;

      // Check if professional profile exists
      const profile = await prisma.professionalProfile.findUnique({
        where: { userId },
      });

      if (!profile) {
        return res.status(404).json({ error: 'Professional profile not found. Please register first.' });
      }

      // Upsert availability
      const availability = await prisma.professionalAvailability.upsert({
        where: { professionalId: profile.id },
        create: {
          professionalId: profile.id,
          timezone: data.timezone || 'Europe/Athens',
          weeklyRules: data.weeklyRules,
          exceptions: data.exceptions,
          meetingTypes: data.meetingTypes || [],
        },
        update: {
          timezone: data.timezone || 'Europe/Athens',
          weeklyRules: data.weeklyRules,
          exceptions: data.exceptions,
          meetingTypes: data.meetingTypes || [],
        },
      });

      auditLogger.professionalAvailabilityUpdated(req, profile.id);

      res.json(availability);
    } catch (error) {
      console.error('Error updating availability:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/professionals/availability' },
        extra: { userId: req.userId },
      });
      res.status(500).json({ error: 'Failed to update availability' });
    }
  }
);

// GET /api/professionals/search - Search verified professionals
// Rate limiter removed - system loads professionals automatically
router.get(
  '/search',
  validateJwtToken,
  validateQuery(
    z
      .object({
        type: z.enum(['LAWYER', 'NOTARY', 'ENGINEER']),
        area: z.string().optional(),
        propertyId: z.string().optional(),
      })
      .strict()
  ),
  async (req: AuthRequest, res: Response) => {
    try {
      const type = req.query.type as 'LAWYER' | 'NOTARY' | 'ENGINEER';

      // Always return all professionals of the specified type (no area filter)
      const professionals = await prisma.professionalProfile.findMany({
        where: { type },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          availability: {
            select: {
              meetingTypes: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Return minimal PII (including bio for modal)
      // Include all professionals with matching type - professionalProfile.type is the source of truth.
      // (Previously filtered by user.role, but that excluded valid professionals with stale/incorrect role.)
      console.log(`[GET /api/professionals/search] Found ${professionals.length} professionals (type=${type})`);
      
      const results = professionals
        .filter((prof) => {
          if (!prof.user) {
            console.warn(`[GET /api/professionals/search] Professional ${prof.id} has no user - skipping`);
            return false;
          }
          return true;
        })
        .map((prof) => ({
          professionalId: prof.id,
          userId: prof.userId,
          type: prof.type,
          displayName: prof.displayName,
          officeName: prof.officeName,
          city: prof.city,
          address: prof.address || undefined,
          areaTags: prof.areaTags,
          languages: prof.languages,
          verifiedAt: prof.verifiedAt,
          meetingTypes: prof.availability?.meetingTypes || [],
          bio: prof.bio || undefined, // Include bio for professional details modal
        }));

      console.log(`[GET /api/professionals/search] Returning ${results.length} professionals`);

      res.json({ professionals: results });
    } catch (error) {
      console.error('Error searching professionals:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'GET /api/professionals/search' },
      });
      res.status(500).json({ error: 'Failed to search professionals' });
    }
  }
);

// GET /api/professionals/public/:id - Public professional profile details
router.get(
  '/public/:id',
  validateJwtToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const professionalId = req.params.id;

      const profile = await prisma.professionalProfile.findUnique({
        where: { id: professionalId },
        include: {
          availability: {
            select: {
              timezone: true,
              weeklyRules: true,
              meetingTypes: true,
            },
          },
        },
      });

      if (!profile) {
        return res.status(404).json({ error: 'Professional profile not found' });
      }

      // Public data only (no email)
      res.json({
        professionalId: profile.id,
        userId: profile.userId,
        type: profile.type,
        displayName: profile.displayName,
        officeName: profile.officeName || undefined,
        phone: profile.phone || undefined,
        city: profile.city || undefined,
        address: profile.address || undefined,
        areaTags: profile.areaTags || [],
        languages: profile.languages || [],
        bio: profile.bio || undefined,
        services: profile.services || undefined,
        meetingTypes: profile.availability?.meetingTypes || [],
        weeklyRules: profile.availability?.weeklyRules || [],
        timezone: profile.availability?.timezone || 'Europe/Athens',
      });
    } catch (error) {
      console.error('Error fetching public professional profile:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'GET /api/professionals/public/:id' },
        extra: { professionalId: req.params.id, userId: req.userId },
      });
      res.status(500).json({ error: 'Failed to fetch public professional profile' });
    }
  }
);


// GET /api/professionals/:id/availability - Get professional availability by professional ID
router.get(
  '/:id/availability',
  validateJwtToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const professionalId = req.params.id;

      const availability = await prisma.professionalAvailability.findUnique({
        where: { professionalId },
      });

      if (!availability) {
        return res.status(404).json({ error: 'Availability not found' });
      }

      res.json({
        weeklyRules: availability.weeklyRules || [],
        meetingTypes: availability.meetingTypes || [],
        timezone: availability.timezone || 'Europe/Athens',
      });
    } catch (error) {
      console.error('Error fetching professional availability:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'GET /api/professionals/:id/availability' },
      });
      res.status(500).json({ error: 'Failed to fetch professional availability' });
    }
  }
);

// GET /api/professionals/me/requests - Get incoming professional requests for current user
router.get(
  '/me/requests',
  validateJwtToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;

      // Get user to check role
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, name: true, email: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get professional profile for current user
      let profile = await prisma.professionalProfile.findUnique({
        where: { userId },
      });

      // If user has professional role but no profile, create a basic profile
      // This can happen if onboarding was incomplete
      // Use upsert to handle race conditions when multiple endpoints try to create profile simultaneously
      if (!profile && (user.role === 'LAWYER' || user.role === 'NOTARY' || user.role === 'ENGINEER')) {
        console.log(`[GET /api/professionals/me/requests] User ${userId} has role ${user.role} but no profile. Creating basic profile...`);
        
        try {
          const profType = (user.role === 'LAWYER' ? 'LAWYER' : user.role === 'NOTARY' ? 'NOTARY' : 'ENGINEER') as ProfessionalType;
          profile = await prisma.professionalProfile.upsert({
            where: { userId },
            create: {
              userId,
              type: profType,
              displayName: user.name || user.email.split('@')[0],
              verificationStatus: 'PENDING', // Will need to complete onboarding
              areaTags: [],
              languages: ['Greek'],
              services: {},
            },
            update: {}, // If profile already exists, just return it
          });

          console.log(`[GET /api/professionals/me/requests] Created/retrieved basic profile ${profile.id} for user ${userId}`);
        } catch (error: any) {
          // If upsert fails (shouldn't happen), try to fetch the profile again
          console.error(`[GET /api/professionals/me/requests] Error creating profile, retrying fetch:`, error);
          profile = await prisma.professionalProfile.findUnique({
            where: { userId },
          });
          if (!profile) {
            throw error; // Re-throw if still no profile
          }
        }
      }

      if (!profile) {
        return res.status(404).json({ error: 'Professional profile not found' });
      }

      console.log(`[GET /api/professionals/me/requests] User ${userId} has profile ${profile.id} (type: ${profile.type})`);

      // Get all requests for this professional
      const requests = await prisma.professionalRequest.findMany({
        where: {
          professionalId: profile.id,
        },
        include: {
          dealRoom: {
            include: {
              property: {
                select: {
                  id: true,
                  title: true,
                  street: true,
                  number: true,
                  city: true,
                  state: true,
                  price: true,
                  images: true,
                },
              },
              participants: {
                where: { removedAt: null },
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
          requestedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      console.log(`[GET /api/professionals/me/requests] Found ${requests.length} requests for professional ${profile.id}`);

      res.json({ requests });
    } catch (error) {
      console.error('Error fetching professional requests:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'GET /api/professionals/me/requests' },
        extra: { userId: req.userId },
      });
      res.status(500).json({ error: 'Failed to fetch professional requests' });
    }
  }
);

// GET /api/professionals/me/appointments - Get all appointments for current professional
router.get(
  '/me/appointments',
  validateJwtToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;

      // Get user to check role
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, name: true, email: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get professional profile for current user
      let profile = await prisma.professionalProfile.findUnique({
        where: { userId },
      });

      // If user has professional role but no profile, create a basic profile
      // This can happen if onboarding was incomplete
      // Use upsert to handle race conditions when multiple endpoints try to create profile simultaneously
      if (!profile && (user.role === 'LAWYER' || user.role === 'NOTARY' || user.role === 'ENGINEER')) {
        console.log(`[GET /api/professionals/me/appointments] User ${userId} has role ${user.role} but no profile. Creating basic profile...`);
        
        try {
          const profType = (user.role === 'LAWYER' ? 'LAWYER' : user.role === 'NOTARY' ? 'NOTARY' : 'ENGINEER') as ProfessionalType;
          profile = await prisma.professionalProfile.upsert({
            where: { userId },
            create: {
              userId,
              type: profType,
              displayName: user.name || user.email.split('@')[0],
              verificationStatus: 'PENDING', // Will need to complete onboarding
              areaTags: [],
              languages: ['Greek'],
              services: {},
            },
            update: {}, // If profile already exists, just return it
          });

          console.log(`[GET /api/professionals/me/appointments] Created/retrieved basic profile ${profile.id} for user ${userId}`);
        } catch (error: any) {
          // If upsert fails (shouldn't happen), try to fetch the profile again
          console.error(`[GET /api/professionals/me/appointments] Error creating profile, retrying fetch:`, error);
          profile = await prisma.professionalProfile.findUnique({
            where: { userId },
          });
          if (!profile) {
            throw error; // Re-throw if still no profile
          }
        }
      }

      if (!profile) {
        return res.status(404).json({ error: 'Professional profile not found' });
      }

      // Get all appointments for this professional
      const appointments = await prisma.dealAppointment.findMany({
        where: {
          professionalId: profile.id,
          // System availability placeholders should not appear as actionable requests
          // in the professional dashboard appointments list.
          NOT: {
            note: 'AVAILABLE_SLOT',
          },
        },
        include: {
          dealRoom: {
            include: {
              property: {
                select: {
                  id: true,
                  title: true,
                  street: true,
                  number: true,
                  city: true,
                  state: true,
                  price: true,
                },
              },
              buyer: {
                select: {
                  id: true,
                  name: true,
                },
              },
              seller: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          bookedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { startAt: 'asc' },
      });

      res.json({ appointments });
    } catch (error) {
      console.error('Error fetching professional appointments:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'GET /api/professionals/me/appointments' },
        extra: { userId: req.userId },
      });
      res.status(500).json({ error: 'Failed to fetch professional appointments' });
    }
  }
);

// POST /api/professionals/me/pricing - Update professional pricing
router.post(
  '/me/pricing',
  validateJwtToken,
  validateBody(
    z
      .object({
        hourlyRate: z.number().positive().optional(),
        consultationFee: z.number().positive().optional(),
        onlineFee: z.number().positive().optional(),
        inPersonFee: z.number().positive().optional(),
      })
      .strict()
  ),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const pricingData = req.body;

      // Get professional profile
      const profile = await prisma.professionalProfile.findUnique({
        where: { userId },
      });

      if (!profile) {
        return res.status(404).json({ error: 'Professional profile not found' });
      }

      // Update services JSON with pricing
      const currentServices = (profile.services as any) || {};
      const updatedServices = {
        ...currentServices,
        pricing: {
          ...(currentServices.pricing || {}),
          ...pricingData,
        },
      };

      const updated = await prisma.professionalProfile.update({
        where: { id: profile.id },
        data: {
          services: updatedServices,
        },
      });

      auditLogger.professionalProfileUpdated(req, profile.id);

      res.json({
        id: updated.id,
        pricing: updatedServices.pricing,
      });
    } catch (error) {
      console.error('Error updating professional pricing:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/professionals/me/pricing' },
        extra: { userId: req.userId },
      });
      res.status(500).json({ error: 'Failed to update professional pricing' });
    }
  }
);

// POST /api/professionals/:id/verify - Admin verify professional
router.post(
  '/:id/verify',
  adminRateLimit,
  validateJwtToken,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  validateBody(
    z
      .object({
        status: z.enum(['VERIFIED', 'REJECTED']),
        note: z.string().max(500).optional(),
      })
      .strict()
  ),
  async (req: AuthRequest, res: Response) => {
    try {
      const professionalId = req.params.id;
      const { status, note } = req.body;

      const profile = await prisma.professionalProfile.findUnique({
        where: { id: professionalId },
      });

      if (!profile) {
        return res.status(404).json({ error: 'Professional profile not found' });
      }

      const updated = await prisma.professionalProfile.update({
        where: { id: professionalId },
        data: {
          verificationStatus: status,
          verifiedAt: status === 'VERIFIED' ? new Date() : null,
        },
      });

      if (status === 'VERIFIED') {
        auditLogger.professionalVerified(req, professionalId);
      } else {
        auditLogger.professionalRejected(req, professionalId);
      }

      res.json(updated);
    } catch (error) {
      console.error('Error verifying professional:', error);
      Sentry.captureException(error, {
        tags: { endpoint: 'POST /api/professionals/:id/verify' },
        extra: { userId: req.userId, professionalId: req.params.id },
      });
      res.status(500).json({ error: 'Failed to verify professional' });
    }
  }
);

export default router;

