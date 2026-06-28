// Vitest global setup — runs before any test module is imported, so modules
// that read env vars at import time see them defined. Values must stay in sync
// with the issuer/audience constants used in auth.test.ts.
process.env.AZURE_TENANT_ID = 'test-tenant';
process.env.AZURE_CLIENT_ID = 'test-client';
process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'test-secret-key';
// gemini.ts throws at import time when GEMINI_API_KEY is absent.
// Unit tests mock @google/generative-ai, so this value is never used.
process.env.GEMINI_API_KEY = 'test-key-unit';
