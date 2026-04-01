import { Router, Request, Response } from 'express';
import express from 'express';
import { prisma } from '../lib/prisma';
import { validateJwtToken, AuthRequest } from '../middleware/auth';
import Stripe from 'stripe';
import { isEventProcessed, markEventProcessed, logWebhookEvent } from '../lib/utils/webhook-security';

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
      cancel_url: `${process.env.NEXTAUTH_URL || process.env.BASE_URL || 'http://localhost:3000'}/seller/auth/register?subscription=cancelled`,
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
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  try {
    if (!stripe) {
      logWebhookEvent(
        {} as Stripe.Event,
        'webhook_received',
        'failure',
        { error: 'Stripe not configured', requestId, ip: clientIp }
      );
      return res.status(500).json({ error: 'Stripe is not configured' });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logWebhookEvent(
        {} as Stripe.Event,
        'webhook_received',
        'failure',
        { error: 'Webhook secret not configured', requestId, ip: clientIp }
      );
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const signature = req.headers['stripe-signature'] as string;
    const body = req.body as Buffer;

    if (!signature) {
      logWebhookEvent(
        {} as Stripe.Event,
        'webhook_received',
        'failure',
        { error: 'Missing stripe-signature header', requestId, ip: clientIp }
      );
      return res.status(400).json({ error: 'Missing signature' });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      logWebhookEvent(
        {} as Stripe.Event,
        'webhook_signature_verification',
        'failure',
        {
          error: err instanceof Error ? err.message : 'Unknown error',
          requestId,
          ip: clientIp,
        }
      );
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Idempotency check: Has this event already been processed?
    const alreadyProcessed = await isEventProcessed(event.id);
    if (alreadyProcessed) {
      logWebhookEvent(
        event,
        'webhook_duplicate',
        'success',
        {
          message: 'Event already processed, skipping',
          requestId,
          ip: clientIp,
        }
      );
      return res.json({ received: true, message: 'Event already processed' });
    }

    // Mark event as processing (RETRYING status)
    await markEventProcessed(event, 'RETRYING');

    logWebhookEvent(
      event,
      'webhook_processing',
      'success',
      {
        eventType: event.type,
        requestId,
        ip: clientIp,
      }
    );

    // Process event
    try {
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
          logWebhookEvent(
            event,
            'webhook_unhandled',
            'success',
            {
              message: `Unhandled event type: ${event.type}`,
              requestId,
              ip: clientIp,
            }
          );
      }

      // Mark event as successfully processed
      await markEventProcessed(event, 'PROCESSED');

      logWebhookEvent(
        event,
        'webhook_processed',
        'success',
        {
          eventType: event.type,
          requestId,
          ip: clientIp,
        }
      );

      res.json({ received: true });
    } catch (handlerError) {
      // Mark event as failed
      const errorMessage = handlerError instanceof Error ? handlerError.message : 'Unknown error';
      await markEventProcessed(event, 'FAILED', errorMessage);

      logWebhookEvent(
        event,
        'webhook_handler_failed',
        'failure',
        {
          error: errorMessage,
          eventType: event.type,
          requestId,
          ip: clientIp,
        }
      );

      // Still return 200 to Stripe (we've logged the error)
      // Stripe will retry if we return 5xx
      res.status(200).json({
        received: true,
        error: 'Handler failed but event logged',
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logWebhookEvent(
      {} as Stripe.Event,
      'webhook_error',
      'failure',
      {
        error: errorMessage,
        requestId,
        ip: clientIp,
      }
    );

    // Return 500 so Stripe retries
    res.status(500).json({
      error: 'Webhook handler failed',
    });
  }
};

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    const { userId, planId, billingCycle } = session.metadata || {};

    if (!userId || !planId || !billingCycle) {
      throw new Error('Missing metadata in checkout session');
    }

    // Check if subscription already exists (idempotency at handler level)
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (existingSubscription) {
      // Subscription already exists, update it instead of creating duplicate
      const subscription = await stripe!.subscriptions.retrieve(session.subscription as string);
      
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          planId,
          billingCycle,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: session.customer as string,
          status: 'ACTIVE',
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        }
      });

      logWebhookEvent(
        {} as Stripe.Event,
        'subscription_updated',
        'success',
        { userId, planId, message: 'Subscription updated (already existed)' }
      );
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

    logWebhookEvent(
      {} as Stripe.Event,
      'subscription_created',
      'success',
      { userId, planId, stripeSubscriptionId: subscription.id }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logWebhookEvent(
      {} as Stripe.Event,
      'checkout_session_completed_failed',
      'failure',
      { error: errorMessage, sessionId: session.id }
    );
    throw error; // Re-throw to be caught by webhook handler
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id }
    });

    if (!dbSubscription) {
      throw new Error(`Subscription not found in database: ${subscription.id}`);
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

    logWebhookEvent(
      {} as Stripe.Event,
      'subscription_updated',
      'success',
      {
        stripeSubscriptionId: subscription.id,
        userId: dbSubscription.userId,
        status: subscription.status,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logWebhookEvent(
      {} as Stripe.Event,
      'subscription_updated_failed',
      'failure',
      {
        error: errorMessage,
        stripeSubscriptionId: subscription.id,
      }
    );
    throw error; // Re-throw to be caught by webhook handler
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id }
    });

    if (!dbSubscription) {
      throw new Error(`Subscription not found in database: ${subscription.id}`);
    }

    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: 'CANCELLED',
      }
    });

    logWebhookEvent(
      {} as Stripe.Event,
      'subscription_deleted',
      'success',
      {
        stripeSubscriptionId: subscription.id,
        userId: dbSubscription.userId,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logWebhookEvent(
      {} as Stripe.Event,
      'subscription_deleted_failed',
      'failure',
      {
        error: errorMessage,
        stripeSubscriptionId: subscription.id,
      }
    );
    throw error; // Re-throw to be caught by webhook handler
  }
}

export default router;

