import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-06-24.dahlia',
});

export const PRICE_IDS = {
  starter: process.env.STRIPE_STARTER_PRICE_ID ?? '',
  business: process.env.STRIPE_BUSINESS_PRICE_ID ?? '',
} as const;

export type Plan = keyof typeof PRICE_IDS;

/**
 * Returns or creates a Stripe customer for the given org.
 * Stores the customer ID back onto the org row if newly created.
 */
export async function getOrCreateCustomer(
  orgId: string,
  orgName: string | null,
  email: string | null,
  existingCustomerId: string | null,
): Promise<string> {
  if (existingCustomerId) return existingCustomerId;

  const customer = await stripe.customers.create({
    name: orgName ?? undefined,
    email: email ?? undefined,
    metadata: { orgId },
  });

  return customer.id;
}
