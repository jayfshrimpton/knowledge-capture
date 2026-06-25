import { useState } from 'react';
import CaptureForm from '../components/CaptureForm';
import DocumentOutput from '../components/DocumentOutput';
import { DocumentRow } from '../types';

export default function Capture() {
  const [current, setCurrent] = useState<DocumentRow | null>(null);
  const [sessionDocs, setSessionDocs] = useState<DocumentRow[]>([]);

  function handleCreated(doc: DocumentRow) {
    setCurrent(doc);
    setSessionDocs((prev) => [doc, ...prev]);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div>
        <h1
          style={{
            fontFamily: '"Raleway", sans-serif',
            fontWeight: 500,
            fontSize: '1.75rem',
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          Capture knowledge
        </h1>
        <p style={{ marginTop: '0.375rem', fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
          Paste rough notes, an email, or upload a file. The AI structures it into a usable document.
        </p>
      </div>

      <CaptureForm onCreated={handleCreated} />

      {current && <DocumentOutput doc={current} />}

      {sessionDocs.length > 1 && (
        <div>
          <p
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              marginBottom: '0.625rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Captured this session
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {sessionDocs.map((d) => {
              const active = current?.id === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setCurrent(d)}
                  style={{
                    padding: '0.3125rem 0.875rem',
                    borderRadius: '9999px',
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
                    background: active ? 'var(--accent-subtle)' : 'var(--surface-card)',
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    fontSize: '0.8125rem',
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                    transition: `background var(--duration-fast) var(--ease-standard),
                                 border-color var(--duration-fast) var(--ease-standard),
                                 color var(--duration-fast) var(--ease-standard)`,
                  }}
                >
                  {d.title}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
