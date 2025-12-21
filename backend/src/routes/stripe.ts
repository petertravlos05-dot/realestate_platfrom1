import { Router, Request, Response } from 'express';
import express from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, AuthRequest } from '../middleware/auth';
import Stripe from 'stripe';

const router = Router();

// Initialize Stripe only if the secret key is available
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    })
  : null;

// POST /api/stripe/create-checkout-session - Create Stripe checkout session
router.post('/create-checkout-session', validateJwtToken, async (req: AuthRequest, res: Response) => {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return res.status(500).json({
        error: 'Stripe is not configured. Please contact support.'
      });
    }

    const userId = req.userId;
    const userEmail = req.userEmail;

    if (!userId || !userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { planId, billingCycle } = req.body;

    if (!planId || !billingCycle) {
      return res.status(400).json({
        error: 'Plan ID and billing cycle are required'
      });
    }

    // Get the subscription plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      return res.status(404).json({
        error: 'Subscription plan not found'
      });
    }

    // Get the appropriate Stripe price ID
    const stripePriceId = billingCycle === 'QUARTERLY'
      ? plan.stripePriceIdQuarterly
      : plan.stripePriceId;

    if (!stripePriceId) {
      return res.status(400).json({
        error: 'Stripe price ID not configured for this plan'
      });
    }

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXTAUTH_URL || process.env.BASE_URL || 'http://localhost:3004'}/dashboard/seller?subscription=success`,
      cancel_url: `${process.env.NEXTAUTH_URL || process.env.BASE_URL || 'http://localhost:3004'}/seller/auth/register?subscription=cancelled`,
      metadata: {
        userId: userId,
        planId: planId,
        billingCycle: billingCycle,
      },
      customer_email: userEmail,
    });

    res.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      error: 'Failed to create checkout session'
    });
  }
});

// POST /api/stripe/webhook - Stripe webhook handler
// Note: This route must be registered separately in index.ts with express.raw() middleware
// because it needs the raw body for signature verification
export const stripeWebhookHandler = async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe is not configured' });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const signature = req.headers['stripe-signature'] as string;
    const body = req.body as Buffer;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      error: 'Webhook handler failed'
    });
  }
};

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    const { userId, planId, billingCycle } = session.metadata || {};

    if (!userId || !planId || !billingCycle) {
      console.error('Missing metadata in checkout session');
      return;
    }

    // Get the subscription from Stripe
    const subscription = await stripe!.subscriptions.retrieve(session.subscription as string);

    // Create subscription in database
    await prisma.subscription.create({
      data: {
        userId,
        planId,
        billingCycle,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: session.customer as string,
        status: 'ACTIVE',
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      }
    });

    console.log('Subscription created successfully for user:', userId);
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id }
    });

    if (!dbSubscription) {
      console.error('Subscription not found in database:', subscription.id);
      return;
    }

    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: subscription.status === 'active' ? 'ACTIVE' : 'CANCELLED',
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      }
    });

    console.log('Subscription updated successfully:', subscription.id);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id }
    });

    if (!dbSubscription) {
      console.error('Subscription not found in database:', subscription.id);
      return;
    }

    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: 'CANCELLED',
      }
    });

    console.log('Subscription cancelled successfully:', subscription.id);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

export default router;

