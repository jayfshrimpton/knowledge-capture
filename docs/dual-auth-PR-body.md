# feat: dual auth — Supabase email/password alongside Microsoft Entra

## Summary
Adds a second, parallel sign-in method — **Supabase email/password** — next to the existing **Microsoft Entra** SSO, implementing `docs/dual-auth-scope.md`. Both methods resolve to the same `users`/`organisations` model: `users.id` holds either an Entra OID or a Supabase `sub` (both RFC-4122 UUIDs from disjoint namespaces).

Followed the doc's recommended decisions: D1 asymmetric/JWKS · D2 no plan-gating · D3 separate rows per provider · D4 out of scope · D5 email-confirm required before onboarding.

## Backend
- **`middleware/auth.ts`** — decode token → route on `iss` → verify against Entra **or** Supabase JWKS (asymmetric, no shared secret); default-deny unknown issuers. `requireUser`/`requireAuth` are provider-agnostic and set `provider` + `emailVerified` on `req.auth`.
- **`routes/bootstrap.ts`** — store `auth_provider`; reject onboarding for unverified Supabase emails (`EMAIL_NOT_VERIFIED`).
- **`types.ts`** — `AuthContext` gains `provider` + `emailVerified`.
- **Tests** — Vitest added; 11 middleware unit tests (valid Entra, valid Supabase, unverified email, missing/expired/wrong-issuer/wrong-audience, `NO_ORG`). `npm test` green.

## Frontend
- **`lib/session.ts`** (new) — single source of truth for the active provider (most-recently-used tiebreak) + `getAccessToken`/`authHeader`, shared with the non-React API client.
- **`AuthProvider`** — tracks both MSAL accounts and the Supabase session, subscribes to `onAuthStateChange`, branches sign-out, exposes `isAuthenticated`.
- **`Login`** — email/password sign-up + sign-in + forgot-password; Microsoft button below a divider.
- **`ResetPassword`** page + `/auth/reset` route; `supabase.ts` session persistence (`detectSessionInUrl`).

## Database
- **`008_dual_auth.sql`** — adds `users.auth_provider` (default `'entra'`, checked). **Not yet applied** to the remote project (blocked by the deploy-permission classifier).

## ⚠️ Required follow-up before this works end-to-end
1. **Remote DB is behind.** Migrations **006_billing** and **007_entra_auth** are not applied to the live project (it's at `add_document_versions`). Until **007** runs, the `users.id → auth.users.id` FK survives and **Entra user creation will fail**. Apply 006, 007, then 008.
2. **Supabase dashboard:** enable the Email provider, confirm asymmetric JWT signing keys are active, add `/auth/confirm` + `/auth/reset` to the redirect allow-list, and set email templates.
3. **Scope honesty:** this branch also carries the pre-existing, uncommitted Entra-migration baseline (`007`, `lib/msal.ts`) and billing/Stripe scaffolding (`006`, `billing.ts`, `stripe.ts`, `Billing.tsx`) because they're interleaved with the auth changes in the working tree and couldn't be split without breaking the build.
4. **Pre-existing typecheck warnings** (not from this work): `msal.ts:21` `storeAuthStateInCookie`, two unused vars in `Billing.tsx`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
