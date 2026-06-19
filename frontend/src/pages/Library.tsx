import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
