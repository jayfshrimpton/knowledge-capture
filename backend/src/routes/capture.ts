import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { structureNotes } from '../services/gemini';
import { supabaseAdmin } from '../lib/supabase';

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

  let structured;
  try {
    structured = await structureNotes(title, author || 'Unknown', rawText);
  } catch (err) {
    console.error('Gemini structuring failed:', err);
    return res
      .status(502)
      .json({ error: 'The AI service could not process this input. Please try again.' });
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
    console.error('Document insert failed:', error);
    return res.status(500).json({ error: 'Failed to save document' });
  }

  res.status(201).json(data);
});

export default router;
