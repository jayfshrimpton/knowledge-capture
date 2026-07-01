import { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthProvider';

export default function Developer() {
  const { getAccessToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getAccessToken().then((t) => setToken(t ?? null));
  }, [getAccessToken]);

  function handleCopy() {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
        Developer
      </h1>

      <div
        className="rounded-xl border p-6 mb-4"
        style={{ background: 'var(--surface-card)', borderColor: 'var(--border-default)' }}
      >
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          API Key
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Use this as your <code className="font-mono">COMMONPLACE_API_KEY</code> when connecting
          AI agents via MCP.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            readOnly
            value={token ?? ''}
            placeholder={token === null ? 'Loading…' : ''}
            className="st-input flex-1 font-mono"
            style={{ fontSize: '0.72rem' }}
            onFocus={(e) => e.target.select()}
          />
          <button
            onClick={handleCopy}
            disabled={!token}
            className="btn-primary"
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem', flexShrink: 0 }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <p
          className="text-sm font-medium"
          style={{ color: 'var(--status-warning)' }}
        >
          Keep this secret — it grants full access to your account.
        </p>
      </div>
    </div>
  );
}
