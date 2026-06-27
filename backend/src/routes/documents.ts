import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { exportDocument, ExportFormat } from '../services/exporter';
import { contentToText } from '../lib/contentToText';
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

/** GET /api/documents/:id/versions — list all versions for a document (newest first). */
router.get('/documents/:id/versions', requireAuth, async (req, res) => {
  const { orgId } = req.auth!;

  // Verify document belongs to org.
  const { data: doc, error: docError } = await supabaseAdmin
    .from('documents')
    .select('id')
    .eq('id', req.params.id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (docError) {
    logger.error('List versions: doc lookup failed', { route: 'GET /api/documents/:id/versions' });
    return res.status(500).json({ error: 'Failed to load document' });
  }
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const { data, error } = await supabaseAdmin
    .from('document_versions')
    .select('id, version_number, created_at, created_by')
    .eq('document_id', req.params.id)
    .order('version_number', { ascending: false });

  if (error) {
    logger.error('List versions failed', { route: 'GET /api/documents/:id/versions', errorType: 'SupabaseQueryError' });
    return res.status(500).json({ error: 'Failed to load versions' });
  }

  res.json(data ?? []);
});

/** GET /api/documents/:id/versions/:versionNumber — fetch a specific version's full content. */
router.get('/documents/:id/versions/:versionNumber', requireAuth, async (req, res) => {
  const { orgId } = req.auth!;
  const versionNumber = parseInt(req.params.versionNumber, 10);

  if (isNaN(versionNumber)) {
    return res.status(400).json({ error: 'Invalid version number' });
  }

  const { data: doc, error: docError } = await supabaseAdmin
    .from('documents')
    .select('id')
    .eq('id', req.params.id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (docError) {
    logger.error('Get version: doc lookup failed', { route: 'GET /api/documents/:id/versions/:versionNumber' });
    return res.status(500).json({ error: 'Failed to load document' });
  }
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const { data, error } = await supabaseAdmin
    .from('document_versions')
    .select('*')
    .eq('document_id', req.params.id)
    .eq('version_number', versionNumber)
    .maybeSingle();

  if (error) {
    logger.error('Get version failed', { route: 'GET /api/documents/:id/versions/:versionNumber', errorType: 'SupabaseQueryError' });
    return res.status(500).json({ error: 'Failed to load version' });
  }
  if (!data) return res.status(404).json({ error: 'Version not found' });

  res.json(data);
});

/**
 * POST /api/documents/:id/versions/:versionNumber/restore
 * Snapshots the current document content, then restores the specified version.
 */
router.post('/documents/:id/versions/:versionNumber/restore', requireAuth, async (req, res) => {
  const { userId, orgId } = req.auth!;
  const versionNumber = parseInt(req.params.versionNumber, 10);

  if (isNaN(versionNumber)) {
    return res.status(400).json({ error: 'Invalid version number' });
  }

  // Fetch current live document.
  const { data: currentDoc, error: docError } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('id', req.params.id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (docError) {
    logger.error('Restore: doc lookup failed', { route: 'POST /api/documents/:id/versions/:versionNumber/restore' });
    return res.status(500).json({ error: 'Failed to load document' });
  }
  if (!currentDoc) return res.status(404).json({ error: 'Document not found' });

  // Fetch the target version.
  const { data: targetVersion, error: versionError } = await supabaseAdmin
    .from('document_versions')
    .select('*')
    .eq('document_id', req.params.id)
    .eq('version_number', versionNumber)
    .maybeSingle();

  if (versionError) {
    logger.error('Restore: version lookup failed', { route: 'POST /api/documents/:id/versions/:versionNumber/restore' });
    return res.status(500).json({ error: 'Failed to load version' });
  }
  if (!targetVersion) return res.status(404).json({ error: 'Version not found' });

  // Snapshot the current live document before overwriting.
  const structured_content = contentToText((currentDoc as DocumentRow).content ?? []);
  const { error: snapshotError } = await supabaseAdmin.from('document_versions').insert({
    document_id: req.params.id,
    version_number: (currentDoc as DocumentRow).version,
    content: (currentDoc as DocumentRow).content,
    structured_content,
    created_by: userId,
  });

  if (snapshotError && snapshotError.code !== '23505') {
    // 23505 = unique_violation — snapshot already exists, safe to proceed.
    logger.error('Restore: snapshot insert failed', { route: 'POST /api/documents/:id/versions/:versionNumber/restore' });
    return res.status(500).json({ error: 'Failed to snapshot current version' });
  }

  // Restore the target version's content.
  const { data: updatedDoc, error: updateError } = await supabaseAdmin
    .from('documents')
    .update({
      content: targetVersion.content,
      version: (currentDoc as DocumentRow).version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .eq('org_id', orgId)
    .select('*')
    .single();

  if (updateError || !updatedDoc) {
    logger.error('Restore: document update failed', { route: 'POST /api/documents/:id/versions/:versionNumber/restore' });
    return res.status(500).json({ error: 'Failed to restore version' });
  }

  res.json(updatedDoc);
});

export default router;
