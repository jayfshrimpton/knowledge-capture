import JSZip from 'jszip';
import { BrandStyle } from '../types';
import { inferBrandStyle } from './gemini';

/**
 * Style extraction — turns an uploaded reference document into a BrandStyle.
 *
 * For .docx we read the real theme (fonts + colour scheme) and the first
 * embedded image (treated as the logo) straight from the OOXML package. For
 * PDFs and plain text — which carry no machine-readable theme — we fall back to
 * inferring a palette from the document text with Gemini. Everything is merged
 * over DEFAULT_STYLE so the returned style is always complete.
 */

export interface ExtractedStyle {
  style: BrandStyle;
  /** Logo image bytes, if one was found embedded in the document. */
  logo: { buffer: Buffer; ext: string } | null;
  /** How the style was derived — surfaced in the UI so users know what to trust. */
  method: 'docx-theme' | 'ai-inferred' | 'default';
  /** Human-readable notes about the extraction (e.g. AI fallback used). */
  notes: string[];
}

/**
 * Baseline style — reproduces the exporter's original hard-coded look, so a
 * document exported with no saved style is identical to before this feature.
 */
export const DEFAULT_STYLE: BrandStyle = {
  fonts: { heading: 'Helvetica', body: 'Helvetica' },
  colors: {
    primary: '#1C3A5E', // navy
    secondary: '#94A3B8', // grey
    accent: '#F59E0B', // amber
    text: '#475569', // slate
  },
  logo: null,
  // Defaults reproduce the exporter's original behaviour: headings are not
  // numbered, section headings get an underline rule.
  structure: { numberedSections: false, headingRule: true },
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function normaliseHex(val: string | undefined | null): string | null {
  if (!val) return null;
  const v = val.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(v)) return `#${v.toUpperCase()}`;
  return null;
}

// ---------------------------------------------------------------------------
// .docx theme parsing
// ---------------------------------------------------------------------------

/** Extracts the `<a:latin typeface="...">` from a major/minor font block. */
function themeFont(themeXml: string, block: 'majorFont' | 'minorFont'): string | null {
  const blockMatch = themeXml.match(new RegExp(`<a:${block}>([\\s\\S]*?)</a:${block}>`));
  if (!blockMatch) return null;
  const latin = blockMatch[1].match(/<a:latin[^>]*typeface="([^"]+)"/);
  const face = latin?.[1]?.trim();
  return face && face.length > 0 ? face : null;
}

/**
 * Resolves a colour-scheme slot (e.g. "accent1", "dk1") to a hex value.
 * Handles both `<a:srgbClr val="RRGGBB"/>` and
 * `<a:sysClr val="windowText" lastClr="000000"/>`.
 */
function themeColor(clrSchemeXml: string, slot: string): string | null {
  const slotMatch = clrSchemeXml.match(new RegExp(`<a:${slot}>([\\s\\S]*?)</a:${slot}>`));
  if (!slotMatch) return null;
  const inner = slotMatch[1];
  const srgb = inner.match(/<a:srgbClr[^>]*val="([0-9a-fA-F]{6})"/);
  if (srgb) return normaliseHex(srgb[1]);
  const sys = inner.match(/<a:sysClr[^>]*lastClr="([0-9a-fA-F]{6})"/);
  if (sys) return normaliseHex(sys[1]);
  return null;
}

const IMAGE_EXTS = ['png', 'jpeg', 'jpg', 'gif', 'bmp', 'svg', 'emf', 'wmf'];

/**
 * Picks the most logo-like image from a docx media folder: the largest raster
 * image (logos are usually the biggest branded asset in a header/footer).
 * Vector formats (emf/wmf/svg) are only used if nothing else is available.
 */
function pickLogo(
  media: Array<{ name: string; ext: string; size: number; buffer: Buffer }>,
): { buffer: Buffer; ext: string } | null {
  if (media.length === 0) return null;
  const raster = media.filter((m) => ['png', 'jpeg', 'jpg', 'gif', 'bmp'].includes(m.ext));
  const pool = raster.length ? raster : media;
  const best = pool.reduce((a, b) => (b.size > a.size ? b : a));
  const ext = best.ext === 'jpg' ? 'jpeg' : best.ext;
  return { buffer: best.buffer, ext };
}

