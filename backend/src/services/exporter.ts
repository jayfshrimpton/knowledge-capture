import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  ImageRun,
} from 'docx';
import PDFDocument from 'pdfkit';
import { DocumentRow, DocumentSection, ResolvedStyle } from '../types';

export type ExportFormat = 'word' | 'pdf';

// ---------------------------------------------------------------------------
// Theme — resolves a document's export styling from the org's saved brand
// style, falling back to the original built-in look when none is provided.
// ---------------------------------------------------------------------------

const DEFAULT_COLOURS = {
  primary: '#1C3A5E', // navy
  secondary: '#94A3B8', // grey
  accent: '#F59E0B', // amber
  text: '#475569', // slate
} as const;

const DEFAULT_FONT = 'Helvetica';

interface Theme {
  primary: string;
  secondary: string;
  accent: string;
  accentBg: string;
  text: string;
  headingFont: string;
  bodyFont: string;
  numberedSections: boolean;
  headingRule: boolean;
  logo: { buffer: Buffer; ext: string } | null;
}

/** Lightens a hex colour towards white by `amount` (0–1) — used for tint backgrounds. */
function tint(hex: string, amount: number): string {
  const v = hex.replace('#', '');
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const hx = (c: number) => c.toString(16).padStart(2, '0');
  return `#${hx(mix(r))}${hx(mix(g))}${hx(mix(b))}`;
}

function buildTheme(resolved?: ResolvedStyle | null): Theme {
  const s = resolved?.style;
  const accent = s?.colors.accent ?? DEFAULT_COLOURS.accent;
  return {
    primary: s?.colors.primary ?? DEFAULT_COLOURS.primary,
    secondary: s?.colors.secondary ?? DEFAULT_COLOURS.secondary,
    accent,
    accentBg: tint(accent, 0.85),
    text: s?.colors.text ?? DEFAULT_COLOURS.text,
    headingFont: s?.fonts.heading ?? DEFAULT_FONT,
    bodyFont: s?.fonts.body ?? DEFAULT_FONT,
    numberedSections: s?.structure.numberedSections ?? false,
    headingRule: s?.structure.headingRule ?? true,
    logo: resolved?.logo ?? null,
  };
}

/** Hex without the leading '#', as the docx library expects. */
const docxColor = (hex: string) => hex.replace('#', '').toUpperCase();

/** Maps an arbitrary font family onto the closest built-in PDF font set. */
function pdfFonts(family: string): { regular: string; bold: string; oblique: string } {
  const f = family.toLowerCase();
  if (/times|georgia|garamond|serif|cambria|book antiqua|minion/.test(f)) {
    return { regular: 'Times-Roman', bold: 'Times-Bold', oblique: 'Times-Italic' };
  }
  if (/courier|consolas|mono|menlo/.test(f)) {
    return { regular: 'Courier', bold: 'Courier-Bold', oblique: 'Courier-Oblique' };
  }
  return { regular: 'Helvetica', bold: 'Helvetica-Bold', oblique: 'Helvetica-Oblique' };
}

/** True for image formats both exporters can embed. */
function isEmbeddableImage(ext: string): boolean {
  return ['png', 'jpeg', 'jpg', 'gif', 'bmp'].includes(ext.toLowerCase());
}

/**
 * Reads intrinsic pixel dimensions from a PNG or JPEG buffer (no dependency).
 * Returns null for unsupported formats, letting callers fall back to a default.
 */
function imageSize(buffer: Buffer, ext: string): { width: number; height: number } | null {
  const e = ext.toLowerCase();
  try {
    if (e === 'png') {
      // IHDR width/height are big-endian uint32 at offsets 16 and 20.
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    if (e === 'jpeg' || e === 'jpg') {
      let off = 2;
      while (off < buffer.length) {
        if (buffer[off] !== 0xff) {
          off++;
          continue;
        }
        const marker = buffer[off + 1];
        // SOF0..SOF15 (except DHT/DAC/RST) carry frame dimensions.
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { height: buffer.readUInt16BE(off + 5), width: buffer.readUInt16BE(off + 7) };
        }
        off += 2 + buffer.readUInt16BE(off + 2);
      }
    }
  } catch {
    return null;
  }
  return null;
}

/** Scales an image to fit within a bounding box, preserving aspect ratio. */
function fitImage(
  buffer: Buffer,
  ext: string,
  maxW: number,
  maxH: number,
): { width: number; height: number } {
  const size = imageSize(buffer, ext);
  if (!size || size.width === 0 || size.height === 0) return { width: maxW, height: maxH };
  const ratio = Math.min(maxW / size.width, maxH / size.height, 1);
  return { width: Math.round(size.width * ratio), height: Math.round(size.height * ratio) };
}

