-- Billing columns for Stripe integration (LOR1-5)
-- Note: `plan` column was added in 004_ai_credits.sql — we extend here without re-adding it.

-- Stripe customer ID (one per org, set on first checkout completion)
alter table organisations add column if not exists stripe_customer_id text;

-- Seat count (for Starter per-seat pricing)
alter table organisations add column if not exists seats integer not null default 3;

-- Billing lifecycle status
alter table organisations add column if not exists billing_status text not null default 'active'
  check (billing_status in ('active', 'past_due', 'cancelled', 'trialing'));

-- Current subscription period end (populated by webhook events)
alter table organisations add column if not exists billing_period_end timestamptz;

-- Fast lookup by Stripe customer ID (used in webhook handler)
create index if not exists organisations_stripe_customer_id_idx
  on organisations (stripe_customer_id)
  where stripe_customer_id is not null;
