# Commonplace — Developer Reference

Internal reference for developers working on the Commonplace codebase.
This is a private commercial SaaS product — the repo is not intended for
self-hosting or public deployment.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind |
| Backend | Node.js + Express + TypeScript |
| Database | Supabase (Postgres + Storage + Auth) |
| Auth | Microsoft Entra External ID (MSAL) **or** Supabase email/password |
| AI | Google Gemini (`gemini-2.5-flash-lite`) |
| Search | pgvector (Supabase extension) |
| Billing | Stripe (scaffolded) |
| Frontend hosting | Vercel |
| Backend hosting | Render / Railway |

## Codebase map

```
commonplace/
├── frontend/
│   ├── src/
│   │   ├── pages/          Route-level views (Login, Capture, Library, Dashboard, …)
│   │   ├── components/     Shared UI + AuthProvider (auth context)
│   │   ├── lib/            api.ts, session.ts, msal.ts, supabase.ts
│   │   └── hooks/          Custom React hooks
│   └── .env.example
├── backend/
│   ├── src/
│   │   ├── middleware/     auth.ts — JWT validation for both providers
│   │   ├── routes/         One file per resource (capture, documents, search, …)
│   │   └── lib/            Gemini client, Supabase admin client, embeddings helper
│   └── .env.example
└── supabase/
    └── migrations/         001 → 011 — run in order on any new environment
```

## Auth architecture

Two identity providers operate in parallel. A user signs up through one and
stays with it — there is no account linking between providers.

| Provider | Audience | Token issuer |
|----------|----------|-------------|
| Microsoft Entra External ID | M365 work/school accounts | `login.microsoftonline.com/<tenant-id>` |
| Supabase Auth (email/password) | Everyone else | `<supabase-url>/auth/v1` |

**Backend** (`backend/src/middleware/auth.ts`): the middleware reads the `iss`
claim from the incoming JWT (unverified), routes to the correct JWKS endpoint,
verifies the signature (RS256 / ES256 — asymmetric only, no shared secrets),
then fetches the user's `org_id` from the database. The three middleware exports:

- `requireUser` — validates token, does not require org membership (bootstrap + `/api/me`)
- `requireAuth` — validates token + requires an onboarded org; enforces guest-access expiry
- `requireRole('admin')` — layered on top of `requireAuth` for admin-only routes

**Frontend** (`frontend/src/lib/session.ts`): `resolveActiveProvider()` reads the
last-used provider from localStorage and `getAccessToken()` acquires a token from
it (MSAL silent acquisition for Entra, Supabase session auto-refresh for
email/password). All API calls go through `frontend/src/lib/api.ts` which attaches
the token via `authHeader()`.

## Data model

RLS is disabled. The backend enforces `org_id` scoping on every query using
the Supabase service-role key.

| Table | Purpose |
|-------|---------|
| `orgs` | One row per organisation |
| `users` | One row per user; `auth_provider` column records `'entra'` or `'supabase'` |
| `documents` | Captured notes + structured output; versioned |
| `document_embeddings` | pgvector embeddings for semantic search (migration 009) |
| `departments` | RBAC departments; documents can be scoped to a department |
| `invites` | Org invite tokens |
| `ai_credits` | Per-org Gemini credit accounting |
| `billing_*` | Stripe billing scaffolding (migration 006) |

Migrations live in `supabase/migrations/` (`001_initial_schema` → `011_search_logs`).
Run all in order. Key ones: `008` enables dual-auth, `009` adds pgvector for search,
`010` adds RBAC.

## Local development

### Prerequisites

- Node.js 18+
- Credentials for the dev Supabase project and Azure app registration
  (copy `.env.example` to `.env` and fill in values — see env var reference below)

### Run

```bash
# Backend
cd backend && npm install && npm run dev    # → http://localhost:3001

# Frontend (separate terminal)
cd frontend && npm install && npm run dev   # → http://localhost:5173
```

### Tests

```bash
cd backend && npm test
```

Integration tests hit a real Supabase instance. Gemini calls and auth
middleware are mocked — do not mock the database.

## Environment variables

