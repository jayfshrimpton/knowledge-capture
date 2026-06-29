import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY environment variable.');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

export { TaskType };

/**
 * Builds a single string to embed for a document.
 * Combines title, summary, and raw_input (capped at 4000 chars to stay
 * within text-embedding-004's 2048-token limit).
 */
export function buildDocumentText(doc: {
  title: string;
  summary?: string | null;
  raw_input?: string | null;
}): string {
  const parts: string[] = [doc.title];
  if (doc.summary) parts.push(doc.summary);
  if (doc.raw_input) parts.push(doc.raw_input.slice(0, 4000));
  return parts.join('\n\n');
}

/**
 * Generates a 768-dimensional embedding vector via Gemini text-embedding-004.
 * Use TaskType.RETRIEVAL_DOCUMENT when embedding stored content, and
 * TaskType.RETRIEVAL_QUERY when embedding a search query or question.
 */
export async function generateEmbedding(
  text: string,
  taskType: TaskType = TaskType.RETRIEVAL_QUERY,
): Promise<number[]> {
  const result = await embeddingModel.embedContent({
    content: { role: 'user', parts: [{ text }] },
    taskType,
  });
  return result.embedding.values;
}
