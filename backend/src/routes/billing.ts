import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { stripe, PRICE_IDS, getOrCreateCustomer, Plan } from '../services/stripe';
import { logger } from '../lib/logger';

const router = Router();

const FRONTEND_URL = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')[0]
  .trim();

// ---------------------------------------------------------------------------
// POST /api/billing/checkout  (requires auth)
// Body: { plan: 'starter' | 'business', seats?: number }
// Returns: { checkoutUrl }
// ---------------------------------------------------------------------------
router.post('/billing/checkout', requireAuth, async (req: Request, res: Response) => {
  const { orgId, email } = req.auth!;
  const { plan, seats = 3 } = req.body as { plan: Plan; seats?: number };

  if (plan !== 'starter' && plan !== 'business') {
    return res.status(400).json({ error: "plan must be 'starter' or 'business'" });
  }

  if (plan === 'starter' && (typeof seats !== 'number' || seats < 1)) {
    return res.status(400).json({ error: 'seats must be a positive number for the Starter plan' });
  }

  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    logger.error('Stripe price ID not configured', { route: 'POST /api/billing/checkout', errorType: 'ConfigError' });
    return res.status(500).json({ error: 'Billing not configured — contact support' });
  }

  try {
    // Look up the org to get name and existing stripe_customer_id
    const { data: org, error: orgErr } = await supabaseAdmin
      .from('organisations')
      .select('name, stripe_customer_id')
      .eq('id', orgId)
      .single();

    if (orgErr || !org) {
      logger.error('Checkout: org lookup failed', { route: 'POST /api/billing/checkout', errorType: 'SupabaseQueryError' });
      return res.status(500).json({ error: 'Failed to load organisation' });
    }

    const customerId = await getOrCreateCustomer(
      orgId,
      org.name,
      email,
      org.stripe_customer_id,
    );

    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
      price: priceId,
      quantity: plan === 'starter' ? seats : 1,
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [lineItem],
      success_url: `${FRONTEND_URL}/billing?checkout=success`,
      cancel_url: `${FRONTEND_URL}/billing?checkout=cancelled`,
      metadata: { orgId, plan, seats: String(seats) },
      subscription_data: {
        metadata: { orgId, plan, seats: String(seats) },
      },
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    logger.error('Stripe checkout session creation failed', { route: 'POST /api/billing/checkout', errorType: 'StripeError' });
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/billing/portal  (requires auth)
// Returns: { portalUrl }
// ---------------------------------------------------------------------------
router.get('/billing/portal', requireAuth, async (req: Request, res: Response) => {
  const { orgId } = req.auth!;

  try {
    const { data: org, error: orgErr } = await supabaseAdmin
      .from('organisations')
      .select('stripe_customer_id')
      .eq('id', orgId)
      .single();

    if (orgErr || !org) {
      logger.error('Portal: org lookup failed', { route: 'GET /api/billing/portal', errorType: 'SupabaseQueryError' });
      return res.status(500).json({ error: 'Failed to load organisation' });
    }

    if (!org.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found. Please upgrade first.' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${FRONTEND_URL}/billing`,
    });

    res.json({ portalUrl: session.url });
  } catch (err) {
    logger.error('Stripe portal session creation failed', { route: 'GET /api/billing/portal', errorType: 'StripeError' });
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/billing/status  (requires auth)
// Returns: { plan, seats, billing_status, billing_period_end }
// ---------------------------------------------------------------------------
router.get('/billing/status', requireAuth, async (req: Request, res: Response) => {
  const { orgId } = req.auth!;

  const { data: org, error: orgErr } = await supabaseAdmin
    .from('organisations')
    .select('plan, seats, billing_status, billing_period_end')
    .eq('id', orgId)
    .single();

  if (orgErr || !org) {
    logger.error('Billing status: org lookup failed', { route: 'GET /api/billing/status', errorType: 'SupabaseQueryError' });
    return res.status(500).json({ error: 'Failed to load billing status' });
  }

  res.json({
    plan: org.plan ?? 'trial',
    seats: org.seats ?? 3,
    billing_status: org.billing_status ?? 'active',
    billing_period_end: org.billing_period_end ?? null,
  });
});

// ---------------------------------------------------------------------------
// POST /api/billing/webhook  (NO auth -- raw body required)
// Stripe sends events here; we verify the signature and update the org.
// ---------------------------------------------------------------------------
router.post(
  '/billing/webhook',
  // Raw body middleware is applied in index.ts before express.json() for this route.
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error('STRIPE_WEBHOOK_SECRET not set', { route: 'POST /api/billing/webhook', errorType: 'ConfigError' });
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig as string, webhookSecret);
    } catch (err) {
      logger.error('Stripe webhook signature verification failed', { route: 'POST /api/billing/webhook', errorType: 'StripeWebhookError' });
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const orgId = session.metadata?.orgId;
          const plan = session.metadata?.plan;
          const seats = parseInt(session.metadata?.seats ?? '3', 10);
          const customerId = session.customer as string;

          if (!orgId) break;

          // Retrieve the subscription to get period_end.
          // In Stripe API dahlia+, current_period_end lives on the subscription item, not the subscription root.
          let periodEnd: string | null = null;
          if (session.subscription) {
            const sub = await stripe.subscriptions.retrieve(session.subscription as string);
            const itemPeriodEnd = sub.items?.data[0]?.current_period_end;
            if (itemPeriodEnd) periodEnd = new Date(itemPeriodEnd * 1000).toISOString();
          }

          await supabaseAdmin
            .from('organisations')
            .update({
              stripe_customer_id: customerId,
              plan: plan ?? 'starter',
              seats: isNaN(seats) ? 3 : seats,
              billing_status: 'active',
              billing_period_end: periodEnd,
            })
            .eq('id', orgId);

          break;
        }

        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription;
          const orgId = sub.metadata?.orgId;
          if (!orgId) break;

          const plan = sub.metadata?.plan ?? 'starter';
          const seats = parseInt(sub.metadata?.seats ?? '3', 10);
          // In Stripe API dahlia+, current_period_end is on the subscription item.
          const rawEnd = sub.items?.data[0]?.current_period_end;
          const periodEnd = rawEnd ? new Date(rawEnd * 1000).toISOString() : null;

          await supabaseAdmin
            .from('organisations')
            .update({
              plan,
              seats: isNaN(seats) ? 3 : seats,
              billing_status: sub.status === 'past_due' ? 'past_due' : 'active',
              billing_period_end: periodEnd,
            })
            .eq('id', orgId);

          break;
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          const orgId = sub.metadata?.orgId;
          if (!orgId) break;

          await supabaseAdmin
            .from('organisations')
            .update({ billing_status: 'cancelled' })
            .eq('id', orgId);

          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;
          if (!customerId) break;

          // Look up org by stripe_customer_id
          const { data: org } = await supabaseAdmin
            .from('organisations')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();

          if (org) {
            await supabaseAdmin
              .from('organisations')
              .update({ billing_status: 'past_due' })
              .eq('id', org.id);
          }

          break;
        }


        default:
          // Ignore unhandled event types
          break;
      }
    } catch (err) {
      logger.error('Stripe webhook handler error', { route: 'POST /api/billing/webhook', errorType: 'WebhookHandlerError' });
      return res.status(500).json({ error: 'Webhook handler failed' });
    }

    res.json({ received: true });
  },
);

export default router;
