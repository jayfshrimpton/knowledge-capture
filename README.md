# Commonplace — MVP

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
└── supabase/   Postgres schema + migrations (database + storage only)
```

- **Authentication:** Microsoft Entra External ID (MSAL) — enterprise M365 sign-in
- **Database + file storage:** Supabase (Postgres + Storage; Supabase Auth is NOT used)
- **AI structuring:** Google Gemini (`gemini-2.5-flash-lite`)
- **File parsing:** `mammoth` (.docx), `pdf-parse` (.pdf), plain read (.txt)
- **Exports:** `docx` (Word), `pdfkit` (PDF)

> Note: PDF export uses `pdfkit` (pure JS, no headless Chromium) rather than the
> puppeteer/@react-pdf options in the original spec — simpler and more reliable
> for an MVP backend.

## Prerequisites

- Node.js 18+
- A Supabase project (for the database and file storage)
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
2. In the SQL editor, run the migrations in order:
   - [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql) — tables, storage bucket
   - [`supabase/migrations/007_entra_auth.sql`](supabase/migrations/007_entra_auth.sql) — drops the `auth.users` FK and Supabase-Auth-based RLS policies (no longer needed)
   - Run the remaining numbered migrations in order for any other features.
3. From **Project Settings → API Keys**, copy the Project URL and the
   **secret** key (`sb_secret_...`). The publishable key is no longer used for
   auth but may still be needed if you use Supabase Storage from the frontend.

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
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API Keys → Project URL (needed for Storage) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → API Keys → publishable key (needed for Storage) |

## 5. First run

1. Open http://localhost:5173 and click **Sign in with Microsoft**.
2. You will be redirected to Microsoft's login page — sign in with your M365
   work or school account and return to the app automatically.
3. You'll be prompted to create your **organisation** (first user becomes admin).
4. On the **Capture** page, paste notes or upload a `.txt`/`.docx`/`.pdf`, add a
   title, and click **Capture**.
5. The structured output appears with a format badge, a **Gaps & warnings** tab,
   and a **Tags** tab. Export to Word or PDF.
6. All captures are saved and listed under **Library**, scoped to your org.

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Health check (no auth) |
| `GET` | `/api/me` | Current user + org (or `onboarded:false`) |
| `POST` | `/api/bootstrap` | Create org + user row for a new signup |
| `POST` | `/api/capture` | Structure notes via Gemini, persist, return the document |
| `POST` | `/api/upload` | Extract text from an uploaded file |
| `GET` | `/api/documents` | List the org's documents |
| `GET` | `/api/documents/:id` | Fetch one document |
| `POST` | `/api/documents/:id/export` | Generate a Word or PDF export |

All `/api/*` routes except `/api/me` and `/api/bootstrap` require an onboarded
user. Every route validates the Microsoft Entra External ID JWT (signed by
Microsoft's JWKS endpoint) in the `Authorization: Bearer` header and scopes
data to the caller's `org_id`.

## Deployment

- **Frontend → Vercel:** set root to `frontend/`, build `npm run build`, output
  `dist`. Add the `VITE_*` env vars. Point `VITE_API_URL` at the deployed backend.
- **Backend → Render / Railway:** root `backend/`, build `npm install && npm run
  build`, start `npm start`. Add all backend env vars and set `CORS_ORIGINS` to
  the deployed frontend origin.

## Roadmap

See [`FUTURE_IMPROVEMENTS.md`](FUTURE_IMPROVEMENTS.md) for the post-MVP roadmap
(RAG/semantic search, voice input, M365/SharePoint, versioning, and more).
