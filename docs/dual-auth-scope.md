# Scope: Add Supabase email/password auth alongside Microsoft Entra

**Status:** Proposed — for a future implementation session.
**Author context:** Written 2026-06-28. The app currently authenticates *exclusively* via Microsoft Entra (MSAL). This document scopes re-introducing Supabase Auth as a second, parallel option.

---

## 1. Goal

Support **two parallel sign-in methods**:

- **Microsoft Entra (Azure AD)** — work/school SSO, intended for enterprise customers. *(Already built — do not break it.)*
- **Supabase email/password** — regular email sign-up, intended for individuals / smaller teams.

A user authenticates with one method; the app must accept either and resolve them to the same `users`/`organisations` model. Both methods should work on every plan; **plan-based restriction is optional policy, not a hard requirement** (see Decision D4).

---

## 2. Current state (what exists today)

| Layer | Current behavior | File |
|---|---|---|
| Frontend login | Single "Sign in with Microsoft" button, MSAL `loginRedirect` | `frontend/src/pages/Login.tsx` |
| Frontend bootstrap | Whole app wrapped in `MsalProvider`; `handleRedirectPromise` on load | `frontend/src/main.tsx` |
| Frontend auth state | `AuthProvider` reads MSAL accounts, exposes `getAccessToken()` (MSAL silent token) | `frontend/src/components/AuthProvider.tsx` |
| Frontend API client | `authHeader()` attaches MSAL access token as `Bearer` | `frontend/src/lib/api.ts` |
| Backend auth | `requireUser` / `requireAuth` validate **Entra JWT only** (JWKS from login.microsoftonline.com, `audience = AZURE_CLIENT_ID`, `issuer = .../v2.0`) | `backend/src/middleware/auth.ts` |
| Backend identity | `req.auth.userId = payload.oid` (Entra Object ID, a UUID) | `backend/src/middleware/auth.ts` |
| Onboarding | `POST /api/bootstrap` creates org + user row (role `admin`); `GET /api/me` returns profile/onboarded state | `backend/src/routes/bootstrap.ts` |
| DB — users | `users.id uuid PK` = Entra OID. FK to `auth.users` **dropped** in migration 007. RLS **disabled** on `users`/`organisations`/`documents` | `supabase/migrations/007_entra_auth.sql` |
| DB — orgs | `plan` ∈ `{starter, business, enterprise}` (default `starter`); billing columns (`seats`, `billing_status`, etc.) | `004_ai_credits.sql`, `006_billing.sql` |
| Supabase client | Frontend & backend both have a Supabase client used for **DB/storage only** — no auth calls today | `frontend/src/lib/supabase.ts`, `backend/src/lib/supabase.ts` |

**Key compatibility fact:** both Entra OIDs and Supabase Auth user IDs are RFC-4122 UUIDs from different namespaces, so a single `users.id uuid` PK can hold either with no realistic collision risk. This is what makes a unified user table feasible.

---

## 3. Target design

### 3.1 Identity model
- Keep `users.id uuid` as the PK, holding **either** an Entra OID **or** a Supabase Auth `sub`.
- Add `users.auth_provider text` (`'entra' | 'supabase'`) so we know how each user signs in.
- Decide email-uniqueness policy across providers (Decision D3).

### 3.2 Backend — accept either token (the core change)
`backend/src/middleware/auth.ts` must validate both token types. Recommended approach:

1. Extract the bearer token (unchanged).
2. **Decode without verifying** to read the `iss` claim and route:
   - `iss === https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0` → existing Entra verification.
   - `iss === ${SUPABASE_URL}/auth/v1` → new Supabase verification.
   - else → 401.
3. **Supabase verification:** validate signature + `exp` + `iss`. Supabase access tokens carry `sub` (= Supabase user id), `email`, `aud: "authenticated"`.
   - **Recommended: asymmetric (JWKS)** — verify against `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` using the existing `jwks-rsa` dependency (same pattern as Entra). Requires the project to use Supabase's asymmetric JWT signing keys (new default; enable in dashboard if on legacy). **No new secret in env.**
   - *Alternative (legacy):* HS256 verification with the project's JWT secret → requires a new `SUPABASE_JWT_SECRET` env var. Avoid if possible.
4. Set `req.auth = { userId: sub, orgId, email, provider: 'supabase' }`.
5. `requireAuth` org-lookup logic is **provider-agnostic** and needs no change beyond consuming the unified `req.auth`.

### 3.3 Frontend — dual login + unified session
- **Login UI** (`Login.tsx`): keep the Microsoft button; add an email/password form (sign up + sign in, with "forgot password"). Use `supabase.auth.signUp` / `signInWithPassword`. Remove/adjust the "Personal Microsoft accounts not supported" copy so it only applies to the Microsoft option.
- **Auth abstraction** (`AuthProvider.tsx`): generalize beyond MSAL. On load, check **both** `msalInstance.getAllAccounts()` and `supabase.auth.getSession()`; track the active provider in state; subscribe to `supabase.auth.onAuthStateChange`.
- **`getAccessToken()`**: return the MSAL access token *or* the Supabase session `access_token` depending on the active provider.
- **`api.ts` `authHeader()`**: same branching — attach whichever provider's token is active.
- **`signOut()`**: branch to `msalInstance.logoutRedirect()` or `supabase.auth.signOut()`.
- **Routing/callbacks**: Supabase email-confirmation and password-reset links redirect back to the app — add routes/handlers (e.g. `/auth/confirm`, `/auth/reset`) and configure redirect URLs in the Supabase dashboard. MSAL `/auth/callback` is unchanged.
- **Session storage caveat:** MSAL uses `sessionStorage`, Supabase uses `localStorage` by default — fine, but the "which provider is active" resolver must handle both being present (prefer the most recently used; define a tiebreak).

