import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { structureNotes } from '../services/gemini';
import { generateEmbedding, buildDocumentText, TaskType } from '../services/embeddings';
import { estimateCreditCost, finalCreditCost, hasCredits, deductCredits } from '../services/credits';
import { supabaseAdmin } from '../lib/supabase';
import { contentToText } from '../lib/contentToText';
import { logger } from '../lib/logger';
import { DocumentRow } from '../types';

const router = Router();

const MIN_WORDS = 20;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function snapshotVersion(doc: DocumentRow, userId: string): Promise<void> {
  const structured_content = contentToText(doc.content ?? []);
  const { error } = await supabaseAdmin.from('document_versions').insert({
    document_id: doc.id,
    version_number: doc.version,
    content: doc.content,
    structured_content,
    created_by: userId,
  });
  if (error && error.code !== '23505') {
    // 23505 = unique_violation — snapshot already exists, safe to ignore.
    logger.error('Failed to snapshot document version', {
      route: 'POST /api/capture',
      errorType: 'SupabaseInsertError',
    });
  }
}

/**
 * POST /api/capture
 * Body: { title, author?, rawText, sourceFilePath?, documentId? }
 * Structures the notes via Gemini, persists the document scoped to the user's
 * org, and returns the saved row. If documentId is provided, updates the
 * existing document (snapshotting the current content as a version first).
 */
router.post('/capture', requireAuth, requireRole('admin', 'member'), async (req, res) => {
  const { userId, orgId } = req.auth!;
  const title = (req.body?.title ?? '').trim();
  const author = (req.body?.author ?? '').trim();
  const rawText = (req.body?.rawText ?? '').toString();
  const sourceFilePath = req.body?.sourceFilePath ?? null;
  const documentId: string | null = req.body?.documentId ?? null;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (wordCount(rawText) < MIN_WORDS) {
    return res
      .status(400)
      .json({ error: `Input is too short. Please provide at least ${MIN_WORDS} words.` });
  }

  // When re-capturing an existing document, fetch and verify it first.
  let existingDoc: DocumentRow | null = null;
  if (documentId) {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('org_id', orgId)
      .maybeSingle();
    if (error) {
      logger.error('Re-capture: existing document lookup failed', { route: 'POST /api/capture' });
      return res.status(500).json({ error: 'Failed to load existing document' });
    }
    if (!data) {
      return res.status(404).json({ error: 'Document not found' });
    }
    existingDoc = data as DocumentRow;
  }

  // Check credits before calling Gemini.
  const estimatedCost = estimateCreditCost(rawText);
  try {
    const allowed = await hasCredits(orgId, estimatedCost);
    if (!allowed) {
      return res.status(402).json({
        error: 'Your organisation has reached its monthly AI credit limit. Please upgrade your plan to continue.',
        code: 'CREDITS_EXHAUSTED',
      });
    }
  } catch (creditErr) {
    logger.error('Credit check failed', { route: 'POST /api/capture', errorType: 'CreditCheckError' });
    return res.status(500).json({ error: 'Failed to check AI credit balance' });
  }

  let structured;
  try {
    structured = await structureNotes(title, author || 'Unknown', rawText);
  } catch (geminiErr) {
    logger.error('Gemini structuring failed after all retries', {
      route: 'POST /api/capture',
      errorType: geminiErr instanceof Error ? geminiErr.constructor.name : 'UnknownError',
    });

    const draftFields = {
      title,
      author_name: author || null,
      format: 'unstructured',
      status: 'draft',
      summary: null,
      content: [],
      diagram_data: null,
      warnings: ['Content could not be structured — AI service was unavailable.'],
      tags: [],
      raw_input: rawText,
      source_file_path: sourceFilePath,
      source: 'ai',
    };

    let draftId: string;

    if (existingDoc) {
      await snapshotVersion(existingDoc, userId);
      const { data: draftData, error: draftError } = await supabaseAdmin
        .from('documents')
        .update({ ...draftFields, version: existingDoc.version + 1, updated_at: new Date().toISOString() })
        .eq('id', documentId!)
        .eq('org_id', orgId)
        .select('id')
        .single();
      if (draftError || !draftData) {
        logger.error('Draft update failed during graceful degradation', { route: 'POST /api/capture' });
        return res.status(500).json({ error: 'The AI service is unavailable and we were unable to save your content. Please try again later.' });
      }
      draftId = draftData.id;
    } else {
      const { data: draftData, error: draftError } = await supabaseAdmin
        .from('documents')
        .insert({ org_id: orgId, created_by: userId, ...draftFields })
        .select('id')
        .single();
      if (draftError || !draftData) {
        logger.error('Draft save failed during graceful degradation', { route: 'POST /api/capture' });
        return res.status(500).json({ error: 'The AI service is unavailable and we were unable to save your content. Please try again later.' });
      }
      draftId = draftData.id;
    }

    return res.status(200).json({
      degraded: true,
      documentId: draftId,
      message:
        "We couldn't connect to the AI service — your content has been saved as a draft. You can retry structuring it from your document library.",
    });
  }

  const structuredFields = {
    title,
    author_name: author || null,
    format: structured.format,
    summary: structured.summary,
    content: structured.sections,
    diagram_data: structured.diagram,
    warnings: structured.warnings,
    tags: structured.tags,
    raw_input: rawText,
    source_file_path: sourceFilePath,
  };

  let savedDoc: DocumentRow;

  if (existingDoc) {
    await snapshotVersion(existingDoc, userId);
    const { data, error } = await supabaseAdmin
      .from('documents')
      .update({ ...structuredFields, version: existingDoc.version + 1, updated_at: new Date().toISOString() })
      .eq('id', documentId!)
      .eq('org_id', orgId)
      .select('*')
      .single();
    if (error || !data) {
      logger.error('Document update failed', { route: 'POST /api/capture', errorType: 'SupabaseUpdateError' });
      return res.status(500).json({ error: 'Failed to update document' });
    }
    savedDoc = data as DocumentRow;
  } else {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .insert({ org_id: orgId, created_by: userId, ...structuredFields })
      .select('*')
      .single();
    if (error || !data) {
      logger.error('Document insert failed', { route: 'POST /api/capture', errorType: 'SupabaseInsertError' });
      return res.status(500).json({ error: 'Failed to save document' });
    }
    savedDoc = data as DocumentRow;
  }

  // Generate and store embedding — non-fatal; document is already saved.
  try {
    const embText = buildDocumentText(savedDoc);
    const embedding = await generateEmbedding(embText, TaskType.RETRIEVAL_DOCUMENT);
    await supabaseAdmin
      .from('documents')
      .update({ embedding: `[${embedding.join(',')}]` })
      .eq('id', savedDoc.id);
  } catch {
    logger.warn('Embedding generation failed', { route: 'POST /api/capture', errorType: 'EmbeddingError' });
  }

  // Deduct credits based on the actual output format (diagram costs more).
  const actualCost = finalCreditCost(structured.format, rawText);
  try {
    await deductCredits(orgId, userId, actualCost, savedDoc.id);
  } catch (creditErr) {
    // Non-fatal: document is already saved. Log and continue.
    logger.error('Credit deduction failed after successful capture', {
      route: 'POST /api/capture',
      errorType: 'CreditDeductionError',
    });
  }

  res.status(existingDoc ? 200 : 201).json(savedDoc);
});

export default router;
