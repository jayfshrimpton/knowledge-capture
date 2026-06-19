import { useState } from 'react';
import { DocumentRow, DocumentFormat } from '../types';
import DiagramView from './DiagramView';
import ExportButtons from './ExportButtons';

const FORMAT_BADGE: Record<DocumentFormat, string> = {
  procedure: 'bg-blue-100 text-blue-800',
  checklist: 'bg-green-100 text-green-800',
  reference: 'bg-purple-100 text-purple-800',
  diagram: 'bg-amber-100 text-amber-800',
};

type Tab = 'document' | 'warnings' | 'tags';

export default function DocumentOutput({ doc }: { doc: DocumentRow }) {
  const [tab, setTab] = useState<Tab>('document');
  const warnings = doc.warnings ?? [];
  const tags = doc.tags ?? [];

  const tabButton = (id: Tab, label: string, count?: number) => (
    <button
      onClick={() => setTab(id)}
      className={`relative px-4 py-2 text-sm font-medium ${
        tab === id ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 text-xs text-slate-700">{count}</span>
      )}
    </button>
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{doc.title}</h2>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${FORMAT_BADGE[doc.format]}`}>
              {doc.format}
            </span>
          </div>
          {doc.summary && <p className="mt-1 text-sm text-slate-600">{doc.summary}</p>}
          {doc.author_name && (
            <p className="mt-1 text-xs text-slate-400">By {doc.author_name}</p>
          )}
        </div>
        <ExportButtons documentId={doc.id} title={doc.title} />
      </div>

      <div className="flex border-b border-slate-200 px-3">
        {tabButton('document', 'Document')}
        {tabButton('warnings', 'Gaps & warnings', warnings.length)}
        {tabButton('tags', 'Tags', tags.length)}
      </div>

      <div className="p-5">
        {tab === 'document' && <DocumentBody doc={doc} />}

        {tab === 'warnings' &&
          (warnings.length ? (
            <ul className="space-y-2">
              {warnings.map((w, i) => (
                <li
                  key={i}
                  className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                >
                  <span aria-hidden>⚠️</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No gaps or warnings were flagged.</p>
          ))}

        {tab === 'tags' &&
          (tags.length ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <span key={t} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                  #{t}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No tags were generated.</p>
          ))}
      </div>
    </div>
  );
}

function DocumentBody({ doc }: { doc: DocumentRow }) {
  const sections = doc.content ?? [];

  if (doc.format === 'diagram' && doc.diagram_data) {
    return (
      <div className="space-y-5">
        <DiagramView diagram={doc.diagram_data} />
        {doc.diagram_data.description && (
          <div>
            <h3 className="mb-1 text-sm font-semibold text-slate-700">System description</h3>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{doc.diagram_data.description}</p>
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
    return <p className="text-sm text-slate-500">No content was generated.</p>;
  }

  return (
    <div className="space-y-5">
      {sections.map((section, idx) => (
        <div key={idx}>
          {section.heading && (
            <h3 className="mb-1 font-semibold text-slate-800">
              {doc.format === 'procedure' && <span className="text-brand-600">{idx + 1}. </span>}
              {section.heading}
            </h3>
          )}

          {(section.content || section.desc) && (
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {!section.heading && doc.format === 'procedure' && (
                <span className="font-semibold text-brand-600">{idx + 1}. </span>
              )}
              {section.content ?? section.desc}
            </p>
          )}

          {section.items && section.items.length > 0 && (
            <ul className="mt-2 space-y-1">
              {section.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  {doc.format === 'checklist' ? (
                    <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300" readOnly />
                  ) : (
                    <span className="mt-1 text-slate-400">•</span>
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
