import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, requireRole, AuthRequest } from '../middleware/auth';
import { randomUUID } from 'crypto';

const router = Router();

// GET /api/users/check-email - Check if email exists
router.get('/check-email', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const email = req.query.email as string;

    if (!email) {
      return res.status(400).json({
        error: 'Email parameter is required'
      });
    }

    // Έλεγχος αν υπάρχει χρήστης με αυτό το email
    const user = await prisma.user.findUnique({
      where: { email: email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    res.json({
      exists: !!user,
      user: user
    });
  } catch (error) {
    console.error('Error checking user email:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// GET /api/users - Get all users (admin only)
router.get('/', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      error: 'Internal Server Error'
    });
  }
});

// GET /api/users/:id - Get user by ID (admin only)
router.get('/:id', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        userType: true,
        phone: true,
        companyName: true,
        licenseNumber: true,
        businessAddress: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      error: 'Internal Server Error'
    });
  }
});

// PUT /api/users/:id - Update user (admin only)
router.put('/:id', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      email,
      role,
      phone,
      companyName,
      licenseNumber,
      businessAddress
    } = req.body;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(role && { role }),
        ...(phone !== undefined && { phone }),
        ...(companyName !== undefined && { companyName }),
        ...(licenseNumber !== undefined && { licenseNumber }),
        ...(businessAddress !== undefined && { businessAddress })
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        userType: true,
        phone: true,
        companyName: true,
        licenseNumber: true,
        businessAddress: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      error: 'Internal Server Error'
    });
  }
});

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.delete({
      where: { id: req.params.id }
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      error: 'Internal Server Error'
    });
  }
});

// POST /api/users/:id/points - Add/remove points to user (admin only)
router.post('/:id/points', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { points, reason } = req.body;
    const userId = req.params.id;

    if (!points || !reason) {
      return res.status(400).json({
        error: 'Missing required fields: points and reason'
      });
    }

    // Έλεγχος αν ο χρήστης υπάρχει
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Αν προσπαθούμε να αφαιρέσουμε πόντους, ελέγχουμε αν ο χρήστης έχει αρκετούς
    if (points < 0) {
      // Υπολογίζουμε τους συνολικούς πόντους του χρήστη
      const totalPointsResult = await prisma.$queryRaw`
        SELECT COALESCE(SUM(rp.points), 0) as "totalPoints"
        FROM referral_points rp
        INNER JOIN referrals r ON rp."referralId" = r.id
        WHERE (r."referrerId" = ${userId} OR r."referredId" = ${userId})
      `;

      const totalPoints = Number((totalPointsResult as any)[0]?.totalPoints || 0);
      const pointsToRemove = Math.abs(points);

      if (totalPoints < pointsToRemove) {
        return res.status(400).json({
          error: `Ο χρήστης έχει μόνο ${totalPoints} πόντους. Δεν μπορείτε να αφαιρέσετε ${pointsToRemove} πόντους.`
        });
      }
    }

    // Βρίσκουμε ή δημιουργούμε referral record για τον χρήστη
    let referralId: string;
    const existingReferral = await prisma.$queryRaw`
      SELECT id FROM referrals WHERE "referrerId" = ${userId} AND "isActive" = true LIMIT 1
    `;

    if (existingReferral && Array.isArray(existingReferral) && existingReferral.length > 0) {
      // Χρησιμοποιούμε το υπάρχον referral
      referralId = (existingReferral[0] as any).id;
    } else {
      // Δημιουργούμε ένα νέο referral record
      referralId = randomUUID();
      const newReferralCode = randomUUID().substring(0, 16);

      await prisma.$executeRaw`
        INSERT INTO referrals (id, "referrerId", "referredId", "referralCode", "isActive", "createdAt", "updatedAt", "totalPoints", "propertiesAdded", "totalArea")
        VALUES (${referralId}, ${userId}, ${userId}, ${newReferralCode}, true, NOW(), NOW(), 0, 0, 0)
      `;
    }

    // Προσθήκη πόντων στον χρήστη
    await prisma.$executeRaw`
      INSERT INTO referral_points (id, "referralId", "userId", points, reason, "createdAt")
      VALUES (${randomUUID()}, ${referralId}, ${userId}, ${points}, ${reason}, NOW())
    `;

    // Ενημέρωση των στατιστικών του referral
    await prisma.$executeRaw`
      UPDATE referrals 
      SET "totalPoints" = "totalPoints" + ${points}, 
          "updatedAt" = NOW()
      WHERE id = ${referralId}
    `;

    res.json({
      success: true,
      message: 'Points added successfully',
      points,
      reason
    });
  } catch (error) {
    console.error('Error adding points:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;