// ---------------------------------------------------------------------------
// Word export (docx package)
// ---------------------------------------------------------------------------

function wordSections(doc: DocumentRow, theme: Theme): Paragraph[] {
  const paras: Paragraph[] = [];

  const headingRun = (text: string, size: number) =>
    new TextRun({ text, bold: true, font: theme.headingFont, color: docxColor(theme.primary), size });
  const bodyRun = (text: string, opts: { italics?: boolean; color?: string } = {}) =>
    new TextRun({
      text,
      font: theme.bodyFont,
      color: docxColor(opts.color ?? theme.text),
      italics: opts.italics,
    });

  // Logo (if the org style carries one and it's an embeddable raster image).
  if (theme.logo && isEmbeddableImage(theme.logo.ext)) {
    const { width, height } = fitImage(theme.logo.buffer, theme.logo.ext, 160, 64);
    const e = theme.logo.ext.toLowerCase();
    const docxType: 'png' | 'jpg' | 'gif' | 'bmp' =
      e === 'png' ? 'png' : e === 'gif' ? 'gif' : e === 'bmp' ? 'bmp' : 'jpg';
    paras.push(
      new Paragraph({
        children: [
          new ImageRun({
            type: docxType,
            data: theme.logo.buffer,
            transformation: { width, height },
          }),
        ],
        spacing: { after: 160 },
      }),
    );
  }

  paras.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [headingRun(doc.title, 52)],
    }),
  );

  const meta: string[] = [];
  if (doc.author_name) meta.push(`Author: ${doc.author_name}`);
  meta.push(`Format: ${doc.format}`);
  if (meta.length) {
    paras.push(new Paragraph({ children: [bodyRun(meta.join('   •   '), { italics: true, color: theme.secondary })] }));
  }

  if (doc.summary) {
    paras.push(new Paragraph({ children: [bodyRun(doc.summary)], spacing: { after: 200 } }));
  }

  const sections: DocumentSection[] = doc.content ?? [];
  let headingNo = 0;

  sections.forEach((section, idx) => {
    if (section.heading) {
      headingNo += 1;
      const prefix =
        theme.numberedSections && doc.format !== 'procedure' ? `${headingNo}. ` : '';
      paras.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [headingRun(`${prefix}${section.heading}`, 30)],
        }),
      );
    }

    if (doc.format === 'procedure' && (section.desc || section.content)) {
      paras.push(new Paragraph({ children: [bodyRun(`${idx + 1}. ${section.desc ?? section.content}`)], spacing: { after: 80 } }));
    } else if (section.content) {
      paras.push(new Paragraph({ children: [bodyRun(section.content)], spacing: { after: 80 } }));
    } else if (section.desc) {
      paras.push(new Paragraph({ children: [bodyRun(section.desc)], spacing: { after: 80 } }));
    }

    (section.items ?? []).forEach((item) => {
      if (doc.format === 'checklist') {
        paras.push(new Paragraph({ children: [bodyRun(`☐ ${item}`)], spacing: { after: 40 } }));
      } else {
        paras.push(new Paragraph({ children: [bodyRun(item)], bullet: { level: 0 } }));
      }
    });
  });

  if (doc.format === 'diagram' && doc.diagram_data?.description) {
    paras.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [headingRun('System description', 30)] }));
    paras.push(new Paragraph({ children: [bodyRun(doc.diagram_data.description)] }));
  }

  if (doc.warnings && doc.warnings.length) {
    paras.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Gaps & warnings', bold: true, font: theme.headingFont, color: docxColor(theme.accent), size: 30 })] }));
    doc.warnings.forEach((w) => paras.push(new Paragraph({ children: [bodyRun(w)], bullet: { level: 0 } })));
  }

  if (doc.tags && doc.tags.length) {
    paras.push(
      new Paragraph({
        children: [bodyRun(`Tags: ${doc.tags.join(', ')}`, { italics: true, color: theme.secondary })],
        spacing: { before: 200 },
      }),
    );
  }

  return paras;
}

async function generateWord(doc: DocumentRow, theme: Theme): Promise<Buffer> {
  const wordDoc = new Document({
    sections: [{ children: wordSections(doc, theme) }],
  });
  return Packer.toBuffer(wordDoc);
}

// ---------------------------------------------------------------------------
// PDF export (pdfkit)
// ---------------------------------------------------------------------------

const MARGIN = { top: 72, bottom: 72, left: 56, right: 56 } as const;
const PAGE_WIDTH = 595.28; // A4 pts
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN.left - MARGIN.right;
const HEADER_Y = 20;
const FOOTER_Y = PAGE_HEIGHT - 50;

