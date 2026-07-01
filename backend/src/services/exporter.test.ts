import { describe, it, expect } from 'vitest';
import { exportDocument } from './exporter';
import { DocumentRow, ResolvedStyle } from '../types';

function sampleDoc(overrides: Partial<DocumentRow> = {}): DocumentRow {
  return {
    id: 'doc-1',
    org_id: 'org-1',
    created_by: 'user-1',
    title: 'Site Safety Procedure',
    author_name: 'Jay Shrimpton',
    format: 'procedure',
    summary: 'How to make the site safe before works begin.',
    content: [
      { heading: 'Isolate power', desc: 'Lock off the main isolator.' },
      { heading: 'Checks', items: ['Test for dead', 'Apply tags'] },
    ],
    diagram_data: null,
    warnings: ['Author did not confirm the isolator location'],
    tags: ['safety', 'electrical'],
    raw_input: null,
    source_file_path: null,
    source: 'ai',
    version: 1,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
    ...overrides,
  };
}

const PDF_MAGIC = '%PDF';
const ZIP_MAGIC = Buffer.from([0x50, 0x4b]); // "PK" — docx is a zip

describe('exportDocument (no style)', () => {
  it('produces a valid .docx buffer', async () => {
    const res = await exportDocument(sampleDoc(), 'word');
    expect(res.filename).toBe('Site_Safety_Procedure.docx');
    expect(res.contentType).toContain('wordprocessingml');
    expect(res.buffer.subarray(0, 2).equals(ZIP_MAGIC)).toBe(true);
    expect(res.buffer.length).toBeGreaterThan(500);
  });

  it('produces a valid .pdf buffer', async () => {
    const res = await exportDocument(sampleDoc(), 'pdf');
    expect(res.filename).toBe('Site_Safety_Procedure.pdf');
    expect(res.contentType).toBe('application/pdf');
    expect(res.buffer.subarray(0, 4).toString('latin1')).toBe(PDF_MAGIC);
  });
});

describe('exportDocument (with brand style)', () => {
  const style: ResolvedStyle = {
    style: {
      fonts: { heading: 'Georgia', body: 'Arial' },
      colors: { primary: '#2E5AAC', secondary: '#8892A0', accent: '#D97706', text: '#111827' },
      logo: null,
      structure: { numberedSections: true, headingRule: false },
    },
    logo: null,
  };

  it('applies a serif heading font mapping without throwing (PDF)', async () => {
    const res = await exportDocument(sampleDoc({ format: 'reference' }), 'pdf', style);
    expect(res.buffer.subarray(0, 4).toString('latin1')).toBe(PDF_MAGIC);
    expect(res.buffer.length).toBeGreaterThan(500);
  });

  it('applies custom colours and fonts without throwing (Word)', async () => {
    const res = await exportDocument(sampleDoc({ format: 'reference' }), 'word', style);
    expect(res.buffer.subarray(0, 2).equals(ZIP_MAGIC)).toBe(true);
  });

  it('handles a null style the same as no style', async () => {
    const res = await exportDocument(sampleDoc(), 'pdf', null);
    expect(res.buffer.subarray(0, 4).toString('latin1')).toBe(PDF_MAGIC);
  });
});
