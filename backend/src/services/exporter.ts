import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
} from 'docx';
import PDFDocument from 'pdfkit';
import { DocumentRow, DocumentSection } from '../types';

export type ExportFormat = 'word' | 'pdf';

// ---------------------------------------------------------------------------
// Word export (docx package)
// ---------------------------------------------------------------------------

function wordSections(doc: DocumentRow): Paragraph[] {
  const paras: Paragraph[] = [];

  paras.push(new Paragraph({ text: doc.title, heading: HeadingLevel.TITLE }));

  const meta: string[] = [];
  if (doc.author_name) meta.push(`Author: ${doc.author_name}`);
  meta.push(`Format: ${doc.format}`);
  if (meta.length) {
    paras.push(new Paragraph({ children: [new TextRun({ text: meta.join('   •   '), italics: true })] }));
  }

  if (doc.summary) {
    paras.push(new Paragraph({ text: doc.summary, spacing: { after: 200 } }));
  }

  const sections: DocumentSection[] = doc.content ?? [];

  sections.forEach((section, idx) => {
    if (section.heading) {
      paras.push(new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_2 }));
    }

    if (doc.format === 'procedure' && (section.desc || section.content)) {
      paras.push(
        new Paragraph({
          text: `${idx + 1}. ${section.desc ?? section.content}`,
          spacing: { after: 80 },
        })
      );
    } else if (section.content) {
      paras.push(new Paragraph({ text: section.content, spacing: { after: 80 } }));
    } else if (section.desc) {
      paras.push(new Paragraph({ text: section.desc, spacing: { after: 80 } }));
    }

    (section.items ?? []).forEach((item) => {
      if (doc.format === 'checklist') {
        paras.push(new Paragraph({ text: `☐ ${item}`, spacing: { after: 40 } }));
      } else {
        paras.push(new Paragraph({ text: item, bullet: { level: 0 } }));
      }
    });
  });

  if (doc.format === 'diagram' && doc.diagram_data?.description) {
    paras.push(new Paragraph({ text: 'System description', heading: HeadingLevel.HEADING_2 }));
    paras.push(new Paragraph({ text: doc.diagram_data.description }));
  }

  if (doc.warnings && doc.warnings.length) {
    paras.push(new Paragraph({ text: 'Gaps & warnings', heading: HeadingLevel.HEADING_2 }));
    doc.warnings.forEach((w) => paras.push(new Paragraph({ text: w, bullet: { level: 0 } })));
  }

  if (doc.tags && doc.tags.length) {
    paras.push(
      new Paragraph({
        children: [new TextRun({ text: `Tags: ${doc.tags.join(', ')}`, italics: true })],
        spacing: { before: 200 },
      })
    );
  }

  return paras;
}

async function generateWord(doc: DocumentRow): Promise<Buffer> {
  const wordDoc = new Document({
    sections: [{ children: wordSections(doc) }],
  });
  return Packer.toBuffer(wordDoc);
}

// ---------------------------------------------------------------------------
// PDF export (pdfkit)
// ---------------------------------------------------------------------------

const COLOUR = {
  navy:    '#1C3A5E',
  slate:   '#475569',
  amber:   '#F59E0B',
  amberBg: '#FEF3C7',
  grey:    '#94A3B8',
} as const;

const MARGIN = { top: 72, bottom: 72, left: 56, right: 56 } as const;
const PAGE_WIDTH    = 595.28; // A4 pts
const PAGE_HEIGHT   = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN.left - MARGIN.right;
const HEADER_Y      = 20;
const FOOTER_Y      = PAGE_HEIGHT - 50;

function drawPageDecorations(
  pdf: PDFKit.PDFDocument,
  pageNumber: number,
  totalPages: number,
  docTitle: string,
  authorName: string,
): void {
  pdf.save();

  // Header separator line
  pdf
    .moveTo(MARGIN.left, HEADER_Y + 16)
    .lineTo(PAGE_WIDTH - MARGIN.right, HEADER_Y + 16)
    .strokeColor(COLOUR.navy)
    .lineWidth(0.5)
    .stroke();

  // Header left: "Lore" logotype
  pdf.font('Helvetica-Bold').fontSize(11).fillColor(COLOUR.navy)
    .text('Lore', MARGIN.left, HEADER_Y, { lineBreak: false });

  // Header right: document title
  pdf.font('Helvetica').fontSize(9).fillColor(COLOUR.slate)
    .text(docTitle, MARGIN.left, HEADER_Y, { width: CONTENT_WIDTH, align: 'right', lineBreak: false });

  // Footer separator line
  pdf
    .moveTo(MARGIN.left, FOOTER_Y - 6)
    .lineTo(PAGE_WIDTH - MARGIN.right, FOOTER_Y - 6)
    .strokeColor(COLOUR.grey)
    .lineWidth(0.5)
    .stroke();

  // Footer centre: page number
  pdf.font('Helvetica').fontSize(8).fillColor(COLOUR.slate)
    .text(`Page ${pageNumber} of ${totalPages}`, MARGIN.left, FOOTER_Y, {
      width: CONTENT_WIDTH,
      align: 'center',
      lineBreak: false,
    });

  // Footer right: author / org name
  if (authorName) {
    pdf.font('Helvetica').fontSize(8).fillColor(COLOUR.slate)
      .text(authorName, MARGIN.left, FOOTER_Y, {
        width: CONTENT_WIDTH,
        align: 'right',
        lineBreak: false,
      });
  }

  pdf.restore();
}