### Backend (`backend/.env`)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL — used for DB access and to derive the Supabase JWKS endpoint |
| `SUPABASE_SECRET_KEY` | Service-role key — unrestricted DB access; never expose to the browser |
| `AZURE_TENANT_ID` | Entra tenant ID — constructs the Microsoft JWKS URL and validates the `iss` claim |
| `AZURE_CLIENT_ID` | Entra app client ID — validated as the `aud` claim on Entra JWTs |
| `GEMINI_API_KEY` | Google AI Studio key — used for document structuring and audio transcription |
| `PORT` | Defaults to `3001` |
| `CORS_ORIGINS` | Comma-separated allowed origins, e.g. `http://localhost:5173,https://app.commonplace.so` |

### Frontend (`frontend/.env`)

| Variable | Purpose |
|----------|---------|
| `VITE_AZURE_TENANT_ID` | Entra tenant ID — MSAL uses this to target the correct authority URL |
| `VITE_AZURE_CLIENT_ID` | Entra client ID — included in MSAL token requests |
| `VITE_API_URL` | Backend base URL (`http://localhost:3001` locally, deployed URL in prod) |
| `VITE_SUPABASE_URL` | Supabase project URL — used by supabase-js for email/password auth and storage |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key — safe to expose; scoped to public-facing Supabase operations |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key — for client-side Stripe.js (billing flow) |

## API routes

All routes require `Authorization: Bearer <token>` (Entra or Supabase JWT) except where noted.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/health` | None | Health check |
| `GET` | `/api/me` | `requireUser` | Current user + org (returns `onboarded:false` if new) |
| `POST` | `/api/bootstrap` | `requireUser` | Create org + user row on first sign-in |
| `POST` | `/api/capture` | `requireAuth` | Structure notes via Gemini, persist document |
| `POST` | `/api/upload` | `requireAuth` | Parse uploaded file (.txt/.docx/.pdf), return text |
| `POST` | `/api/transcribe` | `requireAuth` | Transcribe audio via Gemini |
| `GET` | `/api/documents` | `requireAuth` | List org's documents |
| `GET` | `/api/documents/:id` | `requireAuth` | Fetch one document (with version history) |
| `POST` | `/api/documents/:id/export` | `requireAuth` | Generate Word or PDF export |
| `POST` | `/api/search` | `requireAuth` | Semantic search (pgvector) |
| `POST` | `/api/ask` | `requireAuth` | Ask-a-question (RAG over org documents) |
| `GET` | `/api/gaps/*` | `requireAuth` + admin | Gap dashboard — flagged gaps, search misses, coverage, activity |
| `GET/POST` | `/api/departments` | `requireAuth` | RBAC department management |
| `POST` | `/api/invites` | `requireAuth` | Org invite management |
| `GET/POST` | `/api/billing/*` | `requireAuth` | Stripe billing (checkout, portal) |

## Deployment

### Frontend → Vercel
Root directory: `frontend/`. Build command: `npm run build`. Output: `dist`.
Set all `VITE_*` env vars in the Vercel project settings. `VITE_API_URL` must
point to the deployed backend.

### Backend → Render / Railway
Root: `backend/`. Build: `npm install && npm run build`. Start: `npm start`.
Set all backend env vars. `CORS_ORIGINS` must include the deployed frontend origin.

### Database migrations
Apply via Supabase dashboard SQL editor or `supabase db push`. Always run in
numeric order (`001` → `011`). Migration `008` is required for Supabase Auth;
`009` is required for semantic search.

## What's built

- Dual-provider auth (Entra + Supabase email/password)
- Document capture with Gemini AI structuring
- Voice/audio input (Gemini transcription)
- Semantic search + RAG with Ask-a-question (pgvector)
- Document versioning; Word and PDF export
- RBAC — departments, visibility levels, guest access
- Knowledge gap dashboard
- Billing scaffolding (Stripe)

## Roadmap

See [`FUTURE_IMPROVEMENTS.md`](FUTURE_IMPROVEMENTS.md) for upcoming work
(M365/SharePoint integration, advanced diagram generation, and more).
