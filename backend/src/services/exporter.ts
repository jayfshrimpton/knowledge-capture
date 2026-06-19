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

function generatePdf(doc: DocumentRow): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ margin: 56, size: 'A4' });
    const chunks: Buffer[] = [];
    pdf.on('data', (c: Buffer) => chunks.push(c));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    pdf.fontSize(22).font('Helvetica-Bold').text(doc.title);
    pdf.moveDown(0.3);

    const meta: string[] = [];
    if (doc.author_name) meta.push(`Author: ${doc.author_name}`);
    meta.push(`Format: ${doc.format}`);
    pdf.fontSize(9).font('Helvetica-Oblique').fillColor('#666').text(meta.join('   •   '));
    pdf.fillColor('#000');
    pdf.moveDown(0.6);

    if (doc.summary) {
      pdf.fontSize(11).font('Helvetica').text(doc.summary);
      pdf.moveDown(0.6);
    }

    const sections: DocumentSection[] = doc.content ?? [];
    sections.forEach((section, idx) => {
      if (section.heading) {
        pdf.fontSize(14).font('Helvetica-Bold').text(section.heading);
        pdf.moveDown(0.2);
      }

      const body = doc.format === 'procedure' ? section.desc ?? section.content : section.content ?? section.desc;
      if (body) {
        const prefix = doc.format === 'procedure' ? `${idx + 1}. ` : '';
        pdf.fontSize(11).font('Helvetica').text(`${prefix}${body}`);
        pdf.moveDown(0.2);
      }

      (section.items ?? []).forEach((item) => {
        const bullet = doc.format === 'checklist' ? '☐ ' : '• ';
        pdf.fontSize(11).font('Helvetica').text(`${bullet}${item}`, { indent: 12 });
      });

      pdf.moveDown(0.4);
    });

    if (doc.format === 'diagram' && doc.diagram_data?.description) {
      pdf.fontSize(14).font('Helvetica-Bold').text('System description');
      pdf.moveDown(0.2);
      pdf.fontSize(11).font('Helvetica').text(doc.diagram_data.description);
      pdf.moveDown(0.4);
    }

    if (doc.warnings && doc.warnings.length) {
      pdf.fontSize(14).font('Helvetica-Bold').fillColor('#b45309').text('Gaps & warnings');
      pdf.fillColor('#000');
      pdf.moveDown(0.2);
      doc.warnings.forEach((w) => pdf.fontSize(11).font('Helvetica').text(`• ${w}`, { indent: 12 }));
      pdf.moveDown(0.4);
    }

    if (doc.tags && doc.tags.length) {
      pdf.fontSize(9).font('Helvetica-Oblique').fillColor('#666').text(`Tags: ${doc.tags.join(', ')}`);
    }

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