function drawSectionHeading(pdf: PDFKit.PDFDocument, text: string): void {
  pdf.font('Helvetica-Bold').fontSize(14).fillColor(COLOUR.navy).text(text);
  const ruleY = pdf.y + 2;
  pdf
    .moveTo(MARGIN.left, ruleY)
    .lineTo(MARGIN.left + CONTENT_WIDTH, ruleY)
    .strokeColor(COLOUR.navy)
    .lineWidth(0.5)
    .stroke();
  pdf.moveDown(0.4);
}

function drawWarningsBox(pdf: PDFKit.PDFDocument, warnings: string[]): void {
  const innerWidth = CONTENT_WIDTH - 18;

  // Compute box height precisely using heightOfString for each item
  const headingHeight = pdf.heightOfString('Gaps & Warnings', { width: innerWidth });
  const warningHeights = warnings.map((w) =>
    pdf.heightOfString(`• ${w}`, { width: innerWidth })
  );
  const totalWarningHeight = warningHeights.reduce((a, b) => a + b, 0);
  const boxPadding = 10;
  const boxHeight = boxPadding + headingHeight + 6 + totalWarningHeight + boxPadding;

  // If the box won't fit on remaining page, start a new page
  const spaceLeft = PAGE_HEIGHT - MARGIN.bottom - pdf.y;
  if (spaceLeft < boxHeight) {
    pdf.addPage();
  }

  const boxX = MARGIN.left;
  const boxY = pdf.y;

  // Amber background
  pdf.rect(boxX, boxY, CONTENT_WIDTH, boxHeight).fillColor(COLOUR.amberBg).fill();

  // Left accent bar
  pdf.rect(boxX, boxY, 4, boxHeight).fillColor(COLOUR.amber).fill();

  // Heading
  pdf.font('Helvetica-Bold').fontSize(12).fillColor(COLOUR.amber)
    .text('Gaps & Warnings', boxX + 14, boxY + boxPadding, { width: innerWidth, lineBreak: false });

  // Warning items — continue from cursor after heading
  pdf.moveDown(0.5);
  pdf.font('Helvetica').fontSize(10).fillColor(COLOUR.slate);
  warnings.forEach((w) => {
    pdf.text(`• ${w}`, { width: innerWidth, indent: 0 });
  });

  pdf.moveDown(0.6);
}

function generatePdf(doc: DocumentRow): Promise<Buffer> {
  return new Promise((resolve, reject) => {
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

    // ---- Page 1 content ----

    // Title
    pdf.font('Helvetica-Bold').fontSize(26).fillColor(COLOUR.navy).text(doc.title);
    pdf.moveDown(0.3);

    // Metadata line
    const metaParts: string[] = [];
    if (doc.author_name) metaParts.push(`Author: ${doc.author_name}`);
    metaParts.push(`Format: ${doc.format}`);
    metaParts.push(new Date(doc.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' }));
    pdf.font('Helvetica-Oblique').fontSize(9).fillColor(COLOUR.slate)
      .text(metaParts.join('   •   '));
    pdf.moveDown(0.6);

    // Summary
    if (doc.summary) {
      pdf.font('Helvetica').fontSize(11).fillColor(COLOUR.slate)
        .text(doc.summary, { lineGap: 3 });
      pdf.moveDown(0.8);
    }

    // Sections
    const sections: DocumentSection[] = doc.content ?? [];
    sections.forEach((section, idx) => {
      if (section.heading) {
        drawSectionHeading(pdf, section.heading);
      }

      const body =
        doc.format === 'procedure'
          ? section.desc ?? section.content
          : section.content ?? section.desc;

      if (body) {
        const prefix = doc.format === 'procedure' ? `${idx + 1}. ` : '';
        pdf.font('Helvetica').fontSize(11).fillColor(COLOUR.slate)
          .text(`${prefix}${body}`, { lineGap: 3 });
        pdf.moveDown(0.3);
      }

      (section.items ?? []).forEach((item) => {
        const bullet = doc.format === 'checklist' ? '☐ ' : '• ';
        pdf.font('Helvetica').fontSize(11).fillColor(COLOUR.slate)
          .text(`${bullet}${item}`, { indent: 14, lineGap: 2 });
      });

      pdf.moveDown(0.5);
    });

    // Diagram description
    if (doc.format === 'diagram' && doc.diagram_data?.description) {
      drawSectionHeading(pdf, 'System Description');
      pdf.font('Helvetica').fontSize(11).fillColor(COLOUR.slate)
        .text(doc.diagram_data.description, { lineGap: 3 });
      pdf.moveDown(0.5);
    }

    // Gaps & warnings
    if (doc.warnings && doc.warnings.length > 0) {
      drawWarningsBox(pdf, doc.warnings);
    }

    // Tags
    if (doc.tags && doc.tags.length > 0) {
      pdf.font('Helvetica-Oblique').fontSize(9).fillColor(COLOUR.grey)
        .text(`Tags: ${doc.tags.join(', ')}`);
    }

    // ---- Post-pass: draw headers and footers on every buffered page ----
    const { count: totalPages } = pdf.bufferedPageRange();
    for (let i = 0; i < totalPages; i++) {
      pdf.switchToPage(i);
      drawPageDecorations(pdf, i + 1, totalPages, doc.title, doc.author_name ?? '');
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

export async function exportDocument(doc: DocumentRow, format: ExportFormat): Promise<ExportResult> {
  const base = safeFilename(doc.title);
  if (format === 'word') {
    return {
      buffer: await generateWord(doc),
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename: `${base}.docx`,
    };
  }
  return {
    buffer: await generatePdf(doc),
    contentType: 'application/pdf',
    filename: `${base}.pdf`,
  };
}
