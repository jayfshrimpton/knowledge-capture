import { useState } from 'react';
import { bootstrap } from '../lib/api';
import { useAuth } from '../components/AuthProvider';

export default function Onboarding() {
  const { me, refreshMe, signOut } = useAuth();
  const [orgName, setOrgName] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await bootstrap(orgName.trim(), name.trim() || undefined);
      await refreshMe();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set up your organisation');
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
      <div
        style={{
          width: '100%',
          maxWidth: '24rem',
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-card)',
          padding: '2.5rem',
          boxShadow: 'var(--shadow-md)',
        }}
      >
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
            Set up your organisation
          </h1>
          <p style={{ marginTop: '0.375rem', fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
            Signed in as {me?.email}. Create your organisation to get started.
          </p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="st-label" htmlFor="org-name">Organisation name</label>
            <input
              id="org-name"
              required
              className="st-input"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. Kempe Engineering"
            />
          </div>
          <div>
            <label className="st-label" htmlFor="user-name">Your name (optional)</label>
            <input
              id="user-name"
              className="st-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
          </div>

          {error && (
            <p style={{ fontSize: '0.875rem', color: 'var(--status-warning)', fontWeight: 500 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={busy}
            style={{ width: '100%', marginTop: '0.25rem' }}
          >
            {busy ? 'Setting up…' : 'Create organisation'}
          </button>
        </form>

        <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
          <button
            onClick={() => signOut()}
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
