import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, requireRole, AuthRequest } from '../middleware/auth';
import { randomBytes, randomUUID } from 'crypto';

const router = Router();

// POST /api/referrals - Create referral
router.post('/', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { referredUserId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate unique referral code
    const referralCode = randomBytes(8).toString('hex');

    // For now, return only the referral code
    const referralData = {
      referrerId: userId,
      referredId: referredUserId,
      referralCode,
      totalPoints: 100,
      propertiesAdded: 0,
      totalArea: 0,
    };

    res.json({
      success: true,
      referral: referralData,
      message: 'Referral created successfully'
    });
  } catch (error) {
    console.error('Error creating referral:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// GET /api/referrals - Get referral statistics
router.get('/', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const requestedUserId = req.query.userId as string;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const targetUserId = requestedUserId || userId;

    // Check authorization
    if (req.userRole !== 'ADMIN' && userId !== targetUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // For now, return mock data
    const mockData = {
      referralsMade: [],
      totalPoints: 1250,
      totalProperties: 3,
      totalArea: 450,
      recentPoints: [
        {
          id: '1',
          points: 100,
          reason: 'registration',
          createdAt: new Date('2024-01-15'),
          referral: {
            referred: {
              name: 'Γιώργος Παπαδόπουλος',
              email: 'giorgos@example.com',
            },
          },
        },
        {
          id: '2',
          points: 500,
          reason: 'property_added',
          createdAt: new Date('2024-01-10'),
          property: {
            title: 'Μοντέρνο διαμέρισμα στο κέντρο',
            area: 120,
            city: 'Αθήνα',
          },
        },
      ],
    };

    res.json({
      success: true,
      data: mockData,
    });
  } catch (error) {
    console.error('Error fetching referral data:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// POST /api/referrals/generate-link - Generate referral link
router.post('/generate-link', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Generating referral link for user:', userId);

    // Check if referral code already exists for this user as referrer
    const existingReferral = await prisma.$queryRaw`
      SELECT * FROM referrals WHERE "referrerId" = ${userId} AND "referredId" != ${userId} AND "isActive" = true
    `;

    console.log('Existing referral found:', existingReferral);

    let referralCode: string = '';

    if (existingReferral && Array.isArray(existingReferral) && existingReferral.length > 0) {
      // Use existing code
      referralCode = (existingReferral[0] as any).referralCode;
    } else {
      // Generate new unique referral code
      let isUnique = false;
      let tempReferralCode: string;

      while (!isUnique) {
        tempReferralCode = randomBytes(8).toString('hex');

        // Check if already exists
        const existing = await prisma.$queryRaw`
          SELECT * FROM referrals WHERE "referralCode" = ${tempReferralCode}
        `;

        if (!existing || !Array.isArray(existing) || existing.length === 0) {
          isUnique = true;
          referralCode = tempReferralCode;
        }
      }

      // Create referral record (only for referrer, with referredId equal to referrerId temporarily)
      await prisma.$executeRaw`
        INSERT INTO referrals (id, "referrerId", "referredId", "referralCode", "totalPoints", "propertiesAdded", "totalArea", "isActive", "createdAt", "updatedAt")
        VALUES (${randomUUID()}, ${userId}, ${userId}, ${referralCode}, 0, 0, 0, true, NOW(), NOW())
      `;

      console.log('Created referral record with code:', referralCode);
    }

    const baseUrl = process.env.NEXTAUTH_URL || process.env.BASE_URL || 'http://localhost:3004';
    const referralLink = `${baseUrl}/register?ref=${referralCode}`;

    res.json({
      success: true,
      referralCode,
      referralLink,
      message: 'Referral link generated successfully'
    });
  } catch (error) {
    console.error('Error generating referral link:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// GET /api/referrals/stats - Get referral statistics
router.get('/stats', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const requestedUserId = req.query.userId as string;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!requestedUserId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }

    // Check if user is admin or requesting their own stats
    if (req.userRole !== 'ADMIN' && userId !== requestedUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch referrals where user is referrer (has brought others)
    const referrerStats = await prisma.$queryRaw`
      SELECT 
        r.id,
        r."referralCode",
        r."createdAt" as "referralCreatedAt",
        r."referredId",
        'referrer' as "type"
      FROM referrals r
      WHERE r."referrerId" = ${requestedUserId} AND r."referredId" != ${requestedUserId}
      ORDER BY r."createdAt" DESC
    `;

    // Fetch referrals where user is referred (has registered via referral)
    const referredStats = await prisma.$queryRaw`
      SELECT 
        r.id,
        r."referralCode",
        r."createdAt" as "referralCreatedAt",
        r."referrerId",
        'referred' as "type"
      FROM referrals r
      WHERE r."referredId" = ${requestedUserId} AND r."referrerId" != ${requestedUserId}
      ORDER BY r."createdAt" DESC
    `;

    // Combine both sets
    const allReferrals = [...(referrerStats as any[]), ...(referredStats as any[])];

    // Fetch points that belong to this user
    const userPoints = await prisma.$queryRaw`
      SELECT 
        rp.id,
        rp."referralId",
        rp."propertyId",
        rp.points,
        rp.reason,
        rp."createdAt",
        CASE 
          WHEN r."referrerId" = ${requestedUserId} AND rp."userId" = ${requestedUserId} THEN 'referrer'
          WHEN r."referredId" = ${requestedUserId} AND rp."userId" = ${requestedUserId} THEN 'referred'
          ELSE 'other'
        END as "pointType"
      FROM referral_points rp
      INNER JOIN referrals r ON rp."referralId" = r.id
      WHERE rp."userId" = ${requestedUserId}
      ORDER BY rp."createdAt" DESC
    `;

    // Calculate total points for this user
    const totalPointsResult = await prisma.$queryRaw`
      SELECT COALESCE(SUM(rp.points), 0) as "totalPoints"
      FROM referral_points rp
      WHERE rp."userId" = ${requestedUserId}
    `;

    const totalPoints = Number((totalPointsResult as any)[0]?.totalPoints || 0);

    // Calculate points as referrer
    const referrerPointsResult = await prisma.$queryRaw`
      SELECT COALESCE(SUM(rp.points), 0) as "referrerPoints"
      FROM referral_points rp
      INNER JOIN referrals r ON rp."referralId" = r.id
      WHERE rp."userId" = ${requestedUserId} AND r."referrerId" = ${requestedUserId} AND r."referredId" != ${requestedUserId}
    `;
    const referrerPoints = Number((referrerPointsResult as any)[0]?.referrerPoints || 0);

    // Calculate points as referred
    const referredPointsResult = await prisma.$queryRaw`
      SELECT COALESCE(SUM(rp.points), 0) as "referredPoints"
      FROM referral_points rp
      INNER JOIN referrals r ON rp."referralId" = r.id
      WHERE rp."userId" = ${requestedUserId} AND r."referredId" = ${requestedUserId} AND r."referrerId" != ${requestedUserId}
    `;
    const referredPoints = Number((referredPointsResult as any)[0]?.referredPoints || 0);

    res.json({
      referrals: allReferrals,
      points: userPoints,
      totalPoints: totalPoints,
      referrerPoints: referrerPoints,
      referredPoints: referredPoints
    });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/referrals/leaderboard - Get referral leaderboard
router.get('/leaderboard', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch top 10 users based on total points
    const leaderboardData = await prisma.$queryRaw`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.image,
        COALESCE(SUM(rp.points), 0) as "totalPoints",
        COUNT(DISTINCT r.id) as "totalReferrals",
        COUNT(DISTINCT CASE WHEN rp.reason = 'property_added' THEN rp."propertyId" END) as "propertiesAdded",
        MAX(rp."createdAt") as "lastActivity"
      FROM users u
      LEFT JOIN referral_points rp ON u.id = rp."userId"
      LEFT JOIN referrals r ON (r."referrerId" = u.id OR r."referredId" = u.id)
      WHERE u.id != ${userId}
      GROUP BY u.id, u.name, u.email, u.role, u.image
      HAVING COALESCE(SUM(rp.points), 0) > 0
      ORDER BY "totalPoints" DESC, "totalReferrals" DESC
      LIMIT 10
    `;

    // Fetch current user rank
    const currentUserRank = await prisma.$queryRaw`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.image,
        COALESCE(SUM(rp.points), 0) as "totalPoints",
        COUNT(DISTINCT r.id) as "totalReferrals",
        COUNT(DISTINCT CASE WHEN rp.reason = 'property_added' THEN rp."propertyId" END) as "propertiesAdded",
        MAX(rp."createdAt") as "lastActivity",
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(rp.points), 0) DESC, COUNT(DISTINCT r.id) DESC) as "rank"
      FROM users u
      LEFT JOIN referral_points rp ON u.id = rp."userId"
      LEFT JOIN referrals r ON (r."referrerId" = u.id OR r."referredId" = u.id)
      GROUP BY u.id, u.name, u.email, u.role, u.image
      HAVING u.id = ${userId}
    `;

    // Calculate total number of users with points
    const totalUsersResult = await prisma.$queryRaw`
      SELECT COUNT(*) as "totalUsers"
      FROM (
        SELECT u.id
        FROM users u
        LEFT JOIN referral_points rp ON u.id = rp."userId"
        GROUP BY u.id
        HAVING COALESCE(SUM(rp.points), 0) > 0
      ) as users_with_points
    `;

    const totalUsers = Number((totalUsersResult as any[])[0]?.totalUsers || 0);

    // Add ranking to top 10
    const leaderboardWithRanking = (leaderboardData as any[]).map((agent, index) => ({
      ...agent,
      rank: index + 1,
      totalPoints: Number(agent.totalPoints),
      totalReferrals: Number(agent.totalReferrals),
      propertiesAdded: Number(agent.propertiesAdded)
    }));

    const currentUser = (currentUserRank as any[])[0] ? {
      ...(currentUserRank as any[])[0],
      rank: Number((currentUserRank as any[])[0].rank),
      totalPoints: Number((currentUserRank as any[])[0].totalPoints),
      totalReferrals: Number((currentUserRank as any[])[0].totalReferrals),
      propertiesAdded: Number((currentUserRank as any[])[0].propertiesAdded)
    } : null;

    res.json({
      leaderboard: leaderboardWithRanking,
      currentUser,
      totalUsers
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/referrals/process-property - Process property points
router.post('/process-property', async (req: Request, res: Response) => {
  try {
    const { propertyId, userId, area, location } = req.body;

    if (!propertyId || !userId) {
      return res.status(400).json({
        error: 'Missing property ID or user ID'
      });
    }

    // Calculate points based on area and location
    let points = 0;

    if (area) {
      // Base points: 1 point per 10 sqm
      points = Math.floor(area / 10);

      // Bonus points for large areas
      if (area > 200) {
        points += Math.floor((area - 200) / 20) * 2; // +2 points per 20 sqm extra
      }
    }

    // Bonus points for premium areas
    const premiumAreas = ['Αθήνα', 'Θεσσαλονίκη', 'Πειραιάς', 'Πάτρα'];
    if (location && premiumAreas.some(area => location.includes(area))) {
      points = Math.floor(points * 1.5); // +50% for premium areas
    }

    // Minimum points: 50
    points = Math.max(points, 50);

    // Find referral for this user
    const userReferral = await prisma.$queryRaw`
      SELECT id FROM referrals WHERE "referredId" = ${userId} AND "isActive" = true
    `;

    if (userReferral && Array.isArray(userReferral) && userReferral.length > 0) {
      const referralId = (userReferral[0] as any).id;

      // Add points for property
      await prisma.$executeRaw`
        INSERT INTO referral_points (id, "referralId", "propertyId", "userId", points, reason, area, location, "createdAt")
        VALUES (${randomUUID()}, ${referralId}, ${propertyId}, ${userId}, ${points}, 'property_added', ${area || null}, ${location || null}, NOW())
      `;

      // Update referral statistics
      await prisma.$executeRaw`
        UPDATE referrals 
        SET "totalPoints" = "totalPoints" + ${points}, 
            "propertiesAdded" = "propertiesAdded" + 1,
            "totalArea" = "totalArea" + ${area || 0},
            "updatedAt" = NOW()
        WHERE id = ${referralId}
      `;

      console.log(`Property points added: ${propertyId} by user: ${userId}, Points: ${points}`);
    } else {
      console.log(`No active referral found for user: ${userId}`);
    }

    res.json({
      success: true,
      message: 'Property points calculated and added successfully',
      propertyId,
      userId,
      area,
      location,
      points,
      breakdown: {
        basePoints: area ? Math.floor(area / 10) : 0,
        areaBonus: area > 200 ? Math.floor((area - 200) / 20) * 2 : 0,
        locationBonus: location && premiumAreas.some(area => location.includes(area)) ? '50%' : '0%',
        minimumPoints: 50
      }
    });
  } catch (error) {
    console.error('Error processing property points:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// POST /api/referrals/process-registration - Process registration referral
router.post('/process-registration', async (req: Request, res: Response) => {
  try {
    const { referralCode, userId } = req.body;

    if (!referralCode || !userId) {
      return res.status(400).json({
        error: 'Missing referral code or user ID'
      });
    }

    // Check if user already has a referral as referred
    const existingUserReferral = await prisma.$queryRaw`
      SELECT id FROM referrals WHERE "referredId" = ${userId} AND "isActive" = true LIMIT 1
    `;

    if (existingUserReferral && Array.isArray(existingUserReferral) && existingUserReferral.length > 0) {
      return res.json({
        success: true,
        message: 'User already has a referral as referred',
        referralCode,
        userId,
        referrerPoints: 0,
        referredPoints: 0
      });
    }

    // Find referral by code
    const referral = await prisma.$queryRaw`
      SELECT * FROM referrals WHERE "referralCode" = ${referralCode} AND "isActive" = true
    `;

    if (!referral || !Array.isArray(referral) || referral.length === 0) {
      return res.status(400).json({
        error: 'Invalid referral code'
      });
    }

    const referralData = referral[0] as any;
    const referrerId = referralData.referrerId;

    // Check if user is trying to refer themselves
    if (referrerId === userId) {
      return res.json({
        success: true,
        message: 'Self-referral detected, no points added',
        referralCode,
        userId,
        referrerId: referrerId,
        referrerPoints: 0,
        referredPoints: 0
      });
    }

    // Check if user already has registration points
    const existingRegistrationPoints = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM referral_points rp
      INNER JOIN referrals r ON rp."referralId" = r.id
      WHERE (r."referredId" = ${userId} OR r."referrerId" = ${userId}) 
      AND rp.reason = 'registration'
    `;

    const hasRegistrationPoints = Number((existingRegistrationPoints as any[])[0]?.count || 0) > 0;

    if (hasRegistrationPoints) {
      return res.json({
        success: true,
        message: 'User already has registration points',
        referralCode,
        userId,
        referrerId: referrerId,
        referrerPoints: 0,
        referredPoints: 0
      });
    }

    // Update referral with referred user ID
    await prisma.$executeRaw`
      UPDATE referrals 
      SET "referredId" = ${userId}, "updatedAt" = NOW()
      WHERE "referralCode" = ${referralCode} AND "referrerId" = ${referrerId}
    `;

    // Get referral ID
    const referralResult = await prisma.$queryRaw`
      SELECT id FROM referrals WHERE "referralCode" = ${referralCode} AND "referrerId" = ${referrerId}
    `;

    const referralId = (referralResult as any[])[0]?.id;

    let referrerPointsAdded = 0;
    let referredPointsAdded = 0;

    // Add points to referrer (100 points)
    if (referralId) {
      await prisma.$executeRaw`
        INSERT INTO referral_points (id, "referralId", "userId", points, reason, "createdAt")
        VALUES (${randomUUID()}, ${referralId}, ${referrerId}, 100, 'registration', NOW())
      `;
      referrerPointsAdded = 100;
    }

    // Add points to referred (50 points)
    if (referralId) {
      await prisma.$executeRaw`
        INSERT INTO referral_points (id, "referralId", "userId", points, reason, "createdAt")
        VALUES (${randomUUID()}, ${referralId}, ${userId}, 50, 'registration', NOW())
      `;
      referredPointsAdded = 50;
    }

    // Update referral statistics (total 150 points)
    if (referralId) {
      await prisma.$executeRaw`
        UPDATE referrals 
        SET "totalPoints" = "totalPoints" + 150, 
            "updatedAt" = NOW()
        WHERE id = ${referralId}
      `;
    }

    res.json({
      success: true,
      message: 'Referral processed successfully',
      referralCode,
      userId,
      referrerId: referrerId,
      referrerPoints: referrerPointsAdded,
      referredPoints: referredPointsAdded
    });
  } catch (error) {
    console.error('Error processing registration referral:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// GET /api/referrals/user-referral - Get user's referral info
router.get('/user-referral', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find referral where user is referred
    const referral = await prisma.$queryRaw`
      SELECT * FROM referrals WHERE "referredId" = ${userId} AND "isActive" = true
    `;

    if (!referral || !Array.isArray(referral) || referral.length === 0) {
      return res.json({
        hasReferral: false,
        referral: null
      });
    }

    const referralData = referral[0] as any;

    // Get referrer info
    const referrer = await prisma.user.findUnique({
      where: { id: referralData.referrerId },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    res.json({
      hasReferral: true,
      referral: {
        id: referralData.id,
        referralCode: referralData.referralCode,
        referrer: referrer,
        totalPoints: Number(referralData.totalPoints),
        propertiesAdded: Number(referralData.propertiesAdded),
        totalArea: Number(referralData.totalArea),
        createdAt: referralData.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching user referral:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;

