import { useState } from 'react';
import CaptureForm from '../components/CaptureForm';
import DocumentOutput from '../components/DocumentOutput';
import { DocumentRow } from '../types';

export default function Capture() {
  const [current, setCurrent] = useState<DocumentRow | null>(null);
  const [sessionDocs, setSessionDocs] = useState<DocumentRow[]>([]);

  function handleCreated(doc: DocumentRow) {
    setCurrent(doc);
    setSessionDocs((prev) => [doc, ...prev]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Capture knowledge</h1>
        <p className="mt-1 text-sm text-slate-500">
          Paste rough notes, an email, or upload a file. The AI structures it into a usable document.
        </p>
      </div>

      <CaptureForm onCreated={handleCreated} />

      {current && <DocumentOutput doc={current} />}

      {sessionDocs.length > 1 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-600">Captured this session</h3>
          <ul className="flex flex-wrap gap-2">
            {sessionDocs.map((d) => (
              <li key={d.id}>
                <button
                  onClick={() => setCurrent(d)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    current?.id === d.id
                      ? 'border-brand-300 bg-brand-50 text-brand-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {d.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