async function extractFromDocx(buffer: Buffer): Promise<{
  style: BrandStyle;
  logo: { buffer: Buffer; ext: string } | null;
  usedTheme: boolean;
}> {
  const zip = await JSZip.loadAsync(buffer);

  const style: BrandStyle = JSON.parse(JSON.stringify(DEFAULT_STYLE));
  let usedTheme = false;

  // --- Theme: fonts + colour scheme ---
  const themeFile = zip.file('word/theme/theme1.xml');
  if (themeFile) {
    const themeXml = await themeFile.async('string');

    const heading = themeFont(themeXml, 'majorFont');
    const body = themeFont(themeXml, 'minorFont');
    if (heading) {
      style.fonts.heading = heading;
      usedTheme = true;
    }
    if (body) {
      style.fonts.body = body;
      usedTheme = true;
    }

    const clrMatch = themeXml.match(/<a:clrScheme[\s\S]*?<\/a:clrScheme>/);
    if (clrMatch) {
      const clr = clrMatch[0];
      const primary = themeColor(clr, 'accent1') ?? themeColor(clr, 'dk2');
      const text = themeColor(clr, 'dk1') ?? themeColor(clr, 'tx1');
      const accent = themeColor(clr, 'accent2') ?? themeColor(clr, 'accent4');
      const secondary = themeColor(clr, 'dk2') ?? themeColor(clr, 'accent3');
      if (primary) {
        style.colors.primary = primary;
        usedTheme = true;
      }
      if (text) style.colors.text = text;
      if (accent) style.colors.accent = accent;
      if (secondary) style.colors.secondary = secondary;
    }
  }

  // --- Structure heuristic: numbered lists present? ---
  const docFile = zip.file('word/document.xml');
  if (docFile) {
    const docXml = await docFile.async('string');
    style.structure.numberedSections = /<w:numPr[\s/>]/.test(docXml);
  }

  // --- Logo: largest embedded image ---
  const mediaEntries = zip.file(/^word\/media\//);
  const media: Array<{ name: string; ext: string; size: number; buffer: Buffer }> = [];
  for (const entry of mediaEntries) {
    const ext = (entry.name.split('.').pop() ?? '').toLowerCase();
    if (!IMAGE_EXTS.includes(ext)) continue;
    const data = await entry.async('nodebuffer');
    media.push({ name: entry.name, ext, size: data.length, buffer: data });
  }
  const logo = pickLogo(media);
  if (logo) style.logo = { path: '', ext: logo.ext };

  return { style, logo, usedTheme };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ExtractInput {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  /** Plain text already extracted from the document (used for the AI fallback). */
  rawText: string;
}

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Extracts a complete BrandStyle from an uploaded reference document.
 * .docx → real theme + embedded logo; everything else → AI-inferred palette.
 * Always returns a complete style merged over DEFAULT_STYLE and never throws
 * for recoverable problems (falls back to defaults).
 */
export async function extractStyle(input: ExtractInput): Promise<ExtractedStyle> {
  const { buffer, filename, mimetype, rawText } = input;
  const isDocx = filename.toLowerCase().endsWith('.docx') || mimetype === DOCX_MIME;
  const notes: string[] = [];

  if (isDocx) {
    try {
      const { style, logo, usedTheme } = await extractFromDocx(buffer);
      if (usedTheme) {
        if (logo) notes.push('Logo extracted from the document.');
        return { style, logo, method: 'docx-theme', notes };
      }
      // Theme was empty/absent — enrich with an AI-inferred palette.
      notes.push('No theme found in the Word file; palette inferred from content.');
      const inferred = await inferBrandStyle(rawText);
      return {
        style: mergeStyle(style, inferred),
        logo,
        method: logo ? 'docx-theme' : 'ai-inferred',
        notes,
      };
    } catch (err) {
      console.warn('docx style extraction failed; falling back to AI inference.', err);
      notes.push('Could not read the Word theme; palette inferred from content.');
    }
  }

  // Non-docx (PDF / text) or a docx that failed to parse: infer from text.
  const inferred = await inferBrandStyle(rawText);
  const style = mergeStyle(DEFAULT_STYLE, inferred);
  if (Object.keys(inferred).length === 0) {
    notes.push('Could not infer a style from this document; using defaults. You can edit it below.');
    return { style, logo: null, method: 'default', notes };
  }
  notes.push('Colours and fonts inferred from the document content — please review.');
  return { style, logo: null, method: 'ai-inferred', notes };
}

/** Deep-merges a partial style over a base, validating hex colours. */
export function mergeStyle(base: BrandStyle, partial: Partial<BrandStyle>): BrandStyle {
  const out: BrandStyle = JSON.parse(JSON.stringify(base));
  if (partial.fonts) {
    if (typeof partial.fonts.heading === 'string' && partial.fonts.heading.trim())
      out.fonts.heading = partial.fonts.heading.trim();
    if (typeof partial.fonts.body === 'string' && partial.fonts.body.trim())
      out.fonts.body = partial.fonts.body.trim();
  }
  if (partial.colors) {
    for (const key of ['primary', 'secondary', 'accent', 'text'] as const) {
      const hex = normaliseHex((partial.colors as Record<string, string>)[key]);
      if (hex) out.colors[key] = hex;
    }
  }
  if (partial.structure) {
    if (typeof partial.structure.numberedSections === 'boolean')
      out.structure.numberedSections = partial.structure.numberedSections;
    if (typeof partial.structure.headingRule === 'boolean')
      out.structure.headingRule = partial.structure.headingRule;
  }
  if (partial.logo !== undefined) out.logo = partial.logo;
  return out;
}

/** Validates and normalises a BrandStyle received from the client (edit form). */
export function sanitizeStyle(input: unknown): BrandStyle {
  const partial = (input ?? {}) as Partial<BrandStyle>;
  return mergeStyle(DEFAULT_STYLE, partial);
}
