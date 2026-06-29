import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getInviteByToken, acceptInvite } from '../lib/api';
import { useAuth } from '../components/AuthProvider';

type Step = 'loading' | 'invalid' | 'auth' | 'accepting' | 'done' | 'error';

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { supabaseSession, refreshMe } = useAuth();
  const token = params.get('token') ?? '';

  const [step, setStep] = useState<Step>('loading');
  const [inviteInfo, setInviteInfo] = useState<{ email: string; orgName: string | null; expiresAt: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Auth form state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [formEmail, setFormEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Load invite info on mount
  useEffect(() => {
    if (!token) {
      setStep('invalid');
      return;
    }
    getInviteByToken(token)
      .then((info) => {
        if (!info.valid) {
          setStep('invalid');
          return;
        }
        setInviteInfo({ email: info.email, orgName: info.orgName, expiresAt: info.expiresAt });
        setFormEmail(info.email);
        setStep(supabaseSession ? 'accepting' : 'auth');
      })
      .catch(() => setStep('invalid'));
  }, [token, supabaseSession]);

  // When the user becomes authenticated, attempt to accept the invite
  useEffect(() => {
    if (step === 'accepting' && supabaseSession) {
      acceptInvite(token)
        .then(async () => {
          await refreshMe();
          setStep('done');
          setTimeout(() => navigate('/library', { replace: true }), 1500);
        })
        .catch((err) => {
          setErrorMsg(err.message ?? 'Failed to activate guest access');
          setStep('error');
        });
    }
  }, [step, supabaseSession, token, navigate, refreshMe]);

  async function handleAuth() {
    setAuthLoading(true);
    setAuthError('');
    try {
      if (authMode === 'register') {
        const { error } = await supabase.auth.signUp({ email: formEmail, password });
        if (error) throw error;
        // signUp triggers onAuthStateChange which sets supabaseSession → step moves to 'accepting'
        setStep('accepting');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: formEmail, password });
        if (error) throw error;
        setStep('accepting');
      }
    } catch (err: any) {
      setAuthError(err.message ?? 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  }

  const card = (children: React.ReactNode) => (
    <div
      style={{
        maxWidth: '28rem',
        margin: '6rem auto',
        padding: '2rem',
        borderRadius: '1rem',
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontFamily: '"Raleway", sans-serif',
          fontWeight: 600,
          fontSize: '1.25rem',
          color: 'var(--text-primary)',
          marginBottom: '0.5rem',
        }}
      >
        Commonplace
      </p>
      {children}
    </div>
  );

  if (step === 'loading') {
    return card(<p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Verifying invite…</p>);
  }

  if (step === 'invalid') {
    return card(
      <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
        This invite link is invalid or has expired. Please ask your admin for a new invite.
      </p>
    );
  }

  if (step === 'done') {
    return card(
      <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
        Guest access activated! Redirecting to your library…
      </p>
    );
  }

  if (step === 'error') {
    return card(
      <p style={{ color: '#dc2626', marginTop: '1rem' }}>
        {errorMsg || 'Something went wrong. Please try again.'}
      </p>
    );
  }

  if (step === 'accepting') {
    return card(<p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Activating guest access…</p>);
  }

  // step === 'auth'
  return card(
    <div style={{ textAlign: 'left', marginTop: '1rem' }}>
      {inviteInfo && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          You've been invited to join{inviteInfo.orgName ? ` ${inviteInfo.orgName}` : ''} as a guest.
          <br />
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Access expires {new Date(inviteInfo.expiresAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}.
          </span>
        </p>
      )}

      <div className="flex gap-2 mb-4">
        {(['register', 'login'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setAuthMode(mode)}
            style={{
              flex: 1,
              padding: '0.4rem',
              borderRadius: '0.375rem',
              fontSize: '0.8125rem',
              fontWeight: authMode === mode ? 600 : 400,
              border: 'none',
              cursor: 'pointer',
              background: authMode === mode ? 'var(--accent-subtle)' : 'transparent',
              color: authMode === mode ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            {mode === 'register' ? 'Create account' : 'Sign in'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
            Email
          </label>
          <input
            type="email"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            className="st-input w-full"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
            className="st-input w-full"
            placeholder={authMode === 'register' ? 'Choose a password' : 'Your password'}
          />
        </div>

        {authError && <p className="text-sm text-red-600">{authError}</p>}

        <button
          onClick={handleAuth}
          disabled={authLoading || !formEmail || !password}
          className="btn-primary w-full"
          style={{ marginTop: '0.5rem' }}
        >
          {authLoading
            ? 'Please wait…'
            : authMode === 'register'
            ? 'Create account & accept invite'
            : 'Sign in & accept invite'}
        </button>
      </div>
    </div>
  );
}
