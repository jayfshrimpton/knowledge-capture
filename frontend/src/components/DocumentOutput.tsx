import { useState } from 'react';
import { DocumentRow, DocumentFormat } from '../types';
import DiagramView from './DiagramView';
import ExportButtons from './ExportButtons';

const FORMAT_BADGE: Record<DocumentFormat, { bg: string; color: string }> = {
  procedure: { bg: 'var(--color-lochmara-lightest)', color: 'var(--color-lochmara-dark)' },
  checklist: { bg: 'var(--status-success-subtle)',   color: '#549038' },
  reference: { bg: '#f3f0fa',                         color: '#5b3fa6' },
  diagram:   { bg: 'var(--status-warning-subtle)',    color: '#cc552a' },
};

type Tab = 'document' | 'warnings' | 'tags';

export default function DocumentOutput({ doc }: { doc: DocumentRow }) {
  const [tab, setTab] = useState<Tab>('document');
  const warnings = doc.warnings ?? [];
  const tags = doc.tags ?? [];
  const badge = FORMAT_BADGE[doc.format];

  function TabButton({ id, label, count }: { id: Tab; label: string; count?: number }) {
    const active = tab === id;
    return (
      <button
        onClick={() => setTab(id)}
        style={{
          padding: '0.75rem 1rem',
          fontSize: '0.875rem',
          fontWeight: active ? 600 : 400,
          color: active ? 'var(--accent)' : 'var(--text-muted)',
          background: 'none',
          border: 'none',
          borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          transition: `color var(--duration-fast) var(--ease-standard),
                       border-color var(--duration-fast) var(--ease-standard)`,
        }}
      >
        {label}
        {count !== undefined && count > 0 && (
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              background: active ? 'var(--accent-subtle)' : 'var(--color-neutral-lightest)',
              color: active ? 'var(--accent)' : 'var(--text-muted)',
              borderRadius: '9999px',
              padding: '0 0.4375rem',
              lineHeight: '1.4rem',
              minWidth: '1.25rem',
              textAlign: 'center',
            }}
          >
            {count}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="st-card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
            <h2
              style={{
                fontFamily: '"Raleway", sans-serif',
                fontWeight: 500,
                fontSize: '1.25rem',
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              {doc.title}
            </h2>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.125rem 0.5rem',
                borderRadius: 'var(--radius-badge)',
                background: badge.bg,
                color: badge.color,
                textTransform: 'capitalize',
              }}
            >
              {doc.format}
            </span>
          </div>
          {doc.summary && (
            <p style={{ marginTop: '0.375rem', fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
              {doc.summary}
            </p>
          )}
          {doc.author_name && (
            <p style={{ marginTop: '0.25rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              By {doc.author_name}
            </p>
          )}
        </div>
        <ExportButtons documentId={doc.id} title={doc.title} />
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0 0.5rem',
          gap: '0.25rem',
        }}
      >
        <TabButton id="document" label="Document" />
        <TabButton id="warnings" label="Gaps & warnings" count={warnings.length} />
        <TabButton id="tags" label="Tags" count={tags.length} />
      </div>

      {/* Tab content */}
      <div style={{ padding: '1.5rem' }}>
        {tab === 'document' && <DocumentBody doc={doc} />}

        {tab === 'warnings' &&
          (warnings.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {warnings.map((w, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: '0.625rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-card)',
                    border: '1px solid #fde68a',
                    background: 'var(--status-warning-subtle)',
                    fontSize: '0.875rem',
                    color: '#7c4a0c',
                  }}
                >
                  <span style={{ flexShrink: 0 }}>⚠</span>
                  <span>{w}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              No gaps or warnings were flagged.
            </p>
          ))}

        {tab === 'tags' &&
          (tags.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {tags.map((t) => (
                <span
                  key={t}
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-tag)',
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--border-default)',
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  #{t}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              No tags were generated.
            </p>
          ))}
      </div>
    </div>
  );
}

function DocumentBody({ doc }: { doc: DocumentRow }) {
  const sections = doc.content ?? [];

  if (doc.format === 'diagram' && doc.diagram_data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <DiagramView diagram={doc.diagram_data} />
        {doc.diagram_data.description && (
          <div>
            <h3
              style={{
                fontFamily: '"Raleway", sans-serif',
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '0.375rem',
              }}
            >
              System description
            </h3>
            <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
              {doc.diagram_data.description}
            </p>
          </div>
        )}
        {sections.length > 0 && <Sections doc={doc} />}
      </div>
    );
  }

  return <Sections doc={doc} />;
}

function Sections({ doc }: { doc: DocumentRow }) {
  const sections = doc.content ?? [];
  if (sections.length === 0) {
    return <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No content was generated.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {sections.map((section, idx) => (
        <div key={idx}>
          {section.heading && (
            <h3
              style={{
                fontFamily: '"Raleway", sans-serif',
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '0.375rem',
                display: 'flex',
                gap: '0.375rem',
              }}
            >
              {doc.format === 'procedure' && (
                <span style={{ color: 'var(--accent)', flexShrink: 0 }}>{idx + 1}.</span>
              )}
              {section.heading}
            </h3>
          )}

          {(section.content || section.desc) && (
            <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {!section.heading && doc.format === 'procedure' && (
                <span style={{ fontWeight: 600, color: 'var(--accent)', marginRight: '0.375rem' }}>
                  {idx + 1}.
                </span>
              )}
              {section.content ?? section.desc}
            </p>
          )}

          {section.items && section.items.length > 0 && (
            <ul
              style={{
                marginTop: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.375rem',
                paddingLeft: 0,
                listStyle: 'none',
              }}
            >
              {section.items.map((item, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.625rem',
                    fontSize: '0.9375rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  {doc.format === 'checklist' ? (
                    <input
                      type="checkbox"
                      style={{
                        marginTop: '0.25rem',
                        width: '1rem',
                        height: '1rem',
                        flexShrink: 0,
                        accentColor: 'var(--accent)',
                      }}
                      readOnly
                    />
                  ) : (
                    <span
                      style={{
                        marginTop: '0.5625rem',
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: 'var(--text-muted)',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
