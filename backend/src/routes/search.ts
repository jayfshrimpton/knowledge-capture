import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { generateEmbedding, TaskType } from '../services/embeddings';
import { answerQuestion } from '../services/gemini';
import { supabaseAdmin } from '../lib/supabase';
import { logger } from '../lib/logger';

const router = Router();

/**
 * POST /api/search
 * Body: { query: string; limit?: number }
 * Embeds the query and runs cosine similarity search against stored document
 * embeddings. Returns ranked DocumentListItem-compatible results with a
 * `similarity` field (0–1).
 */
router.post('/search', requireAuth, async (req, res) => {
  const { orgId } = req.auth!;
  const query = (req.body?.query ?? '').toString().trim();
  const limit = Math.min(Math.max(parseInt(String(req.body?.limit ?? '10'), 10) || 10, 1), 20);

  if (!query) {
    return res.status(400).json({ error: 'query is required' });
  }

  let queryEmbedding: number[];
  try {
    queryEmbedding = await generateEmbedding(query, TaskType.RETRIEVAL_QUERY);
  } catch {
    logger.error('Embedding generation failed', { route: 'POST /api/search', errorType: 'EmbeddingError' });
    return res.status(500).json({ error: 'Failed to generate search embedding' });
  }

  const { data, error } = await supabaseAdmin.rpc('match_documents', {
    query_embedding: `[${queryEmbedding.join(',')}]`,
    match_threshold: 0.5,
    match_count: limit,
    p_org_id: orgId,
  });

  if (error) {
    logger.error('Vector search failed', { route: 'POST /api/search', errorType: 'SupabaseRpcError' });
    return res.status(500).json({ error: 'Search failed' });
  }

  const results = data ?? [];

  // Fire-and-forget: log query + result count for the gap dashboard.
  void (async () => {
    const { error: logError } = await supabaseAdmin
      .from('search_logs')
      .insert({ org_id: orgId, query, result_count: results.length });
    if (logError) logger.error('Search log insert failed', { route: 'POST /api/search', errorType: 'SupabaseInsertError' });
  })();

  res.json(results);
});

/**
 * POST /api/ask
 * Body: { question: string }
 * Embeds the question, retrieves the top-5 most relevant documents, passes
 * them as context to Gemini, and returns a grounded answer with source links.
 */
router.post('/ask', requireAuth, async (req, res) => {
  const { orgId } = req.auth!;
  const question = (req.body?.question ?? '').toString().trim();

  if (!question) {
    return res.status(400).json({ error: 'question is required' });
  }

  let queryEmbedding: number[];
  try {
    queryEmbedding = await generateEmbedding(question, TaskType.RETRIEVAL_QUERY);
  } catch {
    logger.error('Embedding generation failed', { route: 'POST /api/ask', errorType: 'EmbeddingError' });
    return res.status(500).json({ error: 'Failed to process question' });
  }

  const { data: matches, error: searchError } = await supabaseAdmin.rpc('match_documents', {
    query_embedding: `[${queryEmbedding.join(',')}]`,
    match_threshold: 0.4,
    match_count: 5,
    p_org_id: orgId,
  });

  if (searchError) {
    logger.error('Vector search failed', { route: 'POST /api/ask', errorType: 'SupabaseRpcError' });
    return res.status(500).json({ error: 'Failed to retrieve relevant documents' });
  }

  const matchedDocs: Array<{ id: string; title: string; similarity: number }> = matches ?? [];

  if (matchedDocs.length === 0) {
    return res.json({
      answer:
        "I couldn't find any relevant documents to answer your question. Try capturing more content first, or rephrase your question.",
      sources: [],
    });
  }

  // Fetch full raw_input for context — only the columns needed for Gemini.
  const docIds = matchedDocs.map((d) => d.id);
  const { data: fullDocs, error: docsError } = await supabaseAdmin
    .from('documents')
    .select('id, title, summary, raw_input')
    .in('id', docIds)
    .eq('org_id', orgId);

  if (docsError) {
    logger.error('Document fetch failed for ask', { route: 'POST /api/ask', errorType: 'SupabaseSelectError' });
    return res.status(500).json({ error: 'Failed to retrieve document content' });
  }

  let answer: string;
  let citedIds: string[];

  try {
    const result = await answerQuestion(question, fullDocs ?? []);
    answer = result.answer;
    citedIds = result.cited_ids;
  } catch {
    logger.error('Answer generation failed', { route: 'POST /api/ask', errorType: 'GeminiError' });
    return res.status(500).json({ error: 'Failed to generate answer' });
  }

  // Only surface documents that Gemini explicitly cited.
  const sources = matchedDocs
    .filter((d) => citedIds.includes(d.id))
    .map((d) => ({ id: d.id, title: d.title, similarity: d.similarity }));

  res.json({ answer, sources });
});

export default router;
