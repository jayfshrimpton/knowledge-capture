import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { getVisibleDocIds } from '../lib/docAccess';
import { exportDocument, ExportFormat } from '../services/exporter';
import { contentToText } from '../lib/contentToText';
import { DocumentRow } from '../types';
import { logger } from '../lib/logger';

const router = Router();

/** Verifies the requesting user can access a specific document. Returns false and sends 403 if denied. */
async function assertDocAccess(
  req: Parameters<Parameters<typeof router.get>[1]>[0],
  res: Parameters<Parameters<typeof router.get>[1]>[1],
  docId: string,
): Promise<boolean> {
  const { orgId, userId, role } = req.auth!;
  if (role === 'admin') return true;

  let ids: string[];
  try {
    ids = (await getVisibleDocIds(orgId, userId, role)) ?? [];
  } catch {
    logger.error('Doc access check failed', { errorType: 'SupabaseRPCError' });
    res.status(500).json({ error: 'Failed to verify document access' });
    return false;
  }
  if (!ids.includes(docId)) {
    res.status(403).json({ error: 'Access denied' });
    return false;
  }
  return true;
}

/** GET /api/documents — list documents visible to the requesting user. */
router.get('/documents', requireAuth, async (req, res) => {
  const { orgId, userId, role } = req.auth!;

  let ids: string[] | null;
  try {
    ids = await getVisibleDocIds(orgId, userId, role);
  } catch {
    logger.error('List documents: visible ID fetch failed', { route: 'GET /api/documents', errorType: 'SupabaseRPCError' });
    return res.status(500).json({ error: 'Failed to load documents' });
  }

  if (ids !== null && ids.length === 0) {
    return res.json([]);
  }

  let query = supabaseAdmin
    .from('documents')
    .select('id, title, author_name, format, summary, tags, source, visibility, created_at, updated_at, document_departments(department_id)')
    .order('created_at', { ascending: false });

  if (ids === null) {
    query = query.eq('org_id', orgId);
  } else {
    query = query.in('id', ids);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('List documents failed', { route: 'GET /api/documents', errorType: 'SupabaseQueryError' });
    return res.status(500).json({ error: 'Failed to load documents' });
  }

  const result = (data ?? []).map((d: any) => ({
    id: d.id,
    title: d.title,
    author_name: d.author_name,
    format: d.format,
    summary: d.summary,
    tags: d.tags,
    source: d.source,
    visibility: d.visibility,
    departments: (d.document_departments ?? []).map((r: any) => r.department_id),
    created_at: d.created_at,
    updated_at: d.updated_at,
  }));

  res.json(result);
});

