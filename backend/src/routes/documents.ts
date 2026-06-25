import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { exportDocument, ExportFormat } from '../services/exporter';
import { DocumentRow } from '../types';
import { logger } from '../lib/logger';

const router = Router();

/** GET /api/documents — list documents for the user's org (newest first). */
router.get('/documents', requireAuth, async (req, res) => {
  const { orgId } = req.auth!;

  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('id, title, author_name, format, summary, tags, source, created_at, updated_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('List documents failed', { route: 'GET /api/documents', errorType: 'SupabaseQueryError' });
    return res.status(500).json({ error: 'Failed to load documents' });
  }

  res.json(data ?? []);
});

/** GET /api/documents/:id — fetch a single document (scoped to org). */
router.get('/documents/:id', requireAuth, async (req, res) => {
  const { orgId } = req.auth!;

  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('id', req.params.id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) {
    logger.error('Get document failed', { route: 'GET /api/documents/:id', errorType: 'SupabaseQueryError' });
    return res.status(500).json({ error: 'Failed to load document' });
  }
  if (!data) return res.status(404).json({ error: 'Document not found' });

  res.json(data);
});

/**
 * POST /api/documents/:id/export
 * Body: { format: 'word' | 'pdf' }
 * Generates and returns the export as a binary attachment.
 */
router.post('/documents/:id/export', requireAuth, async (req, res) => {
  const { orgId } = req.auth!;
  const format = req.body?.format as ExportFormat;

  if (format !== 'word' && format !== 'pdf') {
    return res.status(400).json({ error: "format must be 'word' or 'pdf'" });
  }

  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('id', req.params.id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) {
    logger.error('Export lookup failed', { route: 'POST /api/documents/:id/export', errorType: 'SupabaseQueryError' });
    return res.status(500).json({ error: 'Failed to load document' });
  }
  if (!data) return res.status(404).json({ error: 'Document not found' });

  try {
    const result = await exportDocument(data as DocumentRow, format);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (err) {
    logger.error('Export generation failed', { route: 'POST /api/documents/:id/export', errorType: 'ExportError' });
    res.status(500).json({ error: 'Export failed — please try again or try a different format.' });
  }
});

export default router;
