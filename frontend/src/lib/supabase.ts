import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!url || !publishableKey) {
  // Surface a clear error during development rather than a cryptic runtime failure.
  console.error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Check frontend/.env'
  );
}

// persistSession + autoRefreshToken keep the email/password session alive in
// localStorage. detectSessionInUrl lets supabase-js consume the tokens in
// email-confirmation and password-reset links when the user lands back here.
export const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
