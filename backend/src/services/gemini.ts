import { GoogleGenerativeAI } from '@google/generative-ai';
import { StructuredDocument, DocumentFormat } from '../types';
import { withRetry } from '../lib/retry';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY environment variable.');
}

export const SYSTEM_PROMPT = `You are a knowledge capture assistant for engineering and construction businesses in Australia.

Your job is to take rough notes, brain dumps, emails, or informal descriptions written by engineers, technicians, or operations staff — and convert them into well-structured internal documentation.

Analyse the input and choose the BEST output format:
- "procedure" — ordered steps that must be followed in sequence
- "checklist" — tasks to complete or verify, not strictly sequential
- "diagram" — system/network architecture, relationships between components, physical layouts
- "reference" — policies, role descriptions, thresholds, non-sequential reference information

Return ONLY valid JSON matching this exact schema. No markdown, no preamble, no explanation outside the JSON.

{
  "format": "procedure | checklist | diagram | reference",
  "summary": "One sentence describing what this document covers.",
  "sections": [
    {
      "heading": "Section heading",
      "content": "Prose content (for procedure/reference sections)",
      "desc": "Step description (for procedure steps)",
      "items": ["item 1", "item 2"]
    }
  ],
  "diagram": {
    "description": "Plain text description of the system/network for the text tab",
    "nodes": [
      { "id": "n1", "label": "Node label", "type": "device | network | process | role | data" }
    ],
    "connections": [
      { "from": "n1", "to": "n2", "label": "" }
    ]
  },
  "warnings": ["Gap or assumption 1", "Gap or assumption 2"],
  "tags": ["tag1", "tag2"]
}

Rules:
- Use Australian English spelling
- Do not invent information not present in the input
- Keep sections concise and practical
- For diagram format: still populate sections with a text description of the system
- For non-diagram formats: set diagram to null
- warnings should flag missing info, unstated assumptions, or things the author should verify
- tags should be 3–6 lowercase keywords`;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-lite',
  systemInstruction: SYSTEM_PROMPT,
  generationConfig: {
    responseMimeType: 'application/json',
    maxOutputTokens: 4000,
    temperature: 0.2,
  },
});

const VALID_FORMATS: DocumentFormat[] = ['procedure', 'checklist', 'diagram', 'reference'];

function buildUserPrompt(title: string, author: string, rawText: string): string {
  return `Title: ${title}\nAuthor: ${author}\n\nNotes:\n${rawText}`;
}

/** Coerce the parsed object into a valid StructuredDocument, filling defaults. */
function normalise(parsed: any): StructuredDocument {
  const format: DocumentFormat = VALID_FORMATS.includes(parsed?.format)
    ? parsed.format
    : 'reference';

  return {
    format,
    summary: typeof parsed?.summary === 'string' ? parsed.summary : '',
    sections: Array.isArray(parsed?.sections) ? parsed.sections : [],
    diagram: format === 'diagram' && parsed?.diagram ? parsed.diagram : null,
    warnings: Array.isArray(parsed?.warnings) ? parsed.warnings : [],
    tags: Array.isArray(parsed?.tags) ? parsed.tags : [],
  };
}

/**
 * Sends the raw notes to Gemini and returns a normalised StructuredDocument.
 * Retries once with a stricter instruction if the first response fails to parse.
 */
export async function structureNotes(
  title: string,
  author: string,
  rawText: string
): Promise<StructuredDocument> {
  const basePrompt = buildUserPrompt(title, author, rawText);

  const attempt = async (prompt: string): Promise<StructuredDocument> => {
    const result = await withRetry(() => model.generateContent(prompt), {
      attempts: 3,
      initialDelayMs: 500,
    });
    const raw = result.response.text();
    const parsed = JSON.parse(raw); // SyntaxError propagates out naturally
    return normalise(parsed);
  };

  try {
    return await attempt(basePrompt);
  } catch (firstErr) {
    if (!(firstErr instanceof SyntaxError)) {
      throw firstErr; // Network/API error after all retries — propagate to caller
    }
    console.warn('Gemini JSON parse failed on first attempt, retrying with stricter prompt...');
    const stricter = `${basePrompt}\n\nIMPORTANT: Return only valid JSON, no other text.`;
    return await attempt(stricter);
  }
}
