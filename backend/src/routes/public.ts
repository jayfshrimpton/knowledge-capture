import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /api/public/documents/:id
 * No authentication required. Returns only documents marked visibility='public'.
 */
router.get('/public/documents/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('id', req.params.id)
    .eq('visibility', 'public')
    .maybeSingle();

  if (error) {
    logger.error('Public doc fetch failed', { route: 'GET /api/public/documents/:id', errorType: 'SupabaseQueryError' });
    return res.status(500).json({ error: 'Failed to load document' });
  }
  if (!data) return res.status(404).json({ error: 'Document not found or not public' });

  res.json(data);
});

export default router;
