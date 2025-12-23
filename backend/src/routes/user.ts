import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/user/profile - Get current user profile
router.get('/profile', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const userEmail = req.userEmail;

    console.log('[DEBUG] /api/user/profile - Request details:', {
      userId,
      userEmail,
      authHeader: req.headers.authorization ? 'present' : 'missing',
      timestamp: new Date().toISOString()
    });

    if (!userId) {
      console.error('[DEBUG] /api/user/profile - No userId found in request');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
      console.error('[DEBUG] /api/user/profile - User not found for userId:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('[DEBUG] /api/user/profile - Returning user:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    res.json({ user });
  } catch (error) {
    console.error('[DEBUG] /api/user/profile - Error fetching user profile:', error);
    res.status(500).json({
      error: 'Failed to fetch user profile'
    });
  }
});

// PUT /api/user/profile - Update user profile
router.put('/profile', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name,
      phone,
      companyName,
      licenseNumber,
      businessAddress
    } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
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

    res.json({ user });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      error: 'Failed to update user profile'
    });
  }
});

export default router;















