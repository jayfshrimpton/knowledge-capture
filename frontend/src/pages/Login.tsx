import { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../lib/msal';
import { supabase } from '../lib/supabase';
import { setActiveProvider } from '../lib/session';

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '24rem',
  background: 'var(--surface-card)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-card)',
  padding: '2.5rem',
  boxShadow: 'var(--shadow-md)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  fontSize: '0.9375rem',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-input, 0.5rem)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
};

/** Microsoft logo SVG (official brand colours). */
function MicrosoftLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 21 21"
      width="20"
      height="20"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

type Mode = 'signin' | 'signup';

export default function Login() {
  const { instance } = useMsal();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Email/password state
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleMicrosoftSignIn() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      setActiveProvider('entra');
      await instance.loginRedirect(loginRequest);
      // Page redirects to Microsoft and returns to /auth/callback — nothing
      // further to do here.
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
        });
        if (signUpErr) throw signUpErr;

        if (data.session) {
          // Email confirmation disabled — already signed in.
          setActiveProvider('supabase');
        } else {
          // Confirmation required: no session until the user clicks the link.
          setNotice('Check your email to confirm your address, then sign in.');
          setMode('signin');
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInErr) throw signInErr;
        setActiveProvider('supabase');
        // onAuthStateChange in AuthProvider takes it from here.
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError('Enter your email above, then click "Forgot password" again.');
      return;
    }
    setBusy(true);
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setBusy(false);
    if (resetErr) {
      setError(resetErr.message);
    } else {
      setNotice('If an account exists for that email, a reset link is on its way.');
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-subtle)',
        padding: '1.5rem',
      }}
    >
      <div style={cardStyle}>
        {/* Logo */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1
            style={{
              fontFamily: '"Raleway", sans-serif',
              fontWeight: 600,
              fontSize: '1.5rem',
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            Structa
          </h1>
          <p style={{ marginTop: '0.375rem', fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
            {mode === 'signup' ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <p style={{ fontSize: '0.875rem', color: 'var(--status-warning)', fontWeight: 500 }}>
              {error}
            </p>
          )}
          {notice && (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {notice}
            </p>
          )}

          {/* Email / password */}
          <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={busy}
              autoComplete="email"
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={busy}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              style={inputStyle}
            />
            <button type="submit" disabled={busy} className="btn-primary" style={{ width: '100%' }}>
              {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signup' ? 'signin' : 'signup');
                setError(null);
                setNotice(null);
              }}
              style={linkButtonStyle}
            >
              {mode === 'signup' ? 'Have an account? Sign in' : 'Create an account'}
            </button>
            {mode === 'signin' && (
              <button type="button" onClick={handleForgotPassword} disabled={busy} style={linkButtonStyle}>
                Forgot password?
              </button>
            )}
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.25rem 0' }}>
            <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>or</span>
            <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          </div>

          {/* Microsoft */}
          <button
            onClick={handleMicrosoftSignIn}
            disabled={busy}
            className="btn-secondary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.625rem',
            }}
          >
            <MicrosoftLogo />
            Sign in with Microsoft
          </button>

          <p
            style={{
              marginTop: '0.25rem',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            Microsoft sign-in requires a 365 work or school account.
            <br />
            Personal Microsoft accounts are not supported.
          </p>
        </div>
      </div>
    </div>
  );
}

const linkButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  color: 'var(--accent)',
  fontWeight: 500,
  fontSize: '0.8125rem',
};
