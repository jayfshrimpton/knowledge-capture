import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables. ' +
      'Copy .env.example to .env and fill in the values.'
  );
}

/**
 * Admin client using the secret key. This bypasses row-level security,
 * so every query in this codebase MUST scope by org_id explicitly. RLS policies
 * exist as defence in depth for any direct client access.
 */
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const STORAGE_BUCKET = 'documents';
