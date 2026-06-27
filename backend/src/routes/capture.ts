import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { structureNotes } from '../services/gemini';
import { estimateCreditCost, finalCreditCost, hasCredits, deductCredits } from '../services/credits';
import { supabaseAdmin } from '../lib/supabase';
import { logger } from '../lib/logger';

const router = Router();

const MIN_WORDS = 20;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * POST /api/capture
 * Body: { title, author?, rawText, sourceFilePath? }
 * Structures the notes via Gemini, persists the document scoped to the user's
 * org, and returns the saved row.
 */
router.post('/capture', requireAuth, async (req, res) => {
  const { userId, orgId } = req.auth!;
  const title = (req.body?.title ?? '').trim();
  const author = (req.body?.author ?? '').trim();
  const rawText = (req.body?.rawText ?? '').toString();
  const sourceFilePath = req.body?.sourceFilePath ?? null;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (wordCount(rawText) < MIN_WORDS) {
    return res
      .status(400)
      .json({ error: `Input is too short. Please provide at least ${MIN_WORDS} words.` });
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

    const { data: draftData, error: draftError } = await supabaseAdmin
      .from('documents')
      .insert({
        org_id: orgId,
        created_by: userId,
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
      })
      .select('id')
      .single();

    if (draftError || !draftData) {
      logger.error('Draft save failed during graceful degradation', {
        route: 'POST /api/capture',
        errorType: 'SupabaseInsertError',
      });
      return res.status(500).json({
        error: 'The AI service is unavailable and we were unable to save your content. Please try again later.',
      });
    }

    return res.status(200).json({
      degraded: true,
      documentId: draftData.id,
      message:
        "We couldn't connect to the AI service — your content has been saved as a draft. You can retry structuring it from your document library.",
    });
  }

  const { data, error } = await supabaseAdmin
    .from('documents')
    .insert({
      org_id: orgId,
      created_by: userId,
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
    })
    .select('*')
    .single();

  if (error) {
    logger.error('Document insert failed', { route: 'POST /api/capture', errorType: 'SupabaseInsertError' });
    return res.status(500).json({ error: 'Failed to save document' });
  }

  // Deduct credits based on the actual output format (diagram costs more).
  const actualCost = finalCreditCost(structured.format, rawText);
  try {
    await deductCredits(orgId, userId, actualCost, data.id);
  } catch (creditErr) {
    // Non-fatal: document is already saved. Log and continue.
    logger.error('Credit deduction failed after successful capture', {
      route: 'POST /api/capture',
      errorType: 'CreditDeductionError',
    });
  }

  res.status(201).json(data);
});

export default router;
