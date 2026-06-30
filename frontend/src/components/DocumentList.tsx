import { DocumentListItem, DocumentFormat, DocumentStatus } from '../types';

const FORMAT_DOT: Record<DocumentFormat, string> = {
  procedure: 'bg-blue-500',
  checklist: 'bg-green-500',
  reference: 'bg-purple-500',
  diagram: 'bg-amber-500',
};

const STATUS_PILL: Partial<Record<DocumentStatus, { bg: string; color: string; label: string }>> = {
  draft:     { bg: 'bg-slate-100',   color: 'text-slate-500',  label: 'Draft' },
  in_review: { bg: 'bg-amber-50',    color: 'text-amber-600',  label: 'In Review' },
  approved:  { bg: 'bg-emerald-50',  color: 'text-emerald-600',label: 'Approved' },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function DocumentList({
  items,
  selectedId,
  onSelect,
}: {
  items: DocumentListItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
        No documents yet. Capture your first one.
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {items.map((doc) => (
        <li key={doc.id}>
          <button
            onClick={() => onSelect(doc.id)}
            className={`w-full rounded-lg border px-3 py-2 text-left transition ${
              selectedId === doc.id
                ? 'border-brand-300 bg-brand-50'
                : 'border-transparent hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${FORMAT_DOT[doc.format]}`} />
              <span className="truncate text-sm font-medium text-slate-800">{doc.title}</span>
              {STATUS_PILL[doc.status] && (
                <span className={`shrink-0 rounded px-1 py-0.5 text-xs font-medium ${STATUS_PILL[doc.status]!.bg} ${STATUS_PILL[doc.status]!.color}`}>
                  {STATUS_PILL[doc.status]!.label}
                </span>
              )}
              {doc.visibility === 'public' && (
                <span className="shrink-0 rounded px-1 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-600">
                  Public
                </span>
              )}
              {doc.source === 'template' && (
                <span className="shrink-0 rounded px-1 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">
                  Template
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center justify-between text-xs text-slate-400">
              <span className="capitalize">{doc.format}</span>
              <span>{formatDate(doc.created_at)}</span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