function drawPageDecorations(
  pdf: PDFKit.PDFDocument,
  theme: Theme,
  pageNumber: number,
  totalPages: number,
  docTitle: string,
  authorName: string,
): void {
  const fonts = pdfFonts(theme.headingFont);
  const bodyFonts = pdfFonts(theme.bodyFont);
  pdf.save();

  // Header separator line
  pdf
    .moveTo(MARGIN.left, HEADER_Y + 16)
    .lineTo(PAGE_WIDTH - MARGIN.right, HEADER_Y + 16)
    .strokeColor(theme.primary)
    .lineWidth(0.5)
    .stroke();

  // Header left: logo image if available, else the org "Commonplace" logotype.
  if (theme.logo && (theme.logo.ext === 'png' || theme.logo.ext === 'jpeg' || theme.logo.ext === 'jpg')) {
    try {
      const { width, height } = fitImage(theme.logo.buffer, theme.logo.ext, 120, 18);
      pdf.image(theme.logo.buffer, MARGIN.left, HEADER_Y - 4, { width, height });
    } catch {
      pdf.font(fonts.bold).fontSize(11).fillColor(theme.primary).text('Commonplace', MARGIN.left, HEADER_Y, { lineBreak: false });
    }
  } else {
    pdf.font(fonts.bold).fontSize(11).fillColor(theme.primary)
      .text('Commonplace', MARGIN.left, HEADER_Y, { lineBreak: false });
  }

  // Header right: document title
  pdf.font(bodyFonts.regular).fontSize(9).fillColor(theme.secondary)
    .text(docTitle, MARGIN.left, HEADER_Y, { width: CONTENT_WIDTH, align: 'right', lineBreak: false });

  // Footer separator line
  pdf
    .moveTo(MARGIN.left, FOOTER_Y - 6)
    .lineTo(PAGE_WIDTH - MARGIN.right, FOOTER_Y - 6)
    .strokeColor(theme.secondary)
    .lineWidth(0.5)
    .stroke();

  // Footer centre: page number
  pdf.font(bodyFonts.regular).fontSize(8).fillColor(theme.secondary)
    .text(`Page ${pageNumber} of ${totalPages}`, MARGIN.left, FOOTER_Y, {
      width: CONTENT_WIDTH,
      align: 'center',
      lineBreak: false,
    });

  // Footer right: author / org name
  if (authorName) {
    pdf.font(bodyFonts.regular).fontSize(8).fillColor(theme.secondary)
      .text(authorName, MARGIN.left, FOOTER_Y, { width: CONTENT_WIDTH, align: 'right', lineBreak: false });
  }

  pdf.restore();
}

function drawSectionHeading(pdf: PDFKit.PDFDocument, theme: Theme, text: string): void {
  pdf.font(pdfFonts(theme.headingFont).bold).fontSize(14).fillColor(theme.primary).text(text);
  if (theme.headingRule) {
    const ruleY = pdf.y + 2;
    pdf
      .moveTo(MARGIN.left, ruleY)
      .lineTo(MARGIN.left + CONTENT_WIDTH, ruleY)
      .strokeColor(theme.primary)
      .lineWidth(0.5)
      .stroke();
  }
  pdf.moveDown(0.4);
}

function drawWarningsBox(pdf: PDFKit.PDFDocument, theme: Theme, warnings: string[]): void {
  const innerWidth = CONTENT_WIDTH - 18;
  const bodyFonts = pdfFonts(theme.bodyFont);

  const headingHeight = pdf.heightOfString('Gaps & Warnings', { width: innerWidth });
  const warningHeights = warnings.map((w) => pdf.heightOfString(`• ${w}`, { width: innerWidth }));
  const totalWarningHeight = warningHeights.reduce((a, b) => a + b, 0);
  const boxPadding = 10;
  const boxHeight = boxPadding + headingHeight + 6 + totalWarningHeight + boxPadding;

  const spaceLeft = PAGE_HEIGHT - MARGIN.bottom - pdf.y;
  if (spaceLeft < boxHeight) {
    pdf.addPage();
  }

  const boxX = MARGIN.left;
  const boxY = pdf.y;

  pdf.rect(boxX, boxY, CONTENT_WIDTH, boxHeight).fillColor(theme.accentBg).fill();
  pdf.rect(boxX, boxY, 4, boxHeight).fillColor(theme.accent).fill();

  pdf.font(pdfFonts(theme.headingFont).bold).fontSize(12).fillColor(theme.accent)
    .text('Gaps & Warnings', boxX + 14, boxY + boxPadding, { width: innerWidth, lineBreak: false });

  pdf.moveDown(0.5);
  pdf.font(bodyFonts.regular).fontSize(10).fillColor(theme.text);
  warnings.forEach((w) => {
    pdf.text(`• ${w}`, { width: innerWidth, indent: 0 });
  });

  pdf.moveDown(0.6);
}

