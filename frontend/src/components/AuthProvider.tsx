import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { AccountInfo } from '@azure/msal-browser';
import { useMsal } from '@azure/msal-react';
import type { Session } from '@supabase/supabase-js';
import { msalInstance } from '../lib/msal';
import { supabase } from '../lib/supabase';
import {
  getAccessToken,
  resolveActiveProvider,
  clearActiveProvider,
  setActiveProvider,
  AuthProvider as ActiveProvider,
} from '../lib/session';
import { getMe, MeResponse } from '../lib/api';

interface AuthState {
  /** The active MSAL AccountInfo, or null if not signed in via Entra. */
  account: AccountInfo | null;
  /** The active Supabase session, or null if not signed in via Supabase. */
  supabaseSession: Session | null;
  /** True when signed in through either provider. */
  isAuthenticated: boolean;
  me: MeResponse | null;
  loading: boolean;
  refreshMe: () => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Acquire an access token for the active provider. Entra uses a silent MSAL
   * call (falling back to a redirect); Supabase returns the current session
   * token. See lib/session.ts.
   */
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { accounts, inProgress } = useMsal();

  const account = accounts[0] ?? null;
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  // Until both MSAL has finished its redirect pass AND the initial Supabase
  // session has been read, we don't know whether the user is signed in.
  const [supabaseReady, setSupabaseReady] = useState(false);

  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the Supabase session on load and keep it in sync. onAuthStateChange
  // also fires for sign-in, token refresh, email confirmation and password
  // recovery links (detectSessionInUrl).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSupabaseSession(data.session);
      setSupabaseReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseSession(session);
      if (session) setActiveProvider('supabase');
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const isAuthenticated = Boolean(account) || Boolean(supabaseSession);

  const refreshMe = useCallback(async () => {
    try {
      const result = await getMe();
      setMe(result);
    } catch {
      setMe(null);
    }
  }, []);

  // Loading clears once MSAL's redirect pass is done and Supabase has reported
  // its initial session.
  useEffect(() => {
    if (inProgress === 'none' && supabaseReady) {
      setLoading(false);
    }
  }, [inProgress, supabaseReady]);

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        refreshMe();
      } else {
        setMe(null);
      }
    }
  }, [loading, isAuthenticated, refreshMe]);

  const signOut = useCallback(async () => {
    setMe(null);
    const provider: ActiveProvider | null = await resolveActiveProvider();
    clearActiveProvider();

    if (provider === 'supabase') {
      await supabase.auth.signOut();
    } else {
      // Entra (or unknown — default to the MSAL redirect logout).
      await msalInstance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin,
      });
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        account,
        supabaseSession,
        isAuthenticated,
        me,
        loading,
        refreshMe,
        signOut,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
