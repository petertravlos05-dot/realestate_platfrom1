import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/subscription-plans - Get all active subscription plans
router.get('/', async (req: Request, res: Response) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        price: 'asc'
      }
    });

    res.json(plans);
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({
      error: 'Failed to fetch subscription plans'
    });
  }
});

// POST /api/subscription-plans - Create subscription plan (admin only)
router.post('/', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      description,
      price,
      priceQuarterly,
      maxProperties,
      benefits,
      stripePriceId,
      stripePriceIdQuarterly
    } = req.body;

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        description,
        price,
        priceQuarterly,
        maxProperties,
        benefits,
        stripePriceId,
        stripePriceIdQuarterly
      }
    });

    res.status(201).json(plan);
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    res.status(500).json({
      error: 'Failed to create subscription plan'
    });
  }
});

export default router;





