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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Set up your organisation</h1>
        <p className="mt-1 text-sm text-slate-500">
          Signed in as {me?.email}. Create your organisation to get started.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Organisation name</label>
            <input
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. Kempe Engineering"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Your name (optional)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? 'Setting up…' : 'Create organisation'}
          </button>
        </form>

        <button
          onClick={() => signOut()}
          className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-700"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
