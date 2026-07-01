import { GoogleGenerativeAI } from '@google/generative-ai';
import { StructuredDocument, DocumentFormat } from '../types';
import { withRetry } from '../lib/retry';

// ---------------------------------------------------------------------------
// Q&A model — used by answerQuestion(), separate from the structuring model
// ---------------------------------------------------------------------------

const QA_SYSTEM_PROMPT = `You are answering questions based on documents from a knowledge base.
Answer ONLY using information present in the provided documents.
If the documents don't contain enough information to answer the question, say so clearly.
Return ONLY valid JSON matching this schema:
{ "answer": "your answer here", "cited_ids": ["doc-uuid-1", "doc-uuid-2"] }
cited_ids must contain only the IDs of documents that directly support your answer.`;

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

const qaModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-lite',
  systemInstruction: QA_SYSTEM_PROMPT,
  generationConfig: {
    responseMimeType: 'application/json',
    maxOutputTokens: 2000,
    temperature: 0.3,
  },
});

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-lite',
  systemInstruction: SYSTEM_PROMPT,
  generationConfig: {
    responseMimeType: 'application/json',
    maxOutputTokens: 4000,
    temperature: 0.2,
  },
});

// ---------------------------------------------------------------------------
// Brand-style inference — used as a fallback when a reference document has no
// machine-readable theme (e.g. a PDF or plain-text upload). The model infers a
// professional palette and font choices from the document's tone and industry.
// ---------------------------------------------------------------------------

const BRAND_SYSTEM_PROMPT = `You are a brand designer. Given the text of a company document, infer the visual brand style it was most likely produced with.
Consider the industry, tone, and any colour/brand words in the text.
Return ONLY valid JSON, no markdown, matching this exact schema:
{
  "fonts": { "heading": "Font name", "body": "Font name" },
  "colors": { "primary": "#RRGGBB", "secondary": "#RRGGBB", "accent": "#RRGGBB", "text": "#RRGGBB" },
  "structure": { "numberedSections": true, "headingRule": true }
}
Rules:
- Colours must be valid 6-digit hex strings.
- "primary" is the main brand colour (headings/title); "text" is the body colour (usually near-black); "accent" is a highlight colour distinct from primary.
- Prefer common, safe office fonts (e.g. Calibri, Arial, Helvetica, Georgia, Times New Roman).
- This is a best-effort inference from text alone; choose a coherent, professional palette.`;

const brandModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-lite',
  systemInstruction: BRAND_SYSTEM_PROMPT,
  generationConfig: {
    responseMimeType: 'application/json',
    maxOutputTokens: 500,
    temperature: 0.4,
  },
});

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Infers a partial brand style (fonts, colours, structure) from document text.
 * Returns only the fields the model produced in a valid shape; the caller merges
 * these over sensible defaults. Never throws — on any failure returns {}.
 */
export async function inferBrandStyle(rawText: string): Promise<{
  fonts?: { heading: string; body: string };
  colors?: { primary: string; secondary: string; accent: string; text: string };
  structure?: { numberedSections: boolean; headingRule: boolean };
}> {
  try {
    const prompt = `Document text (first 4000 chars):\n${rawText.slice(0, 4000)}`;
    const result = await withRetry(() => brandModel.generateContent(prompt), {
      attempts: 2,
      initialDelayMs: 400,
    });
    const parsed = JSON.parse(result.response.text());

    const out: Awaited<ReturnType<typeof inferBrandStyle>> = {};

    if (parsed?.fonts && typeof parsed.fonts.heading === 'string' && typeof parsed.fonts.body === 'string') {
      out.fonts = { heading: parsed.fonts.heading, body: parsed.fonts.body };
    }

    const c = parsed?.colors;
    if (
      c &&
      HEX_RE.test(c.primary) &&
      HEX_RE.test(c.secondary) &&
      HEX_RE.test(c.accent) &&
      HEX_RE.test(c.text)
    ) {
      out.colors = { primary: c.primary, secondary: c.secondary, accent: c.accent, text: c.text };
    }

    if (parsed?.structure) {
      out.structure = {
        numberedSections: parsed.structure.numberedSections !== false,
        headingRule: parsed.structure.headingRule !== false,
      };
    }

    return out;
  } catch (err) {
    console.warn('Brand style inference failed; falling back to defaults.');
    return {};
  }
}

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
 * Answers a question using the top-k retrieved documents as context.
 * Returns the answer text and the IDs of documents that supported it.
 */
export async function answerQuestion(
  question: string,
  docs: Array<{ id: string; title: string; summary: string | null; raw_input: string | null }>,
): Promise<{ answer: string; cited_ids: string[] }> {
  const contextParts = docs.map((doc, i) => {
    const excerpt = (doc.raw_input ?? doc.summary ?? '').slice(0, 1500);
    const summaryLine = doc.summary ? `Summary: ${doc.summary}\n` : '';
    return `Document ${i + 1} (ID: ${doc.id})\nTitle: ${doc.title}\n${summaryLine}Content:\n${excerpt}`;
  });

  const prompt =
    `Question: ${question}\n\nAvailable documents:\n---\n` +
    contextParts.join('\n\n---\n') +
    '\n---\n\nReturn JSON with "answer" and "cited_ids".';

  const result = await qaModel.generateContent(prompt);
  const raw = result.response.text();
  const parsed = JSON.parse(raw);

  return {
    answer: typeof parsed.answer === 'string' ? parsed.answer : 'Unable to generate an answer.',
    cited_ids: Array.isArray(parsed.cited_ids)
      ? parsed.cited_ids.filter((id: unknown) => typeof id === 'string')
      : [],
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
