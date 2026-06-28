import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @google/generative-ai before importing the module under test.
// The module throws at import time if GEMINI_API_KEY is missing — setup.ts
// already provides it via process.env.
//
// vi.hoisted() is required because vi.mock() is hoisted above const
// declarations, so mockGenerateContent must be created before the mock runs.
// ---------------------------------------------------------------------------

const mockGenerateContent = vi.hoisted(() => vi.fn());

// Must use `function` (not arrow) so `new GoogleGenerativeAI()` works in ES6+.
vi.mock('@google/generative-ai', () => ({
  // eslint-disable-next-line prefer-arrow-callback
  GoogleGenerativeAI: vi.fn(function (this: Record<string, unknown>) {
    this.getGenerativeModel = () => ({ generateContent: mockGenerateContent });
  }),
}));

// Also mock the retry helper so tests are deterministic and fast.
vi.mock('../lib/retry', () => ({
  withRetry: vi.fn((fn: () => unknown) => fn()),
}));

import { structureNotes } from './gemini';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wraps a JSON object as a fake Gemini response. */
function geminiResponse(obj: unknown) {
  return { response: { text: () => JSON.stringify(obj) } };
}

/** Minimal valid Gemini payload. */
const VALID_PAYLOAD = {
  format: 'procedure',
  summary: 'How to do the thing.',
  sections: [{ heading: 'Step 1', desc: 'Press the button.' }],
  diagram: null,
  warnings: ['Check the manual.'],
  tags: ['procedure', 'safety'],
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe('structureNotes — happy path', () => {
  it('returns a normalised StructuredDocument for a valid response', async () => {
    mockGenerateContent.mockResolvedValueOnce(geminiResponse(VALID_PAYLOAD));

    const result = await structureNotes('Test Doc', 'Alice', 'Some raw notes about the process here.');

    expect(result.format).toBe('procedure');
    expect(result.summary).toBe('How to do the thing.');
    expect(result.sections).toHaveLength(1);
    expect(result.warnings).toEqual(['Check the manual.']);
    expect(result.tags).toEqual(['procedure', 'safety']);
    expect(result.diagram).toBeNull();
  });

  it('preserves diagram data for diagram format', async () => {
    const diagramPayload = {
      ...VALID_PAYLOAD,
      format: 'diagram',
      diagram: {
        description: 'Network layout',
        nodes: [{ id: 'n1', label: 'Router', type: 'network' }],
        connections: [],
      },
    };
    mockGenerateContent.mockResolvedValueOnce(geminiResponse(diagramPayload));

    const result = await structureNotes('Network', 'Bob', 'The router connects everything in the office.');
    expect(result.format).toBe('diagram');
    expect(result.diagram).not.toBeNull();
    expect(result.diagram!.nodes).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// normalise() edge cases — tested via structureNotes output
// ---------------------------------------------------------------------------

describe('structureNotes — normalise edge cases', () => {
  it('defaults unknown format to "reference"', async () => {
    mockGenerateContent.mockResolvedValueOnce(
      geminiResponse({ ...VALID_PAYLOAD, format: 'unknown_type' })
    );
    const result = await structureNotes('X', 'Y', 'some notes about things');
    expect(result.format).toBe('reference');
  });

  it('defaults missing sections to []', async () => {
    mockGenerateContent.mockResolvedValueOnce(
      geminiResponse({ ...VALID_PAYLOAD, sections: undefined })
    );
    const result = await structureNotes('X', 'Y', 'some notes about things');
    expect(result.sections).toEqual([]);
  });

  it('defaults missing warnings to []', async () => {
    mockGenerateContent.mockResolvedValueOnce(
      geminiResponse({ ...VALID_PAYLOAD, warnings: undefined })
    );
    const result = await structureNotes('X', 'Y', 'some notes about things');
    expect(result.warnings).toEqual([]);
  });

  it('defaults missing tags to []', async () => {
    mockGenerateContent.mockResolvedValueOnce(
      geminiResponse({ ...VALID_PAYLOAD, tags: undefined })
    );
    const result = await structureNotes('X', 'Y', 'some notes about things');
    expect(result.tags).toEqual([]);
  });

  it('sets diagram to null for non-diagram format even if diagram data present', async () => {
    mockGenerateContent.mockResolvedValueOnce(
      geminiResponse({
        ...VALID_PAYLOAD,
        format: 'checklist',
        diagram: { nodes: [], connections: [] },
      })
    );
    const result = await structureNotes('X', 'Y', 'some notes about things');
    expect(result.format).toBe('checklist');
    expect(result.diagram).toBeNull();
  });

  it('handles a completely empty response object with defaults', async () => {
    mockGenerateContent.mockResolvedValueOnce(geminiResponse({}));
    const result = await structureNotes('X', 'Y', 'some notes about things');
    expect(result.format).toBe('reference');
    expect(result.sections).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.tags).toEqual([]);
    expect(result.diagram).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Retry logic
// ---------------------------------------------------------------------------

describe('structureNotes — retry on JSON parse failure', () => {
  it('retries with a stricter prompt when the first response is invalid JSON', async () => {
    // First call returns garbage; second call returns valid JSON.
    mockGenerateContent
      .mockResolvedValueOnce({ response: { text: () => 'not valid json }{' } })
      .mockResolvedValueOnce(geminiResponse(VALID_PAYLOAD));

    const result = await structureNotes('X', 'Y', 'some notes about the process here');
    expect(result.format).toBe('procedure');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('throws after both attempts fail with SyntaxError', async () => {
    mockGenerateContent.mockResolvedValue({ response: { text: () => 'not json' } });

    await expect(structureNotes('X', 'Y', 'some notes about the process here')).rejects.toThrow();
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('does not retry on a non-SyntaxError (network/API failure)', async () => {
    const apiError = new Error('503 Service Unavailable');
    mockGenerateContent.mockRejectedValue(apiError);

    await expect(structureNotes('X', 'Y', 'some notes about the process here')).rejects.toThrow(
      '503 Service Unavailable'
    );
    // Only one call — no retry for non-SyntaxError
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });
});
