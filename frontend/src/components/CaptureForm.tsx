import { useRef, useState } from 'react';
import { capture, uploadFile } from '../lib/api';
import { DocumentRow } from '../types';
import { useAuth } from './AuthProvider';

const MIN_WORDS = 20;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function CaptureForm({
  onCreated,
  defaultTitle,
  defaultNotes,
}: {
  onCreated: (doc: DocumentRow) => void;
  defaultTitle?: string;
  defaultNotes?: string;
}) {
  const { me } = useAuth();
  const [title, setTitle] = useState(defaultTitle ?? '');
  const [author, setAuthor] = useState(me?.user?.name ?? '');
  const [text, setText] = useState(defaultNotes ?? '');
  const [sourceFilePath, setSourceFilePath] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const words = countWords(text);
  const tooShort = words > 0 && words < MIN_WORDS;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { rawText, filePath } = await uploadFile(file);
      setText((prev) => (prev ? `${prev}\n\n${rawText}` : rawText));
      setSourceFilePath(filePath);
      setUploadName(file.name);
      if (!title) setTitle(file.name.replace(/\.(txt|docx|pdf)$/i, ''));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('Please enter a title.');
      return;
    }
    if (words < MIN_WORDS) {
      setError(`Please provide at least ${MIN_WORDS} words (currently ${words}).`);
      return;
    }
    setBusy(true);
    try {
      const doc = await capture({
        title: title.trim(),
        author: author.trim() || undefined,
        rawText: text,
        sourceFilePath,
      });
      onCreated(doc);
      setTitle('');
      setText('');
      setSourceFilePath(null);
      setUploadName(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Capture failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="st-card" style={{ padding: '1.5rem' }}>
      {/* Title + Author row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <label className="st-label" htmlFor="cap-title">Title</label>
          <input
            id="cap-title"
            className="st-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Site B generator startup"
          />
        </div>
        <div>
          <label className="st-label" htmlFor="cap-author">Author</label>
          <input
            id="cap-author"
            className="st-input"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Your name"
          />
        </div>
      </div>

      {/* Notes textarea */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.375rem',
          }}
        >
          <label className="st-label" htmlFor="cap-notes" style={{ marginBottom: 0 }}>
            Notes
          </label>
          <span
            style={{
              fontSize: '0.75rem',
              color: tooShort ? 'var(--status-warning)' : 'var(--text-muted)',
              fontWeight: tooShort ? 600 : 400,
            }}
          >
            {words} word{words === 1 ? '' : 's'}
            {tooShort ? ` — need ${MIN_WORDS}` : ''}
          </span>
        </div>
        <textarea
          id="cap-notes"
          className="st-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          placeholder="Paste an email, type rough notes, or describe how something works…"
        />
      </div>

      {/* Footer — upload + submit */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <button
          type="button"
          className="btn-secondary"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          style={{ height: '2.25rem', fontSize: '0.8125rem' }}
        >
          {uploading ? 'Extracting…' : 'Upload file'}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".txt,.docx,.pdf"
          onChange={onFile}
          style={{ display: 'none' }}
        />

        {uploadName && (
          <span
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--status-success)',
                flexShrink: 0,
              }}
            />
            {uploadName}
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {error && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--status-warning)', fontWeight: 500 }}>
              {error}
            </span>
          )}
          <button type="submit" className="btn-primary" disabled={busy || uploading}>
            {busy ? 'Structuring…' : 'Capture'}
          </button>
        </div>
      </div>
    </form>
  );
}
