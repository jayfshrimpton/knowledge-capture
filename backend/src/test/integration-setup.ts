import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.test from the backend root before any module is imported.
// If the file doesn't exist, the variables must already be in the environment.
config({ path: resolve(__dirname, '../../.env.test') });

// Gemini will be vi.mocked in every integration test, but gemini.ts throws at
// import time when the key is absent. Provide a non-empty sentinel value.
if (!process.env.GEMINI_API_KEY) {
  process.env.GEMINI_API_KEY = 'test-key-integration';
}

// Auth middleware reads these at import time.
if (!process.env.AZURE_TENANT_ID) process.env.AZURE_TENANT_ID = 'test-tenant';
if (!process.env.AZURE_CLIENT_ID) process.env.AZURE_CLIENT_ID = 'test-client';
