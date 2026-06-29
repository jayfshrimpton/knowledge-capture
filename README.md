# Commonplace

Pulls knowledge out of people's heads and structures it. Captures rough notes,
brain dumps, and unstructured text and converts them into structured
documentation (procedures, checklists, reference docs, or system diagrams)
using the Google Gemini API. Integrates with wherever the team already works
(SharePoint, Confluence, Drive).

## Architecture

```
knowledge-capture/
├── frontend/   React + Vite + Tailwind SPA
├── backend/    Node.js + Express + TypeScript API
└── supabase/   Postgres schema + migrations
```

- **Authentication:** Dual-provider — Microsoft Entra External ID (MSAL) for M365
  work/school accounts, **or** Supabase email/password for everyone else. Each user
  signs up through one provider and stays with it; JWTs from both are validated by
  the same backend middleware.
- **Database + file storage:** Supabase (Postgres + Storage)
- **AI structuring:** Google Gemini (`gemini-2.5-flash-lite`)
- **File parsing:** `mammoth` (.docx), `pdf-parse` (.pdf), plain read (.txt)
- **Exports:** `docx` (Word), `pdfkit` (PDF)

> Note: PDF export uses `pdfkit` (pure JS, no headless Chromium) rather than
> puppeteer/@react-pdf — simpler with no headless-browser dependency.

## Prerequisites

- Node.js 18+
- A Supabase project (database, file storage, and email/password auth)
- A Microsoft Entra External ID tenant with an app registration
- A Google Gemini API key (https://aistudio.google.com/apikey)

## 1. Microsoft Entra External ID setup

1. In the [Azure Portal](https://portal.azure.com), go to **Microsoft Entra ID →
   App registrations → New registration**.
2. Set the redirect URI to `http://localhost:5173/auth/callback` (type: SPA).
   Add your production frontend URL as a second redirect URI when you deploy.
3. Under **Authentication**, ensure **"ID tokens"** and **"Access tokens"** are
   checked under Implicit grant (or leave unchecked if using auth code + PKCE,
   which MSAL handles automatically for SPAs).
4. Note the **Application (client) ID** and **Directory (tenant) ID** from the
   Overview page — you will need both for the env vars below.

## 2. Supabase setup

1. Create a project at https://supabase.com.
2. **Enable email auth:** Dashboard → **Authentication → Providers → Email** — ensure
   it is enabled.
3. **Use asymmetric JWT signing:** Dashboard → **Project Settings → Auth → JWT** —
   set the signing algorithm to **RS256** (the backend validates Supabase tokens via
   the JWKS endpoint, which requires asymmetric keys).
4. Run all migrations in order (`001` → `011`) using the SQL editor or Supabase CLI.
   Key ones: `001` (schema + storage), `007` (removes legacy Supabase-Auth-only RLS),
   `008` (adds `auth_provider` column for dual-auth), `009` (pgvector/embeddings for
   RAG search), `010` (RBAC).
5. From **Project Settings → API Keys** copy:
   - **Project URL** — used by both backend and frontend
   - **Secret key** (`sb_secret_...`) — backend only, never ship to browser
   - **Publishable key** — frontend Supabase client (auth + storage)

## 3. Backend

```bash
cd backend
cp .env.example .env      # then fill in the values
npm install
npm run dev               # http://localhost:3001
```

`.env` values:

| Variable | Where to find it |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio |
| `SUPABASE_URL` | Supabase → Project Settings → API Keys → Project URL |
| `SUPABASE_SECRET_KEY` | Supabase → API Keys → secret key (`sb_secret_...`; server only — never ship to the browser) |
| `AZURE_TENANT_ID` | Azure Portal → App registrations → your app → Overview → Directory (tenant) ID |
| `AZURE_CLIENT_ID` | Azure Portal → App registrations → your app → Overview → Application (client) ID |
| `PORT` | defaults to `3001` |
| `CORS_ORIGINS` | comma-separated allowed origins, e.g. `http://localhost:5173` |

Health check: `GET http://localhost:3001/health`.

## 4. Frontend

```bash
cd frontend
cp .env.example .env      # then fill in the values
npm install
npm run dev               # http://localhost:5173
```

`.env` values:

| Variable | Where to find it |
|---|---|
| `VITE_AZURE_TENANT_ID` | Azure Portal → App registrations → your app → Overview → Directory (tenant) ID |
| `VITE_AZURE_CLIENT_ID` | Azure Portal → App registrations → your app → Overview → Application (client) ID |
| `VITE_API_URL` | Backend base URL, e.g. `http://localhost:3001` |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API Keys → Project URL (auth + storage) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → API Keys → publishable key (auth + storage) |

## 5. First run

1. Open http://localhost:5173 and choose your sign-in method:
   - **Sign in with Microsoft** — M365 work/school account (Entra).
   - **Sign up / Sign in with email** — email + password (Supabase Auth).
2. On first sign-in you'll be prompted to create your **organisation** (first user
   becomes admin).
3. On the **Capture** page, paste notes, upload a `.txt`/`.docx`/`.pdf`, or use
   **Record** to transcribe audio via Gemini.
4. The structured output appears with a format badge, a **Gaps & warnings** tab,
   and a **Tags** tab. Export to Word or PDF.
5. All captures are saved under **Library**, scoped to your org. Use **Search** for
   semantic/RAG queries or Ask-a-question.
6. **Gap Dashboard** surfaces knowledge gaps across the org. Departments and
   visibility are managed under **Settings** (RBAC).

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Health check (no auth) |
| `GET` | `/api/me` | Current user + org (or `onboarded:false`) |
| `POST` | `/api/bootstrap` | Create org + user row for a new signup |
| `POST` | `/api/capture` | Structure notes via Gemini, persist, return the document |
| `POST` | `/api/upload` | Extract text from an uploaded file |
| `POST` | `/api/transcribe` | Transcribe audio via Gemini |
| `GET` | `/api/documents` | List the org's documents |
| `GET` | `/api/documents/:id` | Fetch one document |
| `POST` | `/api/documents/:id/export` | Generate a Word or PDF export |
| `POST` | `/api/search` | Semantic search (pgvector) |
| `POST` | `/api/ask` | Ask-a-question (RAG) |
| `GET` | `/api/gaps/*` | Gap dashboard (admin only) |

All `/api/*` routes except `/api/me` and `/api/bootstrap` require an onboarded
user. Every route validates the `Authorization: Bearer` token against the issuing
provider's JWKS endpoint — either Microsoft Entra or Supabase — and scopes data
to the caller's `org_id`.

## Deployment

- **Frontend → Vercel:** set root to `frontend/`, build `npm run build`, output
  `dist`. Add the `VITE_*` env vars. Point `VITE_API_URL` at the deployed backend.
- **Backend → Render / Railway:** root `backend/`, build `npm install && npm run
  build`, start `npm start`. Add all backend env vars and set `CORS_ORIGINS` to
  the deployed frontend origin.

## What's built

- Dual-provider auth (Entra + Supabase email/password)
- Document capture with Gemini AI structuring (`gemini-2.5-flash-lite`)
- Voice/audio input (Gemini transcription)
- Semantic search + RAG with Ask-a-question (pgvector)
- Document versioning; Word and PDF export
- RBAC — departments, visibility levels, guest access
- Knowledge gap dashboard
- Billing scaffolding (Stripe)

## Roadmap

See [`FUTURE_IMPROVEMENTS.md`](FUTURE_IMPROVEMENTS.md) for upcoming work
(M365/SharePoint integration, advanced diagram generation, and more).
