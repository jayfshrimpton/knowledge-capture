import { useState } from 'react';
import { exportDocument } from '../lib/api';

export default function ExportButtons({ documentId, title }: { documentId: string; title: string }) {
  const [busy, setBusy] = useState<'word' | 'pdf' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(format: 'word' | 'pdf') {
    setBusy(format);
    setError(null);
    try {
      const blob = await exportDocument(documentId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(title || 'document').replace(/[^a-z0-9-_ ]/gi, '').trim() || 'document'}.${
        format === 'word' ? 'docx' : 'pdf'
      }`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => run('word')}
        disabled={busy !== null}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {busy === 'word' ? 'Exporting…' : 'Export Word'}
      </button>
      <button
        onClick={() => run('pdf')}
        disabled={busy !== null}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {busy === 'pdf' ? 'Exporting…' : 'Export PDF'}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
