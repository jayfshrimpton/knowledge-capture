import { msalInstance, loginRequest } from './msal';
import { supabase } from './supabase';

/**
 * Cross-cutting auth-provider resolution shared by the React AuthProvider and
 * the non-React API client. The app supports two parallel sign-in methods —
 * Microsoft Entra (MSAL, sessionStorage) and Supabase email/password
 * (localStorage) — and a single browser can technically hold both at once.
 * This module is the one place that decides which one is "active" and returns
 * the matching access token.
 */

export type AuthProvider = 'entra' | 'supabase';

const PROVIDER_KEY = 'commonplace.activeAuthProvider';

/** Record the provider the user most recently signed in with (tiebreak hint). */
export function setActiveProvider(provider: AuthProvider): void {
  try {
    localStorage.setItem(PROVIDER_KEY, provider);
  } catch {
    /* storage may be unavailable (private mode) — non-fatal */
  }
}

export function clearActiveProvider(): void {
  try {
    localStorage.removeItem(PROVIDER_KEY);
  } catch {
    /* non-fatal */
  }
}

function storedProvider(): AuthProvider | null {
  try {
    const v = localStorage.getItem(PROVIDER_KEY);
    return v === 'entra' || v === 'supabase' ? v : null;
  } catch {
    return null;
  }
}

/**
 * Resolve which provider's session should be treated as active. Prefers the
 * most-recently-used provider when both an MSAL account and a Supabase session
 * are present; otherwise falls back to whichever one actually exists.
 */
export async function resolveActiveProvider(): Promise<AuthProvider | null> {
  const hasMsal = msalInstance.getAllAccounts().length > 0;
  const { data } = await supabase.auth.getSession();
  const hasSupabase = Boolean(data.session);

  const preferred = storedProvider();
  if (preferred === 'supabase' && hasSupabase) return 'supabase';
  if (preferred === 'entra' && hasMsal) return 'entra';

  if (hasSupabase) return 'supabase';
  if (hasMsal) return 'entra';
  return null;
}

/**
 * Acquire an access token for the active provider. For Entra this tries a
 * silent MSAL acquisition and falls back to a redirect (returning null while
 * the page navigates away). For Supabase it returns the current session token,
 * which supabase-js refreshes automatically.
 */
export async function getAccessToken(): Promise<string | null> {
  const provider = await resolveActiveProvider();

  if (provider === 'supabase') {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  if (provider === 'entra') {
    const accounts = msalInstance.getAllAccounts();
    if (!accounts.length) return null;
    try {
      const result = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });
      return result.accessToken;
    } catch {
      // Silent acquisition failed — kick off a redirect. The page reloads after
      // the flow completes, so there is nothing to return here.
      await msalInstance.acquireTokenRedirect({ ...loginRequest, account: accounts[0] });
      return null;
    }
  }

  return null;
}

/** Authorization header for the active provider, or an empty object if signed out. */
export async function authHeader(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
