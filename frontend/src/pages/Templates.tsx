import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTemplates, getTemplate, TemplateListItem, TemplateSchema } from '../lib/api';
import { DocumentRow } from '../types';
import TemplateForm from '../components/TemplateForm';

// ---------------------------------------------------------------------------
// Template gallery card
// ---------------------------------------------------------------------------

function TemplateCard({
  template,
  onClick,
}: {
  template: TemplateListItem;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500"
    >
      <span className="text-3xl">{template.icon}</span>
      <span className="font-semibold text-slate-900 group-hover:text-brand-700">
        {template.name}
      </span>
      <span className="text-sm text-slate-500">{template.description}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loaders
// ---------------------------------------------------------------------------

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 p-5">
      <div className="h-8 w-8 animate-pulse rounded-md bg-slate-200" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
      <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Templates() {
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedSchema, setSelectedSchema] = useState<TemplateSchema | null>(null);
  const [loadingSchema, setLoadingSchema] = useState(false);

  useEffect(() => {
    listTemplates()
      .then(setTemplates)
      .catch((err) => setListError(err.message ?? 'Failed to load templates'))
      .finally(() => setLoadingList(false));
  }, []);

  const handleSelectTemplate = async (id: string) => {
    setLoadingSchema(true);
    try {
      const schema = await getTemplate(id);
      setSelectedSchema(schema);
    } catch (err) {
      // Non-fatal: show gallery again with an inline error
      console.error('Failed to load template schema:', err);
    } finally {
      setLoadingSchema(false);
    }
  };

  const handleCreated = (doc: DocumentRow) => {
    navigate(`/library/${doc.id}`);
  };

  // ---- Form view ----
  if (selectedSchema) {
    return (
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => setSelectedSchema(null)}
          className="mb-6 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          ← Back to templates
        </button>
        <div className="mb-6 flex items-center gap-3">
          <span className="text-3xl">{selectedSchema.icon}</span>
          <h1 className="text-xl font-semibold text-slate-900">{selectedSchema.name}</h1>
        </div>
        <TemplateForm
          schema={selectedSchema}
          onCreated={handleCreated}
          onCancel={() => setSelectedSchema(null)}
        />
      </div>
    );
  }

  // ---- Gallery view ----
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Templates</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a structured document instantly — no AI required.
        </p>
      </div>

      {listError && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{listError}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loadingList || loadingSchema
          ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
          : templates.map((t) => (
              <TemplateCard key={t.id} template={t} onClick={() => handleSelectTemplate(t.id)} />
            ))}
      </div>
    </div>
  );
}
