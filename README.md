# Knowledge Capture Tool — MVP

Captures rough notes, brain dumps, and unstructured text from engineering and
construction staff, and converts them into structured documentation
(procedures, checklists, reference docs, or system diagrams) using the Google
Gemini API.

## Architecture

```
knowledge-capture/
├── frontend/   React + Vite + Tailwind SPA
├── backend/    Node.js + Express + TypeScript API
└── supabase/   Postgres schema + RLS migration
```

- **Auth, database, file storage:** Supabase
- **AI structuring:** Google Gemini (`gemini-2.5-flash-lite`)
- **File parsing:** `mammoth` (.docx), `pdf-parse` (.pdf), plain read (.txt)
- **Exports:** `docx` (Word), `pdfkit` (PDF)

> Note: PDF export uses `pdfkit` (pure JS, no headless Chromium) rather than the
> puppeteer/@react-pdf options in the original spec — simpler and more reliable
> for an MVP backend.

## Prerequisites

- Node.js 18+
- A Supabase project
- A Google Gemini API key (https://aistudio.google.com/apikey)

## 1. Supabase setup

1. Create a project at https://supabase.com.
2. In the SQL editor, run [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql).
   This creates the `organisations`, `users`, `documents` tables, RLS policies,
   and a private `documents` storage bucket.
3. (Optional, recommended for local dev) In **Authentication → Providers →
   Email**, turn **off** "Confirm email" so signups return a session
   immediately. Otherwise users must confirm via email before signing in.
4. From **Project Settings → API Keys**, copy the Project URL, the
   **publishable** key (`sb_publishable_...`), and the **secret** key
   (`sb_secret_...`). See [Understanding API keys](https://supabase.com/docs/guides/getting-started/api-keys).

## 2. Backend

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
| `PORT` | defaults to `3001` |
| `CORS_ORIGINS` | comma-separated allowed origins, e.g. `http://localhost:5173` |

Health check: `GET http://localhost:3001/health`.

## 3. Frontend

```bash
cd frontend
cp .env.example .env      # then fill in the values
npm install
npm run dev               # http://localhost:5173
```

`.env` values: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_URL`
(the backend base URL, e.g. `http://localhost:3001`).

## 4. First run

1. Open http://localhost:5173, click **Sign up**, create an account.
2. You'll be prompted to create your **organisation** (first user becomes admin).
3. On the **Capture** page, paste notes or upload a `.txt`/`.docx`/`.pdf`, add a
   title, and click **Capture**.
4. The structured output appears with a format badge, a **Gaps & warnings** tab,
   and a **Tags** tab. Export to Word or PDF.
5. All captures are saved and listed under **Library**, scoped to your org.

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
user; every route validates the Supabase JWT in the `Authorization: Bearer`
header and scopes data to the caller's `org_id`.

## Deployment

- **Frontend → Vercel:** set root to `frontend/`, build `npm run build`, output
  `dist`. Add the `VITE_*` env vars. Point `VITE_API_URL` at the deployed backend.
- **Backend → Render / Railway:** root `backend/`, build `npm install && npm run
  build`, start `npm start`. Add all backend env vars and set `CORS_ORIGINS` to
  the deployed frontend origin.

## Roadmap

See [`FUTURE_IMPROVEMENTS.md`](FUTURE_IMPROVEMENTS.md) for the post-MVP roadmap
(RAG/semantic search, voice input, M365/SharePoint, versioning, and more).
