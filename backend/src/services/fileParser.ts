import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

export class FileParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileParseError';
  }
}

/**
 * Extracts plain text from an uploaded file buffer based on its mime type /
 * filename. Supports .txt, .docx and .pdf.
 */
export async function extractText(
  buffer: Buffer,
  filename: string,
  mimetype: string
): Promise<string> {
  const lower = filename.toLowerCase();

  try {
    if (lower.endsWith('.txt') || mimetype === 'text/plain') {
      return buffer.toString('utf-8').trim();
    }

    if (
      lower.endsWith('.docx') ||
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const { value } = await mammoth.extractRawText({ buffer });
      return value.trim();
    }

    if (lower.endsWith('.pdf') || mimetype === 'application/pdf') {
      const data = await pdfParse(buffer);
      return (data.text ?? '').trim();
    }

    throw new FileParseError(
      `Unsupported file type "${filename}". Only .txt, .docx and .pdf are supported.`
    );
  } catch (err) {
    if (err instanceof FileParseError) throw err;
    console.error('File parse error:', err);
    throw new FileParseError(
      `Could not extract text from "${filename}". The file may be corrupt or password-protected.`
    );
  }
}
