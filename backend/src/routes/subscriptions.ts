import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/subscriptions - Get user's subscription
router.get('/', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          include: {
            plan: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user.subscription);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      error: 'Failed to fetch subscription'
    });
  }
});

// POST /api/subscriptions - Create subscription
router.post('/', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { planId, billingCycle, stripeSubscriptionId, stripeCustomerId } = req.body;

    // Check if user already has an active subscription
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId: userId }
    });

    if (existingSubscription) {
      return res.status(400).json({
        error: 'User already has a subscription'
      });
    }

    const subscription = await prisma.subscription.create({
      data: {
        userId: userId,
        planId,
        billingCycle,
        stripeSubscriptionId,
        stripeCustomerId,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + (billingCycle === 'QUARTERLY' ? 90 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000))
      },
      include: {
        plan: true
      }
    });

    res.status(201).json(subscription);
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      error: 'Failed to create subscription'
    });
  }
});

// PUT /api/subscriptions/admin/update - Update subscription (admin only)
router.put('/admin/update', validateJwtToken, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId, planName, status, amount, interval, currentPeriodStart, currentPeriodEnd } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Έλεγχος αν υπάρχει ο χρήστης
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Έλεγχος αν υπάρχει ήδη συνδρομή
    const existingSubscription = await prisma.subscription.findFirst({
      where: { userId }
    });

    let subscription;

    // Βρίσκουμε ή δημιουργούμε το plan
    let plan = await prisma.subscriptionPlan.findFirst({
      where: { name: planName || 'Free' }
    });

    if (!plan) {
      plan = await prisma.subscriptionPlan.create({
        data: {
          name: planName || 'Free',
          description: `Plan for ${planName || 'Free'}`,
          price: amount || 0,
          priceQuarterly: Math.round((amount || 0) * 2.7), // 10% discount
          maxProperties: planName === 'Free' ? 5 : planName === 'Basic' ? 50 : planName === 'Pro' ? 200 : 1000,
          benefits: planName === 'Free' ? ['Βασικά χαρακτηριστικά'] :
            planName === 'Basic' ? ['Προηγμένα χαρακτηριστικά', 'Email υποστήριξη'] :
              planName === 'Pro' ? ['Όλα τα χαρακτηριστικά', 'Προτεραιότητα υποστήριξη', 'Analytics'] :
                ['Όλα τα χαρακτηριστικά', 'Dedicated support', 'Custom features']
        }
      });
    }

    if (existingSubscription) {
      // Ενημέρωση υπάρχουσας συνδρομής
      subscription = await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          planId: plan.id,
          status: status || existingSubscription.status,
          billingCycle: interval === 'quarter' ? 'QUARTERLY' : 'MONTHLY',
          currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart) : existingSubscription.currentPeriodStart,
          currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : existingSubscription.currentPeriodEnd,
          updatedAt: new Date()
        }
      });
    } else {
      // Δημιουργία νέας συνδρομής
      subscription = await prisma.subscription.create({
        data: {
          userId,
          planId: plan.id,
          status: status || 'ACTIVE',
          billingCycle: interval === 'quarter' ? 'QUARTERLY' : 'MONTHLY',
          currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart) : new Date(),
          currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 μέρες από τώρα
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    res.json({
      message: 'Subscription updated successfully',
      subscription
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;

