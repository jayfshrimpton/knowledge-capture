import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DocumentList from '../components/DocumentList';
import DocumentOutput from '../components/DocumentOutput';
import { useAuth } from '../components/AuthProvider';
import { listDocuments, getDocument, searchDocuments, askQuestion, listDepartments, getExpiringDocuments } from '../lib/api';
import { DocumentListItem, DocumentRow, SearchResult, AskResponse, Department } from '../types';

export default function Library() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { me } = useAuth();
  const role = me?.user?.role;

  // Document list state
  const [items, setItems] = useState<DocumentListItem[]>([]);
  const [expiringDocs, setExpiringDocs] = useState<DocumentListItem[]>([]);
  const [selected, setSelected] = useState<DocumentRow | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Department filter
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  // Search / Ask state
  const [searchMode, setSearchMode] = useState<'search' | 'ask'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [askQuery, setAskQuery] = useState('');
  const [askResponse, setAskResponse] = useState<AskResponse | null>(null);
  const [searching, setSearching] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // Initial document list load + departments
  // ---------------------------------------------------------------------------
  useEffect(() => {
    listDocuments()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load documents'))
      .finally(() => setLoadingList(false));

    getExpiringDocuments().then(setExpiringDocs).catch(() => {});

    if (role !== 'guest') {
      listDepartments().then(setDepartments).catch(() => {});
    }
  }, [role]);

  // ---------------------------------------------------------------------------
  // Load selected document when URL id changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!id) {
      setSelected(null);
      return;
    }
    setLoadingDoc(true);
    setError(null);
    getDocument(id)
      .then(setSelected)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load document'))
      .finally(() => setLoadingDoc(false));
  }, [id]);

  // ---------------------------------------------------------------------------
  // Debounced semantic search
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (searchMode !== 'search') return;

    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearching(true);
      searchDocuments(searchQuery)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, searchMode]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  function switchMode(mode: 'search' | 'ask') {
    setSearchMode(mode);
    setSearchQuery('');
    setAskQuery('');
    setSearchResults(null);
    setAskResponse(null);
    setError(null);
  }

  async function handleAsk() {
    if (!askQuery.trim() || searching) return;
    setSearching(true);
    setAskResponse(null);
    setError(null);
    try {
      const resp = await askQuestion(askQuery);
      setAskResponse(resp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get answer. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Welcome screen for brand-new orgs
  // ---------------------------------------------------------------------------
  const isOnboarded = localStorage.getItem('commonplace_onboarded') !== null;
  if (!loadingList && items.length === 0 && !isOnboarded) {
    return (
      <div style={{ maxWidth: '36rem', margin: '4rem auto', textAlign: 'center', padding: '0 1rem' }}>
        <h1
          style={{
            fontFamily: '"Raleway", sans-serif',
            fontWeight: 600,
            fontSize: '2rem',
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            marginBottom: '0.75rem',
          }}
        >
          Welcome to Commonplace
        </h1>
        <p
          style={{
            fontSize: '1.0625rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: '2.5rem',
          }}
        >
          Turn what your team knows into documentation that lasts.
        </p>
        <div style={{ marginBottom: '0.5rem' }}>
          {[
            'Paste your notes or upload a file',
            'Commonplace structures it automatically',
            'Export or save to your library',
          ].map((step, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.875rem',
                marginBottom: '0.875rem',
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  width: '1.75rem',
                  height: '1.75rem',
                  borderRadius: '50%',
                  background: 'var(--accent-subtle)',
                  color: 'var(--accent)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  fontSize: '0.9375rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  paddingTop: '0.2rem',
                }}
              >
                {step}
              </span>
            </div>
          ))}
        </div>
        <Link
          to="/"
          className="btn-primary"
          style={{ display: 'inline-block', marginTop: '1.75rem', textDecoration: 'none' }}
        >
          Make your first capture →
        </Link>
      </div>
    );
  }

  // In search mode, show search results if available, otherwise filter by dept.
  const displayItems: DocumentListItem[] =
    searchResults !== null
      ? searchResults
      : selectedDeptId
      ? items.filter((d) => d.departments.includes(selectedDeptId))
      : items;

  // Show the answer panel when: ask mode is active, an answer is ready, and
  // no document is currently selected (selecting a source doc overrides it).
  const showAnswerPanel = searchMode === 'ask' && !!askResponse && !id;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[300px_1fr]">
      {/* ------------------------------------------------------------------ */}
      {/* Sidebar                                                             */}
      {/* ------------------------------------------------------------------ */}
      <aside>
        {/* Header + mode toggle */}
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Library</h1>
          <div className="flex gap-1">
            <button
              onClick={() => switchMode('search')}
              style={{
                padding: '0.2rem 0.6rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                background: searchMode === 'search' ? 'var(--accent-subtle)' : 'transparent',
                color: searchMode === 'search' ? 'var(--accent)' : 'var(--text-muted)',
                transition: 'background 150ms, color 150ms',
              }}
            >
              Search
            </button>
            <button
              onClick={() => switchMode('ask')}
              style={{
                padding: '0.2rem 0.6rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                background: searchMode === 'ask' ? 'var(--accent-subtle)' : 'transparent',
                color: searchMode === 'ask' ? 'var(--accent)' : 'var(--text-muted)',
                transition: 'background 150ms, color 150ms',
              }}
            >
              Ask
            </button>
          </div>
        </div>

        {/* Search input */}
        {searchMode === 'search' && (
          <div className="mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by meaning…"
              className="st-input"
            />
            {searchQuery && searching && (
              <p className="mt-1 text-xs text-slate-400">Searching…</p>
            )}
            {searchQuery && !searching && searchResults !== null && searchResults.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">No matching documents found.</p>
            )}
          </div>
        )}

        {/* Ask input */}
        {searchMode === 'ask' && (
          <div className="mb-3">
            <textarea
              value={askQuery}
              onChange={(e) => setAskQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
              placeholder="Ask a question about your documents…"
              rows={3}
              className="st-textarea"
              style={{ resize: 'none' }}
            />
            <button
              onClick={handleAsk}
              disabled={!askQuery.trim() || searching}
              className="btn-primary"
              style={{ marginTop: '0.375rem', width: '100%' }}
            >
              {searching ? 'Thinking…' : 'Ask'}
            </button>
          </div>
        )}

        {/* Sources in ask mode (shown after a response) */}
        {searchMode === 'ask' && askResponse && askResponse.sources.length > 0 && (
          <div className="mb-3">
            <p
              className="mb-1.5 text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              Sources
            </p>
            <ul className="space-y-1">
              {askResponse.sources.map((source) => (
                <li key={source.id}>
                  <button
                    onClick={() => navigate(`/library/${source.id}`)}
                    className="w-full rounded-lg border border-transparent px-3 py-2 text-left text-sm transition hover:bg-slate-100"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {source.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Department filter pills — search mode only, non-guest */}
        {searchMode === 'search' && departments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedDeptId(null)}
              style={{
                padding: '0.2rem 0.65rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: selectedDeptId === null ? 600 : 400,
                border: '1px solid',
                borderColor: selectedDeptId === null ? 'var(--accent)' : 'var(--border-default)',
                background: selectedDeptId === null ? 'var(--accent-subtle)' : 'transparent',
                color: selectedDeptId === null ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              All
            </button>
            {departments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => setSelectedDeptId(selectedDeptId === dept.id ? null : dept.id)}
                style={{
                  padding: '0.2rem 0.65rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: selectedDeptId === dept.id ? 600 : 400,
                  border: '1px solid',
                  borderColor: selectedDeptId === dept.id ? 'var(--accent)' : 'var(--border-default)',
                  background: selectedDeptId === dept.id ? 'var(--accent-subtle)' : 'transparent',
                  color: selectedDeptId === dept.id ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                {dept.name}
              </button>
            ))}
          </div>
        )}

        {/* Expiring documents banner */}
        {expiringDocs.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded mb-4">
            ⚠ {expiringDocs.length} document{expiringDocs.length !== 1 ? 's' : ''} due for review this week
          </div>
        )}

        {/* Document list — only shown in search mode */}
        {searchMode === 'search' && (
          loadingList ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0.5rem' }}>
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ margin: '0 auto 0.75rem' }}
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                No knowledge captured yet
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
                Start by capturing your first piece of knowledge — a process, procedure, or anything your team should know.
              </p>
              <Link
                to="/"
                className="btn-primary"
                style={{ display: 'inline-block', textDecoration: 'none', fontSize: '0.8125rem' }}
              >
                Capture something
              </Link>
            </div>
          ) : (
            <DocumentList
              items={displayItems}
              selectedId={id}
              onSelect={(docId) => navigate(`/library/${docId}`)}
            />
          )
        )}
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* Main content area                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section>
        {/* Guest read-only banner */}
        {role === 'guest' && (
          <div
            className="mb-4 rounded-lg border px-4 py-3 text-sm"
            style={{
              borderColor: 'var(--border-default)',
              background: 'var(--accent-subtle)',
              color: 'var(--accent)',
            }}
          >
            You have read-only guest access
          </div>
        )}

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        {/* Ask answer panel */}
        {showAnswerPanel && (
          <div
            className="rounded-xl border p-6"
            style={{
              background: 'var(--surface-card)',
              borderColor: 'var(--border-default)',
            }}
          >
            <p
              className="mb-3 text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              Answer
            </p>
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}
            >
              {askResponse!.answer}
            </p>
            {askResponse!.sources.length > 0 && (
              <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
                <p className="mb-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Referenced documents:
                </p>
                <div className="flex flex-wrap gap-2">
                  {askResponse!.sources.map((src) => (
                    <button
                      key={src.id}
                      onClick={() => navigate(`/library/${src.id}`)}
                      className="rounded-md border px-2.5 py-1 text-xs transition"
                      style={{
                        borderColor: 'var(--border-default)',
                        color: 'var(--text-secondary)',
                      }}
                      onMouseOver={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
                      }}
                      onMouseOut={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                      }}
                    >
                      {src.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Document output (shown when a document is selected, or as empty state) */}
        {!showAnswerPanel && (
          <>
            {loadingDoc && <p className="text-sm text-slate-400">Loading document…</p>}
            {!loadingDoc && selected && (
              <DocumentOutput
                doc={selected}
                onDocumentUpdated={(updated) => {
                  setSelected(updated);
                  setItems((prev) =>
                    prev.map((item) =>
                      item.id === updated.id ? { ...item, updated_at: updated.updated_at } : item,
                    ),
                  );
                }}
              />
            )}
            {!loadingDoc && !selected && !error && (
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-400">
                {searchMode === 'ask'
                  ? 'Ask a question above to get a grounded answer from your documents.'
                  : 'Select a document to view it.'}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
