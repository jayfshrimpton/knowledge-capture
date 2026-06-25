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
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <button
        className="btn-secondary"
        onClick={() => run('word')}
        disabled={busy !== null}
        style={{ height: '2rem', fontSize: '0.8125rem', padding: '0 0.875rem' }}
      >
        {busy === 'word' ? 'Exporting…' : 'Export Word'}
      </button>
      <button
        className="btn-secondary"
        onClick={() => run('pdf')}
        disabled={busy !== null}
        style={{ height: '2rem', fontSize: '0.8125rem', padding: '0 0.875rem' }}
      >
        {busy === 'pdf' ? 'Exporting…' : 'Export PDF'}
      </button>
      {error && (
        <span style={{ fontSize: '0.8125rem', color: 'var(--status-warning)' }}>{error}</span>
      )}
    </div>
  );
}
