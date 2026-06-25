import { useState } from 'react';
import { TemplateSchema, TemplateField, createFromTemplate } from '../lib/api';
import { DocumentRow } from '../types';

interface Props {
  schema: TemplateSchema;
  onCreated: (doc: DocumentRow) => void;
  onCancel: () => void;
}

type FieldValues = Record<string, string | string[]>;

function initValues(fields: TemplateField[]): FieldValues {
  const v: FieldValues = {};
  for (const f of fields) {
    v[f.id] = f.type === 'list' ? [''] : f.type === 'select' ? (f.options?.[0] ?? '') : '';
  }
  return v;
}

// ---------------------------------------------------------------------------
// Sub-components for each field type
// ---------------------------------------------------------------------------

function Label({ field }: { field: TemplateField }) {
  return (
    <label className="mb-1 block text-sm font-medium text-slate-700">
      {field.label}
      {field.required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

function ListField({
  field,
  values,
  onChange,
}: {
  field: TemplateField;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const update = (i: number, val: string) => {
    const next = [...values];
    next[i] = val;
    onChange(next);
  };
  const add = () => onChange([...values, '']);
  const remove = (i: number) => {
    if (values.length === 1) return onChange(['']);
    onChange(values.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={v}
            placeholder={field.itemPlaceholder ?? 'Add an item…'}
            onChange={(e) => update(i, e.target.value)}
            className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-slate-400 hover:text-red-500"
            aria-label="Remove item"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-sm text-brand-600 hover:text-brand-700"
      >
        + Add item
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TemplateForm({ schema, onCreated, onCancel }: Props) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [values, setValues] = useState<FieldValues>(() => initValues(schema.fields));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (id: string, val: string | string[]) =>
    setValues((prev) => ({ ...prev, [id]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setSubmitting(true);
    try {
      const doc = await createFromTemplate(schema.id, {
        title: title.trim(),
        author: author.trim() || undefined,
        values,
      });
      onCreated(doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Common fields */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`e.g. ${schema.name} — Q3 2024`}
          className={inputClass}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Author</label>
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Optional author name"
          className={inputClass}
        />
      </div>

      <hr className="border-slate-200" />

      {/* Template-specific fields */}
      {schema.fields.map((field) => (
        <div key={field.id}>
          <Label field={field} />
          {field.type === 'text' && (
            <input
              type="text"
              value={values[field.id] as string}
              placeholder={field.placeholder}
              onChange={(e) => setField(field.id, e.target.value)}
              className={inputClass}
            />
          )}
          {field.type === 'date' && (
            <input
              type="date"
              value={values[field.id] as string}
              onChange={(e) => setField(field.id, e.target.value)}
              className={inputClass}
            />
          )}
          {field.type === 'textarea' && (
            <textarea
              rows={3}
              value={values[field.id] as string}
              placeholder={field.placeholder}
              onChange={(e) => setField(field.id, e.target.value)}
              className={`${inputClass} resize-y`}
            />
          )}
          {field.type === 'select' && (
            <select
              value={values[field.id] as string}
              onChange={(e) => setField(field.id, e.target.value)}
              className={inputClass}
            >
              {field.options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}
          {field.type === 'list' && (
            <ListField
              field={field}
              values={values[field.id] as string[]}
              onChange={(v) => setField(field.id, v)}
            />
          )}
        </div>
      ))}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create document'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
