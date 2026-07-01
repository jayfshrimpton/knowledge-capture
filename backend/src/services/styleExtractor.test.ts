import { describe, it, expect, vi, beforeEach } from 'vitest';
import JSZip from 'jszip';

// Mock the Gemini fallback so tests are offline and deterministic.
const mockInfer = vi.hoisted(() => vi.fn());
vi.mock('./gemini', () => ({ inferBrandStyle: mockInfer }));

import { extractStyle, mergeStyle, sanitizeStyle, DEFAULT_STYLE } from './styleExtractor';

beforeEach(() => {
  mockInfer.mockReset();
  mockInfer.mockResolvedValue({});
});

// A tiny but valid PNG (8-byte signature + IHDR declaring 10x4 px).
function fakePng(): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0); // length
  ihdr.write('IHDR', 4, 'latin1');
  ihdr.writeUInt32BE(10, 8); // width
  ihdr.writeUInt32BE(4, 12); // height
  return Buffer.concat([sig, ihdr]);
}

const THEME_XML = `<?xml version="1.0"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <a:themeElements>
    <a:clrScheme name="Custom">
      <a:dk1><a:sysClr val="windowText" lastClr="1A1A1A"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="55606E"/></a:dk2>
      <a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>
      <a:accent1><a:srgbClr val="2E5AAC"/></a:accent1>
      <a:accent2><a:srgbClr val="D97706"/></a:accent2>
    </a:clrScheme>
    <a:fontScheme name="Custom">
      <a:majorFont><a:latin typeface="Georgia"/></a:majorFont>
      <a:minorFont><a:latin typeface="Verdana"/></a:minorFont>
    </a:fontScheme>
  </a:themeElements>
</a:theme>`;

async function buildDocx(opts: { withLogo?: boolean; numbered?: boolean } = {}): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('word/theme/theme1.xml', THEME_XML);
  zip.file(
    'word/document.xml',
    opts.numbered
      ? '<w:document><w:body><w:p><w:pPr><w:numPr/></w:pPr></w:p></w:body></w:document>'
      : '<w:document><w:body><w:p/></w:body></w:document>',
  );
  if (opts.withLogo) zip.file('word/media/image1.png', fakePng());
  return zip.generateAsync({ type: 'nodebuffer' });
}

describe('mergeStyle', () => {
  it('overrides valid colours and fonts, ignoring invalid hex', () => {
    const merged = mergeStyle(DEFAULT_STYLE, {
      colors: { primary: '#123ABC', secondary: 'not-a-colour', accent: '#abcdef', text: '#000000' } as any,
      fonts: { heading: 'Calibri', body: '' } as any,
    });
    expect(merged.colors.primary).toBe('#123ABC');
    expect(merged.colors.accent).toBe('#ABCDEF'); // normalised to upper-case
    expect(merged.colors.secondary).toBe(DEFAULT_STYLE.colors.secondary); // invalid hex ignored
    expect(merged.fonts.heading).toBe('Calibri');
    expect(merged.fonts.body).toBe(DEFAULT_STYLE.fonts.body); // empty string ignored
  });
});

describe('sanitizeStyle', () => {
  it('returns a complete style from a partial/unknown input', () => {
    const s = sanitizeStyle({ colors: { primary: '#FF0000' } });
    expect(s.colors.primary).toBe('#FF0000');
    expect(s.fonts.heading).toBe(DEFAULT_STYLE.fonts.heading);
    expect(s.structure).toEqual(DEFAULT_STYLE.structure);
  });

  it('never throws on garbage input', () => {
    expect(() => sanitizeStyle(null)).not.toThrow();
    expect(() => sanitizeStyle('nope' as any)).not.toThrow();
  });
});

describe('extractStyle from .docx', () => {
  it('reads theme colours and fonts from the OOXML theme', async () => {
    const buffer = await buildDocx();
    const result = await extractStyle({
      buffer,
      filename: 'brand.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      rawText: 'ignored',
    });
    expect(result.method).toBe('docx-theme');
    expect(result.style.colors.primary).toBe('#2E5AAC'); // accent1
    expect(result.style.colors.accent).toBe('#D97706'); // accent2
    expect(result.style.colors.text).toBe('#1A1A1A'); // dk1 sysClr lastClr
    expect(result.style.fonts.heading).toBe('Georgia');
    expect(result.style.fonts.body).toBe('Verdana');
    expect(mockInfer).not.toHaveBeenCalled(); // offline path — no AI call
  });

  it('detects numbered sections and extracts a logo', async () => {
    const buffer = await buildDocx({ withLogo: true, numbered: true });
    const result = await extractStyle({
      buffer,
      filename: 'brand.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      rawText: 'ignored',
    });
    expect(result.style.structure.numberedSections).toBe(true);
    expect(result.logo).not.toBeNull();
    expect(result.logo?.ext).toBe('png');
    expect(result.style.logo?.ext).toBe('png');
  });
});

describe('extractStyle fallback (non-docx)', () => {
  it('uses the AI-inferred palette for plain text', async () => {
    mockInfer.mockResolvedValue({
      colors: { primary: '#0A7E3D', secondary: '#6B7280', accent: '#F59E0B', text: '#111111' },
      fonts: { heading: 'Arial', body: 'Arial' },
    });
    const result = await extractStyle({
      buffer: Buffer.from('Acme Landscaping — company handbook'),
      filename: 'handbook.txt',
      mimetype: 'text/plain',
      rawText: 'Acme Landscaping company handbook. We value green, sustainable work.',
    });
    expect(mockInfer).toHaveBeenCalledOnce();
    expect(result.method).toBe('ai-inferred');
    expect(result.style.colors.primary).toBe('#0A7E3D');
    expect(result.logo).toBeNull();
  });

  it('falls back to defaults when inference yields nothing', async () => {
    mockInfer.mockResolvedValue({});
    const result = await extractStyle({
      buffer: Buffer.from('x'),
      filename: 'notes.txt',
      mimetype: 'text/plain',
      rawText: 'x',
    });
    expect(result.method).toBe('default');
    expect(result.style.colors.primary).toBe(DEFAULT_STYLE.colors.primary);
  });
});
