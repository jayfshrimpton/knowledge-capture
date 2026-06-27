-- AI Credits System
-- Tracks per-org Gemini API usage against monthly tier limits.

-- Add plan tier and optional credit override to organisations.
alter table organisations add column if not exists plan text not null default 'starter'
  check (plan in ('starter', 'business', 'enterprise'));

-- Manual override for enterprise orgs with custom credit limits (null = use plan default).
alter table organisations add column if not exists ai_credits_override integer;

-- Append-only log of AI credit consumption.
create table if not exists ai_credit_events (
  id          uuid        primary key default gen_random_uuid(),
  org_id      uuid        references organisations(id) not null,
  user_id     uuid        references users(id),
  document_id uuid        references documents(id) on delete set null,
  credits     integer     not null check (credits > 0),
  description text,
  created_at  timestamptz default now()
);

create index if not exists ai_credit_events_org_period_idx
  on ai_credit_events (org_id, created_at desc);

-- RLS: service role handles all writes; users can read their own org's usage.
alter table ai_credit_events enable row level security;

drop policy if exists "org members can read credit events" on ai_credit_events;
create policy "org members can read credit events"
  on ai_credit_events for select
  using (org_id = (select org_id from users where id = auth.uid()));
