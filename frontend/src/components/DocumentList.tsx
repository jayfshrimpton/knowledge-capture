import { DocumentListItem, DocumentFormat } from '../types';

const FORMAT_DOT: Record<DocumentFormat, string> = {
  procedure: 'bg-blue-500',
  checklist: 'bg-green-500',
  reference: 'bg-purple-500',
  diagram: 'bg-amber-500',
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