### 3.4 Onboarding
- `POST /api/bootstrap` already keys off `req.auth.userId` and works for either provider. Add `auth_provider` to the inserted user row.
- **Gate bootstrap on verified email** for Supabase users (don't onboard an unconfirmed address) — the Supabase token's `email_verified`/`user_metadata` or a `GET` against the user should be checked.

### 3.5 Database migration (new `008_dual_auth.sql`, sketch)
```sql
alter table users add column if not exists auth_provider text
  not null default 'entra'
  check (auth_provider in ('entra', 'supabase'));

-- Optional, if enforcing one identity per email (Decision D3):
-- create unique index if not exists users_email_unique on users (lower(email));
```
- RLS stays **disabled**; the backend (service-role key + explicit `org_id` scoping) remains the enforcement layer. Note: for Supabase-authed users `auth.uid()` *would* equal `users.id`, so RLS could be selectively re-enabled for them later — out of scope here.

### 3.6 Config / dashboard
- Frontend already has `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` — sufficient for `supabase-js` auth.
- Backend already has `SUPABASE_URL` (derive JWKS URL from it). Only add `SUPABASE_JWT_SECRET` if going the HS256 route.
- In Supabase dashboard: enable the **Email** auth provider, set Site URL + redirect allow-list, configure confirmation/reset email templates, and confirm asymmetric JWT signing keys are active.

---

## 4. Decisions needed before implementation

| # | Decision | Recommendation |
|---|---|---|
| D1 | Supabase token verification scheme | **Asymmetric/JWKS** (reuse `jwks-rsa`, no new secret) |
| D2 | Restrict auth method by plan? | **No hard block initially** — offer both everywhere, record `auth_provider`. Add enforcement later if needed |
| D3 | Same email via both providers → one account or two? | **Two separate rows initially** (different ids); revisit account-linking later. Add email unique index only if you want to forbid it |
| D4 | Should enterprise orgs be *forced* onto Entra? | Out of scope for v1; can layer on as an org-level policy flag |
| D5 | Email confirmation required before onboarding? | **Yes** — block `bootstrap` for unverified Supabase emails |

---

## 5. Change checklist (by file)

**Backend**
- [ ] `backend/src/middleware/auth.ts` — issuer-based routing; add `verifySupabaseToken` (JWKS); add `provider` to `req.auth`; update `AuthContext` type (`backend/src/types`)
- [ ] `backend/src/routes/bootstrap.ts` — store `auth_provider`; gate on verified email for Supabase
- [ ] `backend/.env.example` (+ local `.env`) — document Supabase JWKS usage (and `SUPABASE_JWT_SECRET` only if HS256)

**Frontend**
- [ ] `frontend/src/pages/Login.tsx` — add email/password sign-up + sign-in + forgot-password UI
- [ ] `frontend/src/components/AuthProvider.tsx` — provider-agnostic session/token/sign-out
- [ ] `frontend/src/lib/api.ts` — `authHeader()` branches by active provider
- [ ] `frontend/src/main.tsx` — keep `MsalProvider`; ensure Supabase session is restored on load
- [ ] New routes/handlers for Supabase email confirm + password reset
- [ ] `frontend/src/lib/supabase.ts` — (already exists) confirm auth persistence config

**Database**
- [ ] `supabase/migrations/008_dual_auth.sql` — add `auth_provider` (+ optional email unique index)

**Dashboard / config**
- [ ] Enable Supabase Email provider, redirect URLs, email templates, asymmetric JWT keys

**Tests**
- [ ] Middleware unit tests: accepts valid Entra token, accepts valid Supabase token, rejects bad/expired/wrong-issuer
- [ ] E2E: email sign-up → confirm → bootstrap → use app; Microsoft path regression-tested unchanged

---

## 6. Risks / gotchas
- **Don't regress Entra.** All Entra paths must keep passing; the issuer router must default-deny.
- **Token confusion:** an Entra access token already requires the `api://<clientId>/access_as_user` scope to have `aud = client id` (see `frontend/src/lib/msal.ts`). Supabase tokens use `aud = authenticated`. Keep the two verification paths fully separate.
- **Unverified emails** must not be able to create orgs.
- **RLS is off** — every backend query must continue to scope by `org_id` explicitly (already the convention). No direct frontend Supabase data reads for email users without re-introducing Entra-aware RLS.
- **Provider ambiguity on load** when both an MSAL account and a Supabase session exist in the same browser — define a deterministic active-provider resolution.

## 7. Rough effort
Backend middleware + migration: ~0.5 day. Frontend dual-login UI + unified AuthProvider/api + reset/confirm flows: ~1–1.5 days. Dashboard config + testing: ~0.5 day. **Total ≈ 2.5–3 days.**
