-- LOR1-?: Add Supabase email/password auth alongside Microsoft Entra
--
-- The app now accepts tokens from two identity providers:
--   * Microsoft Entra External ID  -> users.id holds the OID claim
--   * Supabase Auth (email/password) -> users.id holds the `sub` claim
--
-- Both ids are RFC-4122 UUIDs from disjoint namespaces, so the existing
-- `users.id uuid` PK holds either with no realistic collision risk. We record
-- which provider each user signs in with so the app (and any future policy) can
-- tell them apart.

-- 1. Track the issuing provider for every user. Existing rows predate Supabase
--    auth, so they default to 'entra'.
alter table users add column if not exists auth_provider text
  not null default 'entra'
  check (auth_provider in ('entra', 'supabase'));

comment on column users.auth_provider is
  'Identity provider that authenticates this user: ''entra'' (Microsoft work/'
  'school SSO) or ''supabase'' (email/password). Set by the backend on first '
  'sign-in (bootstrap).';

-- Decision D3: same email via both providers creates two separate rows
-- (different ids). We do NOT enforce email uniqueness here. To forbid it later,
-- add:
--   create unique index if not exists users_email_unique on users (lower(email));

-- RLS stays disabled (see migration 007). The backend (service-role key +
-- explicit org_id scoping) remains the sole enforcement layer for both
-- providers. For Supabase-authed users auth.uid() would equal users.id, so RLS
-- could be selectively re-enabled for them later — out of scope here.
