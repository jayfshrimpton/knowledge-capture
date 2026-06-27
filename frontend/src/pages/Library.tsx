import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DocumentList from '../components/DocumentList';
import DocumentOutput from '../components/DocumentOutput';
import { listDocuments, getDocument } from '../lib/api';
import { DocumentListItem, DocumentRow } from '../types';

export default function Library() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<DocumentListItem[]>([]);
  const [selected, setSelected] = useState<DocumentRow | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDocuments()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load documents'))
      .finally(() => setLoadingList(false));
  }, []);

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

  const isOnboarded = localStorage.getItem('lore_onboarded') !== null;

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
          Welcome to Lore
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
            'Lore structures it automatically',
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

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[300px_1fr]">
      <aside>
        <h1 className="mb-3 text-lg font-semibold text-slate-900">Library</h1>
        {loadingList ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <DocumentList
            items={items}
            selectedId={id}
            onSelect={(docId) => navigate(`/library/${docId}`)}
          />
        )}
      </aside>

      <section>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {loadingDoc && <p className="text-sm text-slate-400">Loading document…</p>}
        {!loadingDoc && selected && <DocumentOutput doc={selected} />}
        {!loadingDoc && !selected && !error && (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-400">
            Select a document to view it.
          </div>
        )}
      </section>
    </div>
  );
}
