import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @google/generative-ai before importing the module under test.
// setup.ts already provides GEMINI_API_KEY so the module doesn't throw.
// ---------------------------------------------------------------------------

const mockEmbedContent = vi.hoisted(() => vi.fn());

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(function (this: Record<string, unknown>) {
    this.getGenerativeModel = () => ({ embedContent: mockEmbedContent });
  }),
  TaskType: {
    RETRIEVAL_QUERY: 'RETRIEVAL_QUERY',
    RETRIEVAL_DOCUMENT: 'RETRIEVAL_DOCUMENT',
  },
}));

import { buildDocumentText, generateEmbedding, TaskType } from './embeddings';

const FAKE_VECTOR = new Array(768).fill(0.1);

beforeEach(() => {
  vi.clearAllMocks();
  mockEmbedContent.mockResolvedValue({ embedding: { values: FAKE_VECTOR } });
});

// ---------------------------------------------------------------------------
// buildDocumentText
// ---------------------------------------------------------------------------

describe('buildDocumentText', () => {
  it('returns just the title when no other fields are present', () => {
    expect(buildDocumentText({ title: 'Only Title' })).toBe('Only Title');
  });

  it('includes summary when provided', () => {
    const text = buildDocumentText({ title: 'T', summary: 'A short summary', raw_input: null });
    expect(text).toContain('A short summary');
  });

  it('includes raw_input when provided', () => {
    const text = buildDocumentText({ title: 'T', raw_input: 'Detailed notes here' });
    expect(text).toContain('Detailed notes here');
  });

  it('truncates raw_input to 4000 chars', () => {
    const longInput = 'x'.repeat(5000);
    const text = buildDocumentText({ title: 'T', raw_input: longInput });
    // The raw_input slice should be exactly 4000 chars; title + separator adds a bit more.
    expect(text.length).toBeLessThanOrEqual(4000 + 10); // 'T\n\n' = 3 chars overhead
  });

  it('omits null/undefined fields without producing extra separators', () => {
    const text = buildDocumentText({ title: 'My Doc', summary: null, raw_input: null });
    expect(text).toBe('My Doc');
  });
});

// ---------------------------------------------------------------------------
// generateEmbedding
// ---------------------------------------------------------------------------

describe('generateEmbedding', () => {
  it('returns the embedding values array from the model response', async () => {
    const result = await generateEmbedding('test query', TaskType.RETRIEVAL_QUERY);
    expect(result).toHaveLength(768);
    expect(result[0]).toBe(0.1);
  });

  it('calls embedContent with the supplied taskType', async () => {
    await generateEmbedding('doc text', TaskType.RETRIEVAL_DOCUMENT);
    expect(mockEmbedContent).toHaveBeenCalledWith(
      expect.objectContaining({ taskType: TaskType.RETRIEVAL_DOCUMENT }),
    );
  });

  it('defaults to RETRIEVAL_QUERY when no taskType supplied', async () => {
    await generateEmbedding('query');
    expect(mockEmbedContent).toHaveBeenCalledWith(
      expect.objectContaining({ taskType: TaskType.RETRIEVAL_QUERY }),
    );
  });
});