function generatePdf(doc: DocumentRow, theme: Theme): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const bodyFonts = pdfFonts(theme.bodyFont);
    const headFonts = pdfFonts(theme.headingFont);

    const pdf = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN.top, bottom: MARGIN.bottom, left: MARGIN.left, right: MARGIN.right },
      bufferPages: true,
      info: { Title: doc.title, Author: doc.author_name ?? undefined },
    });

    const chunks: Buffer[] = [];
    pdf.on('data', (c: Buffer) => chunks.push(c));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    // Title
    pdf.font(headFonts.bold).fontSize(26).fillColor(theme.primary).text(doc.title);
    pdf.moveDown(0.3);

    // Metadata line
    const metaParts: string[] = [];
    if (doc.author_name) metaParts.push(`Author: ${doc.author_name}`);
    metaParts.push(`Format: ${doc.format}`);
    metaParts.push(new Date(doc.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' }));
    pdf.font(bodyFonts.oblique).fontSize(9).fillColor(theme.secondary).text(metaParts.join('   •   '));
    pdf.moveDown(0.6);

    // Summary
    if (doc.summary) {
      pdf.font(bodyFonts.regular).fontSize(11).fillColor(theme.text).text(doc.summary, { lineGap: 3 });
      pdf.moveDown(0.8);
    }

    // Sections
    const sections: DocumentSection[] = doc.content ?? [];
    let headingNo = 0;
    sections.forEach((section, idx) => {
      if (section.heading) {
        headingNo += 1;
        const prefix = theme.numberedSections && doc.format !== 'procedure' ? `${headingNo}. ` : '';
        drawSectionHeading(pdf, theme, `${prefix}${section.heading}`);
      }

      const body =
        doc.format === 'procedure' ? section.desc ?? section.content : section.content ?? section.desc;

      if (body) {
        const prefix = doc.format === 'procedure' ? `${idx + 1}. ` : '';
        pdf.font(bodyFonts.regular).fontSize(11).fillColor(theme.text).text(`${prefix}${body}`, { lineGap: 3 });
        pdf.moveDown(0.3);
      }

      (section.items ?? []).forEach((item) => {
        const bullet = doc.format === 'checklist' ? '☐ ' : '• ';
        pdf.font(bodyFonts.regular).fontSize(11).fillColor(theme.text).text(`${bullet}${item}`, { indent: 14, lineGap: 2 });
      });

      pdf.moveDown(0.5);
    });

    // Diagram description
    if (doc.format === 'diagram' && doc.diagram_data?.description) {
      drawSectionHeading(pdf, theme, 'System Description');
      pdf.font(bodyFonts.regular).fontSize(11).fillColor(theme.text).text(doc.diagram_data.description, { lineGap: 3 });
      pdf.moveDown(0.5);
    }

    // Gaps & warnings
    if (doc.warnings && doc.warnings.length > 0) {
      drawWarningsBox(pdf, theme, doc.warnings);
    }

    // Tags
    if (doc.tags && doc.tags.length > 0) {
      pdf.font(bodyFonts.oblique).fontSize(9).fillColor(theme.secondary).text(`Tags: ${doc.tags.join(', ')}`);
    }

    // Post-pass: headers and footers on every buffered page
    const { count: totalPages } = pdf.bufferedPageRange();
    for (let i = 0; i < totalPages; i++) {
      pdf.switchToPage(i);
      drawPageDecorations(pdf, theme, i + 1, totalPages, doc.title, doc.author_name ?? '');
    }

    pdf.flushPages();
    pdf.end();
  });
}

export interface ExportResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

function safeFilename(title: string): string {
  return (title || 'document').replace(/[^a-z0-9-_ ]/gi, '').replace(/\s+/g, '_').slice(0, 60) || 'document';
}

/**
 * Renders a document to Word or PDF. When `style` is supplied (the org's default
 * brand style) its fonts, colours and logo are applied; otherwise the built-in
 * look is used.
 */
export async function exportDocument(
  doc: DocumentRow,
  format: ExportFormat,
  style?: ResolvedStyle | null,
): Promise<ExportResult> {
  const theme = buildTheme(style);
  const base = safeFilename(doc.title);
  if (format === 'word') {
    return {
      buffer: await generateWord(doc, theme),
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename: `${base}.docx`,
    };
  }
  return {
    buffer: await generatePdf(doc, theme),
    contentType: 'application/pdf',
    filename: `${base}.pdf`,
  };
}
