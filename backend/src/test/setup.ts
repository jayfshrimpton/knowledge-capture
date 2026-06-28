// Vitest global setup — runs before any test module is imported, so the auth
// middleware (which reads these at import time) sees them defined. Values must
// stay in sync with the issuer/audience constants used in auth.test.ts.
process.env.AZURE_TENANT_ID = 'test-tenant';
process.env.AZURE_CLIENT_ID = 'test-client';
process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'test-secret-key';
