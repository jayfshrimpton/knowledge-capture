import { useEffect, useRef, useState } from 'react';
import { capture, uploadFile, transcribeAudio } from '../lib/api';
import { DocumentRow } from '../types';
import { useAuth } from './AuthProvider';

const MIN_WORDS = 20;

const TRANSCR_MSGS = ['Uploading audio...', 'Transcribing with Gemini...', 'Almost done...'];
const STRUCT_MSGS = ['Analysing your input...', 'Identifying key concepts...', 'Structuring content...', 'Finalising document...'];

function Spinner() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
      <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

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
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcrMsgIdx, setTranscrMsgIdx] = useState(0);
  const [transcrSuccess, setTranscrSuccess] = useState(false);
  const [structMsgIdx, setStructMsgIdx] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const audioFileInput = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const words = countWords(text);
  const tooShort = words > 0 && words < MIN_WORDS;

  useEffect(() => {
    if (!transcribing) return;
    setTranscrMsgIdx(0);
    const id = setInterval(() => setTranscrMsgIdx((i) => Math.min(i + 1, TRANSCR_MSGS.length - 1)), 2000);
    return () => clearInterval(id);
  }, [transcribing]);

  useEffect(() => {
    if (!busy) return;
    setStructMsgIdx(0);
    const id = setInterval(() => setStructMsgIdx((i) => Math.min(i + 1, STRUCT_MSGS.length - 1)), 2000);
    return () => clearInterval(id);
  }, [busy]);

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

  async function handleAudioFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTranscribing(true);
    setError(null);
    try {
      const { transcript } = await transcribeAudio(file, file.name);
      setText((prev) => (prev ? `${prev}\n\n${transcript}` : transcript));
      setTranscrSuccess(true);
      setTimeout(() => setTranscrSuccess(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed');
    } finally {
      setTranscribing(false);
      if (audioFileInput.current) audioFileInput.current.value = '';
    }
  }

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecording(false);
        setTranscribing(true);
        try {
          const { transcript } = await transcribeAudio(blob);
          setText((prev) => (prev ? `${prev}\n\n${transcript}` : transcript));
          setTranscrSuccess(true);
          setTimeout(() => setTranscrSuccess(false), 1500);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Transcription failed');
        } finally {
          setTranscribing(false);
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      setError('Microphone access denied');
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
          onClick={toggleRecording}
          disabled={transcribing || uploading}
          style={{ height: '2.25rem', fontSize: '0.8125rem', color: recording ? 'var(--status-warning)' : undefined }}
        >
          {recording ? 'Stop recording' : 'Record audio'}
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => audioFileInput.current?.click()}
          disabled={transcribing || uploading || recording}
          style={{ height: '2.25rem', fontSize: '0.8125rem' }}
        >
          {transcribing ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Spinner />{TRANSCR_MSGS[transcrMsgIdx]}
            </span>
          ) : 'Upload audio'}
        </button>
        <input
          ref={audioFileInput}
          type="file"
          accept=".mp3,.mp4,.wav,.webm,.ogg,.m4a,.aac,.flac"
          onChange={handleAudioFile}
          style={{ display: 'none' }}
        />

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

        {transcrSuccess && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--status-success)', fontWeight: 500 }}>
            ✓ Transcript added
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {error && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--status-warning)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {error}
              <button
                type="button"
                onClick={() => setError(null)}
                style={{ fontSize: '0.8125rem', color: 'var(--accent)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Try again
              </button>
            </span>
          )}
          <button type="submit" className="btn-primary" disabled={busy || uploading}>
            {busy ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Spinner />{STRUCT_MSGS[structMsgIdx]}
              </span>
            ) : 'Capture'}
          </button>
        </div>
      </div>
    </form>
  );
}