/** GET /api/documents/:id — fetch a single document (access-checked). */
router.get('/documents/:id', requireAuth, async (req, res) => {
  const { orgId } = req.auth!;

  if (!(await assertDocAccess(req, res, req.params.id))) return;

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
 */
router.post('/documents/:id/export', requireAuth, async (req, res) => {
  const { orgId } = req.auth!;
  const format = req.body?.format as ExportFormat;

  if (format !== 'word' && format !== 'pdf') {
    return res.status(400).json({ error: "format must be 'word' or 'pdf'" });
  }

  if (!(await assertDocAccess(req, res, req.params.id))) return;

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

/** GET /api/documents/:id/versions */
router.get('/documents/:id/versions', requireAuth, async (req, res) => {
  const { orgId } = req.auth!;

  if (!(await assertDocAccess(req, res, req.params.id))) return;

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

/** GET /api/documents/:id/versions/:versionNumber */
router.get('/documents/:id/versions/:versionNumber', requireAuth, async (req, res) => {
  const { orgId } = req.auth!;
  const versionNumber = parseInt(req.params.versionNumber, 10);

  if (isNaN(versionNumber)) {
    return res.status(400).json({ error: 'Invalid version number' });
  }

  if (!(await assertDocAccess(req, res, req.params.id))) return;

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
 * Admin and member only — guests are read-only.
 */
router.post('/documents/:id/versions/:versionNumber/restore', requireAuth, requireRole('admin', 'member'), async (req, res) => {
  const { userId, orgId } = req.auth!;
  const versionNumber = parseInt(req.params.versionNumber, 10);

  if (isNaN(versionNumber)) {
    return res.status(400).json({ error: 'Invalid version number' });
  }

  if (!(await assertDocAccess(req, res, req.params.id))) return;

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

  const structured_content = contentToText((currentDoc as DocumentRow).content ?? []);
  const { error: snapshotError } = await supabaseAdmin.from('document_versions').insert({
    document_id: req.params.id,
    version_number: (currentDoc as DocumentRow).version,
    content: (currentDoc as DocumentRow).content,
    structured_content,
    created_by: userId,
  });

  if (snapshotError && snapshotError.code !== '23505') {
    logger.error('Restore: snapshot insert failed', { route: 'POST /api/documents/:id/versions/:versionNumber/restore' });
    return res.status(500).json({ error: 'Failed to snapshot current version' });
  }

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

// ---------------------------------------------------------------------------
// Visibility + department scoping (admin only)
// ---------------------------------------------------------------------------

/** PATCH /api/documents/:id/visibility — update visibility and/or department scoping. */
router.patch('/documents/:id/visibility', requireAuth, requireRole('admin'), async (req, res) => {
  const { orgId } = req.auth!;
  const { visibility, departmentIds } = req.body ?? {};

  if (visibility && !['internal', 'public'].includes(visibility)) {
    return res.status(400).json({ error: "visibility must be 'internal' or 'public'" });
  }

  const { data: doc, error: docError } = await supabaseAdmin
    .from('documents')
    .select('id')
    .eq('id', req.params.id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (docError) {
    logger.error('Visibility update: doc lookup failed', { route: 'PATCH /api/documents/:id/visibility' });
    return res.status(500).json({ error: 'Failed to load document' });
  }
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  if (visibility) {
    const { error } = await supabaseAdmin
      .from('documents')
      .update({ visibility })
      .eq('id', req.params.id);
    if (error) {
      logger.error('Visibility update failed', { route: 'PATCH /api/documents/:id/visibility', errorType: 'SupabaseUpdateError' });
      return res.status(500).json({ error: 'Failed to update visibility' });
    }
  }

  if (Array.isArray(departmentIds)) {
    // Replace all department associations.
    await supabaseAdmin.from('document_departments').delete().eq('document_id', req.params.id);
    if (departmentIds.length > 0) {
      const rows = departmentIds.map((deptId: string) => ({
        document_id: req.params.id,
        department_id: deptId,
      }));
      const { error } = await supabaseAdmin.from('document_departments').insert(rows);
      if (error) {
        logger.error('Department assignment failed', { route: 'PATCH /api/documents/:id/visibility', errorType: 'SupabaseInsertError' });
        return res.status(500).json({ error: 'Failed to update department assignments' });
      }
    }
  }

  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Document shares (admin only)
// ---------------------------------------------------------------------------

/** GET /api/documents/:id/shares — list users with explicit access to this document. */
router.get('/documents/:id/shares', requireAuth, requireRole('admin'), async (req, res) => {
  const { orgId } = req.auth!;

  const { data: doc } = await supabaseAdmin
    .from('documents')
    .select('id')
    .eq('id', req.params.id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const { data, error } = await supabaseAdmin
    .from('document_shares')
    .select('user_id, users(id, name, email, role, expires_at)')
    .eq('document_id', req.params.id);

  if (error) {
    logger.error('List shares failed', { route: 'GET /api/documents/:id/shares', errorType: 'SupabaseQueryError' });
    return res.status(500).json({ error: 'Failed to load shares' });
  }

  const result = (data ?? []).map((r: any) => ({
    id: r.users.id,
    name: r.users.name,
    email: r.users.email,
    role: r.users.role,
    expiresAt: r.users.expires_at ?? null,
    departments: [],
  }));

  res.json(result);
});

/** POST /api/documents/:id/shares — share this document with a specific user. */
router.post('/documents/:id/shares', requireAuth, requireRole('admin'), async (req, res) => {
  const { orgId } = req.auth!;
  const { userId: targetUserId } = req.body ?? {};

  if (!targetUserId) return res.status(400).json({ error: 'userId is required' });

  const { data: doc } = await supabaseAdmin
    .from('documents')
    .select('id')
    .eq('id', req.params.id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const { error } = await supabaseAdmin
    .from('document_shares')
    .upsert({ document_id: req.params.id, user_id: targetUserId }, { onConflict: 'document_id,user_id' });

  if (error) {
    logger.error('Share document failed', { route: 'POST /api/documents/:id/shares', errorType: 'SupabaseInsertError' });
    return res.status(500).json({ error: 'Failed to share document' });
  }

  res.json({ ok: true });
});

/** DELETE /api/documents/:id/shares/:userId — remove explicit share. */
router.delete('/documents/:id/shares/:userId', requireAuth, requireRole('admin'), async (req, res) => {
  const { orgId } = req.auth!;

  const { data: doc } = await supabaseAdmin
    .from('documents')
    .select('id')
    .eq('id', req.params.id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const { error } = await supabaseAdmin
    .from('document_shares')
    .delete()
    .eq('document_id', req.params.id)
    .eq('user_id', req.params.userId);

  if (error) {
    logger.error('Unshare document failed', { route: 'DELETE /api/documents/:id/shares/:userId', errorType: 'SupabaseDeleteError' });
    return res.status(500).json({ error: 'Failed to remove share' });
  }

  res.json({ ok: true });
});

export default router;
