import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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

/**
 * Landing page for Supabase password-reset links. supabase-js consumes the
 * recovery token from the URL (detectSessionInUrl) and establishes a temporary
 * session; here the user sets a new password via updateUser.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Confirm we actually have a recovery/auth session before showing the form.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        setReady(true);
      } else {
        setError('This reset link is invalid or has expired. Please request a new one.');
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    setDone(true);
    // Briefly confirm, then drop the user into the app (now signed in).
    setTimeout(() => navigate('/', { replace: true }), 1500);
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
        <h1
          style={{
            fontFamily: '"Raleway", sans-serif',
            fontWeight: 600,
            fontSize: '1.5rem',
            color: 'var(--text-primary)',
            marginBottom: '1.5rem',
          }}
        >
          Set a new password
        </h1>

        {done ? (
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
            Your password has been updated. Redirecting…
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && (
              <p style={{ fontSize: '0.875rem', color: 'var(--status-warning)', fontWeight: 500 }}>
                {error}
              </p>
            )}

            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={!ready || busy}
              autoComplete="new-password"
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              disabled={!ready || busy}
              autoComplete="new-password"
              style={inputStyle}
            />

            <button type="submit" disabled={!ready || busy} className="btn-primary" style={{ width: '100%' }}>
              {busy ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
