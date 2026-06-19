import { useRef, useState } from 'react';
import { capture, uploadFile } from '../lib/api';
import { DocumentRow } from '../types';
import { useAuth } from './AuthProvider';

const MIN_WORDS = 20;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function CaptureForm({ onCreated }: { onCreated: (doc: DocumentRow) => void }) {
  const { me } = useAuth();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState(me?.user?.name ?? '');
  const [text, setText] = useState('');
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
      // Reset the input for the next capture.
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
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Site B generator startup"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Author</label>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Your name"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700">Notes</label>
          <span className={`text-xs ${tooShort ? 'text-amber-600' : 'text-slate-400'}`}>
            {words} word{words === 1 ? '' : 's'}
            {tooShort ? ` — need ${MIN_WORDS}` : ''}
          </span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          placeholder="Paste an email, type rough notes, or describe how something works…"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {uploading ? 'Extracting…' : 'Upload file (.txt, .docx, .pdf)'}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".txt,.docx,.pdf"
          onChange={onFile}
          className="hidden"
        />
        {uploadName && <span className="text-xs text-slate-500">Added: {uploadName}</span>}

        <div className="ml-auto flex items-center gap-3">
          {error && <span className="text-sm text-red-600">{error}</span>}
          <button
            type="submit"
            disabled={busy || uploading}
            className="rounded-md bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? 'Structuring…' : 'Capture'}
          </button>
        </div>
      </div>
    </form>
  );
}
