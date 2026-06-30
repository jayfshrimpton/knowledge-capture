import { useState, useEffect } from 'react';
import { DocumentRow, DocumentFormat, OrgMember, ReviewComment } from '../types';
import DiagramView from './DiagramView';
import ExportButtons from './ExportButtons';
import VersionHistoryPanel from './VersionHistoryPanel';
import { useAuth } from './AuthProvider';
import {
  submitForReview, approveDocument, rejectDocument, publishDocument,
  getReviewComments, addReviewComment, listOrgMembers,
} from '../lib/api';

const FORMAT_BADGE: Record<DocumentFormat, { bg: string; color: string }> = {
  procedure: { bg: 'var(--color-lochmara-lightest)', color: 'var(--color-lochmara-dark)' },
  checklist: { bg: 'var(--status-success-subtle)',   color: '#549038' },
  reference: { bg: '#f3f0fa',                         color: '#5b3fa6' },
  diagram:   { bg: 'var(--status-warning-subtle)',    color: '#cc552a' },
};

type Tab = 'document' | 'warnings' | 'tags';

export default function DocumentOutput({
  doc,
  onDocumentUpdated,
}: {
  doc: DocumentRow;
  onDocumentUpdated?: (updated: DocumentRow) => void;
}) {
  const [tab, setTab] = useState<Tab>('document');
  const [showHistory, setShowHistory] = useState(false);
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
    <>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn-secondary"
            onClick={() => setShowHistory(true)}
            style={{ height: '2rem', fontSize: '0.8125rem', padding: '0 0.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            History
          </button>
          <ExportButtons documentId={doc.id} title={doc.title} />
        </div>
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

    <ReviewPanel doc={doc} onDocumentUpdated={onDocumentUpdated} />

    {showHistory && (
      <VersionHistoryPanel
        doc={doc}
        onClose={() => setShowHistory(false)}
        onDocumentUpdated={(updated) => {
          onDocumentUpdated?.(updated);
          setShowHistory(false);
        }}
      />
    )}
    </>
  );
}

function ReviewPanel({ doc, onDocumentUpdated }: { doc: DocumentRow; onDocumentUpdated?: (updated: DocumentRow) => void }) {
  const { me } = useAuth();
  const userId = me?.user?.id;
  const role = me?.user?.role;

  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [selectedReviewerId, setSelectedReviewerId] = useState('');
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (role !== 'guest') {
      listOrgMembers().then(setOrgMembers).catch(() => {});
    }
  }, [role]);

  useEffect(() => {
    if (doc.status === 'in_review' || doc.status === 'approved') {
      getReviewComments(doc.id).then(setComments).catch(() => {});
    } else {
      setComments([]);
    }
  }, [doc.id, doc.status]);

  const isReviewerOrAdmin = userId === doc.reviewer_id || role === 'admin';
  const reviewerName = orgMembers.find(m => m.id === (doc.reviewed_by ?? doc.reviewer_id))?.name
    ?? orgMembers.find(m => m.id === (doc.reviewed_by ?? doc.reviewer_id))?.email
    ?? null;

  async function act(fn: () => Promise<DocumentRow>) {
    setLoading(true);
    setError(null);
    try {
      const updated = await fn();
      onDocumentUpdated?.(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddComment() {
    if (!commentText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const c = await addReviewComment(doc.id, commentText.trim());
      setComments(prev => [...prev, c]);
      setCommentText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add comment');
    } finally {
      setLoading(false);
    }
  }

  const panelStyle = {
    marginTop: '1rem',
    padding: '1.25rem 1.5rem',
    borderRadius: 'var(--radius-card)',
    border: '1px solid var(--border-default)',
    background: 'var(--surface-card)',
  };

  const status = doc.status ?? 'draft';

  if (status === 'draft') {
    if (role === 'guest') return null;
    return (
      <div style={panelStyle}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Review
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <select
            value={selectedReviewerId}
            onChange={e => setSelectedReviewerId(e.target.value)}
            className="st-input"
            style={{ flex: 1 }}
          >
            <option value="">Select reviewer…</option>
            {orgMembers.filter(m => m.id !== userId).map(m => (
              <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
            ))}
          </select>
          <button
            onClick={() => act(() => submitForReview(doc.id, selectedReviewerId))}
            disabled={!selectedReviewerId || loading}
            className="btn-primary"
            style={{ whiteSpace: 'nowrap' }}
          >
            {loading ? 'Submitting…' : 'Submit for Review'}
          </button>
        </div>
        {error && <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--status-error)' }}>{error}</p>}
      </div>
    );
  }

  if (status === 'in_review') {
    return (
      <div style={panelStyle}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          In Review
        </p>
        {isReviewerOrAdmin && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button onClick={() => act(() => approveDocument(doc.id))} disabled={loading} className="btn-primary">
              {loading ? '…' : 'Approve'}
            </button>
            <button onClick={() => act(() => rejectDocument(doc.id))} disabled={loading} className="btn-secondary">
              {loading ? '…' : 'Reject'}
            </button>
          </div>
        )}
        <CommentsThread comments={comments} commentText={commentText} onCommentTextChange={setCommentText} onAddComment={handleAddComment} loading={loading} />
        {error && <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--status-error)' }}>{error}</p>}
      </div>
    );
  }

  if (status === 'approved') {
    return (
      <div style={panelStyle}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Approved
        </p>
        {role === 'admin' && (
          <button onClick={() => act(() => publishDocument(doc.id))} disabled={loading} className="btn-primary" style={{ marginBottom: '1rem' }}>
            {loading ? 'Publishing…' : 'Publish'}
          </button>
        )}
        <CommentsThread comments={comments} commentText={commentText} onCommentTextChange={setCommentText} onAddComment={handleAddComment} loading={loading} />
        {error && <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--status-error)' }}>{error}</p>}
      </div>
    );
  }

  if (status === 'published') {
    const publishedDate = doc.reviewed_at
      ? new Date(doc.reviewed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;
    return (
      <div style={{ ...panelStyle, background: 'var(--status-success-subtle)', borderColor: '#bbf7d0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#16a34a', fontSize: '1.125rem', lineHeight: 1 }}>✓</span>
          <span style={{ fontWeight: 600, color: '#15803d', fontSize: '0.9375rem' }}>Published</span>
          {(reviewerName || publishedDate) && (
            <span style={{ fontSize: '0.8125rem', color: '#166534' }}>
              {reviewerName ? `— reviewed by ${reviewerName}` : ''}
              {publishedDate ? ` on ${publishedDate}` : ''}
            </span>
          )}
        </div>
      </div>
    );
  }

  return null;
}

function CommentsThread({
  comments, commentText, onCommentTextChange, onAddComment, loading,
}: {
  comments: ReviewComment[];
  commentText: string;
  onCommentTextChange: (text: string) => void;
  onAddComment: () => void;
  loading: boolean;
}) {
  return (
    <div>
      {comments.length > 0 && (
        <div style={{ marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {comments.map(c => (
            <div
              key={c.id}
              style={{
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-card)',
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
              }}
            >
              <p style={{ whiteSpace: 'pre-wrap' }}>{c.comment}</p>
              <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {new Date(c.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
        <textarea
          value={commentText}
          onChange={e => onCommentTextChange(e.target.value)}
          placeholder="Add a comment…"
          rows={2}
          className="st-textarea"
          style={{ flex: 1, resize: 'none' }}
        />
        <button
          onClick={onAddComment}
          disabled={!commentText.trim() || loading}
          className="btn-secondary"
          style={{ whiteSpace: 'nowrap' }}
        >
          {loading ? '…' : 'Comment'}
        </button>
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
