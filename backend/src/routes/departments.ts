import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { logger } from '../lib/logger';

const router = Router();

/** GET /api/departments — list org departments with member counts. */
router.get('/departments', requireAuth, async (req, res) => {
  const { orgId } = req.auth!;

  const { data: departments, error: deptError } = await supabaseAdmin
    .from('departments')
    .select('id, name, created_at')
    .eq('org_id', orgId)
    .order('name');

  if (deptError) {
    logger.error('List departments failed', { route: 'GET /api/departments', errorType: 'SupabaseQueryError' });
    return res.status(500).json({ error: 'Failed to load departments' });
  }

  const deptIds = (departments ?? []).map((d) => d.id);
  const { data: memberships } = deptIds.length
    ? await supabaseAdmin.from('user_departments').select('department_id').in('department_id', deptIds)
    : { data: [] };

  const countMap = new Map<string, number>();
  for (const m of memberships ?? []) {
    countMap.set(m.department_id, (countMap.get(m.department_id) ?? 0) + 1);
  }

  const result = (departments ?? []).map((d) => ({
    id: d.id,
    orgId,
    name: d.name,
    createdAt: d.created_at,
    memberCount: countMap.get(d.id) ?? 0,
  }));

  res.json(result);
});

/** POST /api/departments — create a department (admin only). */
router.post('/departments', requireAuth, requireRole('admin'), async (req, res) => {
  const { orgId } = req.auth!;
  const name = (req.body?.name ?? '').trim();

  if (!name) return res.status(400).json({ error: 'name is required' });

  const { data, error } = await supabaseAdmin
    .from('departments')
    .insert({ org_id: orgId, name })
    .select('id, name, created_at')
    .single();

  if (error) {
    logger.error('Create department failed', { route: 'POST /api/departments', errorType: 'SupabaseInsertError' });
    return res.status(500).json({ error: 'Failed to create department' });
  }

  res.status(201).json({ id: data.id, orgId, name: data.name, createdAt: data.created_at, memberCount: 0 });
});

/** DELETE /api/departments/:id — delete a department (admin only). */
router.delete('/departments/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { orgId } = req.auth!;

  const { data: dept } = await supabaseAdmin
    .from('departments')
    .select('id')
    .eq('id', req.params.id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!dept) return res.status(404).json({ error: 'Department not found' });

  const { error } = await supabaseAdmin
    .from('departments')
    .delete()
    .eq('id', req.params.id);

  if (error) {
    logger.error('Delete department failed', { route: 'DELETE /api/departments/:id', errorType: 'SupabaseDeleteError' });
    return res.status(500).json({ error: 'Failed to delete department' });
  }

  res.json({ ok: true });
});

/** POST /api/departments/:id/members/:userId — assign user to department (admin only). */
router.post('/departments/:id/members/:userId', requireAuth, requireRole('admin'), async (req, res) => {
  const { orgId } = req.auth!;

  const { data: dept } = await supabaseAdmin
    .from('departments')
    .select('id')
    .eq('id', req.params.id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!dept) return res.status(404).json({ error: 'Department not found' });

  const { error } = await supabaseAdmin
    .from('user_departments')
    .upsert({ user_id: req.params.userId, department_id: req.params.id }, { onConflict: 'user_id,department_id' });

  if (error) {
    logger.error('Add dept member failed', { route: 'POST /api/departments/:id/members/:userId', errorType: 'SupabaseInsertError' });
    return res.status(500).json({ error: 'Failed to add member to department' });
  }

  res.json({ ok: true });
});

/** DELETE /api/departments/:id/members/:userId — remove user from department (admin only). */
router.delete('/departments/:id/members/:userId', requireAuth, requireRole('admin'), async (req, res) => {
  const { orgId } = req.auth!;

  const { data: dept } = await supabaseAdmin
    .from('departments')
    .select('id')
    .eq('id', req.params.id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!dept) return res.status(404).json({ error: 'Department not found' });

  const { error } = await supabaseAdmin
    .from('user_departments')
    .delete()
    .eq('user_id', req.params.userId)
    .eq('department_id', req.params.id);

  if (error) {
    logger.error('Remove dept member failed', { route: 'DELETE /api/departments/:id/members/:userId', errorType: 'SupabaseDeleteError' });
    return res.status(500).json({ error: 'Failed to remove member from department' });
  }

  res.json({ ok: true });
});

/** POST /api/departments/:id/documents/:docId — scope a document to this department (admin only). */
router.post('/departments/:id/documents/:docId', requireAuth, requireRole('admin'), async (req, res) => {
  const { orgId } = req.auth!;

  const { data: dept } = await supabaseAdmin
    .from('departments')
    .select('id')
    .eq('id', req.params.id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!dept) return res.status(404).json({ error: 'Department not found' });

  const { data: doc } = await supabaseAdmin
    .from('documents')
    .select('id')
    .eq('id', req.params.docId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const { error } = await supabaseAdmin
    .from('document_departments')
    .upsert({ document_id: req.params.docId, department_id: req.params.id }, { onConflict: 'document_id,department_id' });

  if (error) {
    logger.error('Scope doc to dept failed', { route: 'POST /api/departments/:id/documents/:docId', errorType: 'SupabaseInsertError' });
    return res.status(500).json({ error: 'Failed to scope document to department' });
  }

  res.json({ ok: true });
});

/** DELETE /api/departments/:id/documents/:docId — remove document from department scope (admin only). */
router.delete('/departments/:id/documents/:docId', requireAuth, requireRole('admin'), async (req, res) => {
  const { orgId } = req.auth!;

  const { data: dept } = await supabaseAdmin
    .from('departments')
    .select('id')
    .eq('id', req.params.id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!dept) return res.status(404).json({ error: 'Department not found' });

  const { error } = await supabaseAdmin
    .from('document_departments')
    .delete()
    .eq('document_id', req.params.docId)
    .eq('department_id', req.params.id);

  if (error) {
    logger.error('Unscope doc from dept failed', { route: 'DELETE /api/departments/:id/documents/:docId', errorType: 'SupabaseDeleteError' });
    return res.status(500).json({ error: 'Failed to remove document from department' });
  }

  res.json({ ok: true });
});

export default router;
