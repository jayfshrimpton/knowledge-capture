import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — must be hoisted before the imports they replace.
// ---------------------------------------------------------------------------

vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(),
  },
}));

vi.mock('pdf-parse', () => ({
  default: vi.fn(),
}));

import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { extractText, FileParseError } from './fileParser';

const mockMammoth = vi.mocked(mammoth.extractRawText);
const mockPdfParse = vi.mocked(pdfParse);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Plain text
// ---------------------------------------------------------------------------

describe('extractText — .txt', () => {
  it('returns buffer content as UTF-8 string', async () => {
    const buf = Buffer.from('  Hello world  ', 'utf-8');
    const result = await extractText(buf, 'notes.txt', 'text/plain');
    expect(result).toBe('Hello world');
  });

  it('also accepts text/plain mime with non-.txt extension', async () => {
    const buf = Buffer.from('plain text', 'utf-8');
    const result = await extractText(buf, 'readme', 'text/plain');
    expect(result).toBe('plain text');
  });
});

// ---------------------------------------------------------------------------
// Word documents
// ---------------------------------------------------------------------------

describe('extractText — .docx', () => {
  it('calls mammoth and returns trimmed extracted text', async () => {
    mockMammoth.mockResolvedValueOnce({ value: '  Document content.  ', messages: [] });
    const result = await extractText(Buffer.alloc(10), 'report.docx', 'application/octet-stream');
    expect(mockMammoth).toHaveBeenCalledOnce();
    expect(result).toBe('Document content.');
  });

  it('accepts the official Word mime type', async () => {
    mockMammoth.mockResolvedValueOnce({ value: 'Word doc', messages: [] });
    const mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const result = await extractText(Buffer.alloc(10), 'file.bin', mime);
    expect(result).toBe('Word doc');
  });

  it('wraps mammoth errors in FileParseError', async () => {
    mockMammoth.mockRejectedValueOnce(new Error('mammoth internal error'));
    await expect(extractText(Buffer.alloc(10), 'bad.docx', 'application/octet-stream')).rejects.toBeInstanceOf(
      FileParseError
    );
  });
});

// ---------------------------------------------------------------------------
// PDF documents
// ---------------------------------------------------------------------------

describe('extractText — .pdf', () => {
  it('calls pdf-parse and returns text', async () => {
    mockPdfParse.mockResolvedValueOnce({ text: 'PDF content here', numpages: 1, numrender: 1, info: {}, metadata: null, version: '1' } as any);
    const result = await extractText(Buffer.alloc(10), 'scan.pdf', 'application/pdf');
    expect(mockPdfParse).toHaveBeenCalledOnce();
    expect(result).toBe('PDF content here');
  });

  it('handles null text from pdf-parse', async () => {
    mockPdfParse.mockResolvedValueOnce({ text: null, numpages: 0, numrender: 0, info: {}, metadata: null, version: '1' } as any);
    const result = await extractText(Buffer.alloc(10), 'empty.pdf', 'application/pdf');
    expect(result).toBe('');
  });

  it('wraps pdf-parse errors in FileParseError', async () => {
    mockPdfParse.mockRejectedValueOnce(new Error('corrupt PDF'));
    await expect(extractText(Buffer.alloc(10), 'corrupt.pdf', 'application/pdf')).rejects.toBeInstanceOf(
      FileParseError
    );
  });
});

// ---------------------------------------------------------------------------
// Unsupported types
// ---------------------------------------------------------------------------

describe('extractText — unsupported types', () => {
  it('throws FileParseError for unknown extension', async () => {
    const err = await extractText(Buffer.alloc(10), 'data.csv', 'text/csv').catch((e) => e);
    expect(err).toBeInstanceOf(FileParseError);
    expect(err.message).toContain('data.csv');
  });

  it('throws FileParseError for an Excel file', async () => {
    await expect(
      extractText(Buffer.alloc(10), 'spreadsheet.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    ).rejects.toBeInstanceOf(FileParseError);
  });
});
