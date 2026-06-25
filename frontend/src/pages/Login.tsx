import { useState } from 'react';
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

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setInfo('Account created. Check your email to confirm, then sign in.');
          setMode('login');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
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
        <div style={{ marginBottom: '2rem' }}>
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
            {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
          </p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="st-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              required
              className="st-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="st-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              required
              minLength={6}
              className="st-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p style={{ fontSize: '0.875rem', color: 'var(--status-warning)', fontWeight: 500 }}>
              {error}
            </p>
          )}
          {info && (
            <p style={{ fontSize: '0.875rem', color: 'var(--status-success)', fontWeight: 500 }}>
              {info}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={busy}
            style={{ width: '100%', marginTop: '0.25rem' }}
          >
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        {/* Toggle mode */}
        <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError(null);
              setInfo(null);
            }}
            style={{
              fontSize: '0.875rem',
              color: 'var(--accent)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {mode === 'login'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
