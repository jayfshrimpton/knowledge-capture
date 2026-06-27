import { useEffect, useState } from 'react';
import { DocumentRow, DocumentVersionListItem, DocumentVersionDetail } from '../types';
import { listDocumentVersions, getDocumentVersion, restoreDocumentVersion } from '../lib/api';
import { contentToText } from '../lib/contentToText';
import { diffLines } from '../lib/lineDiff';

interface Props {
  doc: DocumentRow;
  onClose: () => void;
  onDocumentUpdated: (updated: DocumentRow) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function VersionHistoryPanel({ doc, onClose, onDocumentUpdated }: Props) {
  const [versions, setVersions] = useState<DocumentVersionListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersionDetail | null>(null);
  const [loadingVersion, setLoadingVersion] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);

  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  useEffect(() => {
    listDocumentVersions(doc.id)
      .then(setVersions)
      .catch((err) => setListError(err instanceof Error ? err.message : 'Failed to load versions'))
      .finally(() => setLoadingList(false));
  }, [doc.id]);

  function selectVersion(versionNumber: number) {
    setSelectedVersionNumber(versionNumber);
    setSelectedVersion(null);
    setVersionError(null);
    setLoadingVersion(true);
    getDocumentVersion(doc.id, versionNumber)
      .then(setSelectedVersion)
      .catch((err) => setVersionError(err instanceof Error ? err.message : 'Failed to load version'))
      .finally(() => setLoadingVersion(false));
  }

  async function handleRestore() {
    if (selectedVersionNumber == null) return;
    setRestoring(true);
    setRestoreError(null);
    try {
      const updated = await restoreDocumentVersion(doc.id, selectedVersionNumber);
      onDocumentUpdated(updated);
      onClose();
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setRestoring(false);
    }
  }

  const currentText = contentToText(doc.content ?? []);

  const diff =
    selectedVersion != null
      ? diffLines(
          selectedVersion.structured_content ?? contentToText(selectedVersion.content ?? []),
          currentText,
        )
      : null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.25)',
          zIndex: 49,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 'min(480px, 90vw)',
          height: '100vh',
          background: 'var(--surface-page)',
          borderLeft: '1px solid var(--border-subtle)',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.12)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: 'var(--text-muted)', flexShrink: 0 }}
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
              Version history
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Version list */}
          <div
            style={{
              width: '180px',
              borderRight: '1px solid var(--border-subtle)',
              overflowY: 'auto',
              flexShrink: 0,
            }}
          >
            {loadingList && (
              <p style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Loading…</p>
            )}
            {listError && (
              <p style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--status-warning)' }}>{listError}</p>
            )}
            {!loadingList && !listError && versions.length === 0 && (
              <p style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                No previous versions.
              </p>
            )}
            {versions.map((v) => {
              const active = v.version_number === selectedVersionNumber;
              return (
                <button
                  key={v.id}
                  onClick={() => selectVersion(v.version_number)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    background: active ? 'var(--accent-subtle)' : 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: active ? 'var(--accent)' : 'var(--text-primary)',
                    }}
                  >
                    v{v.version_number}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                    {formatDate(v.created_at)}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Diff panel */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {!selectedVersionNumber && (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                  textAlign: 'center',
                }}
              >
                Select a version to see what changed.
              </div>
            )}

            {selectedVersionNumber != null && loadingVersion && (
              <p style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Loading…</p>
            )}

            {versionError && (
              <p style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--status-warning)' }}>
                {versionError}
              </p>
            )}

            {diff != null && (
              <>
                {/* Diff legend + restore */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    flexShrink: 0,
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.875rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          borderRadius: '2px',
                          background: '#bbf7d0',
                        }}
                      />
                      Added in current
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          borderRadius: '2px',
                          background: '#fecaca',
                        }}
                      />
                      Only in this version
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem' }}>
                    <button
                      className="btn-secondary"
                      onClick={handleRestore}
                      disabled={restoring}
                      style={{ height: '2rem', fontSize: '0.8125rem', padding: '0 0.875rem', whiteSpace: 'nowrap' }}
                    >
                      {restoring ? 'Restoring…' : 'Restore this version'}
                    </button>
                    {restoreError && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--status-warning)' }}>{restoreError}</span>
                    )}
                  </div>
                </div>

                {/* Diff lines */}
                <div style={{ padding: '0.75rem 0', overflowX: 'auto' }}>
                  {diff.length === 0 ? (
                    <p style={{ padding: '0 1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      No differences — content is identical to the current version.
                    </p>
                  ) : (
                    <div style={{ fontFamily: 'monospace', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                      {diff.map((line, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '0.0625rem 1rem',
                            background:
                              line.type === 'added'
                                ? '#f0fdf4'
                                : line.type === 'removed'
                                ? '#fef2f2'
                                : 'transparent',
                            color:
                              line.type === 'added'
                                ? '#166534'
                                : line.type === 'removed'
                                ? '#991b1b'
                                : 'var(--text-secondary)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          <span style={{ userSelect: 'none', marginRight: '0.5rem', opacity: 0.5 }}>
                            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                          </span>
                          {line.text || ' '}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
