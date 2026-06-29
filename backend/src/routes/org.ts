import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { UserRole } from '../types';
import { logger } from '../lib/logger';

const router = Router();

/** GET /api/org/members — list all org members with role and department info (admin only). */
router.get('/org/members', requireAuth, requireRole('admin'), async (req, res) => {
  const { orgId } = req.auth!;

  const { data: users, error: userErr } = await supabaseAdmin
    .from('users')
    .select('id, name, email, role, expires_at')
    .eq('org_id', orgId)
    .order('name');

  if (userErr) {
    logger.error('List org members failed', { route: 'GET /api/org/members', errorType: 'SupabaseQueryError' });
    return res.status(500).json({ error: 'Failed to load members' });
  }

  const userIds = (users ?? []).map((u) => u.id);
  const { data: memberships } = userIds.length
    ? await supabaseAdmin.from('user_departments').select('user_id, department_id').in('user_id', userIds)
    : { data: [] };

  const deptMap = new Map<string, string[]>();
  for (const m of memberships ?? []) {
    const arr = deptMap.get(m.user_id) ?? [];
    arr.push(m.department_id);
    deptMap.set(m.user_id, arr);
  }

  const result = (users ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    expiresAt: u.expires_at ?? null,
    departments: deptMap.get(u.id) ?? [],
  }));

  res.json(result);
});

/** PATCH /api/org/members/:userId — update a member's role and/or expiry (admin only). */
router.patch('/org/members/:userId', requireAuth, requireRole('admin'), async (req, res) => {
  const { orgId, userId: adminId } = req.auth!;
  const { role, expiresAt } = req.body ?? {};

  if (req.params.userId === adminId) {
    return res.status(400).json({ error: 'You cannot change your own role' });
  }

  if (role && !['admin', 'member', 'guest'].includes(role)) {
    return res.status(400).json({ error: "role must be 'admin', 'member', or 'guest'" });
  }

  const update: Record<string, unknown> = {};
  if (role) update.role = role as UserRole;
  if (expiresAt !== undefined) update.expires_at = expiresAt;

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(update)
    .eq('id', req.params.userId)
    .eq('org_id', orgId)
    .select('id, name, email, role, expires_at')
    .single();

  if (error || !data) {
    logger.error('Update org member failed', { route: 'PATCH /api/org/members/:userId', errorType: 'SupabaseUpdateError' });
    return res.status(500).json({ error: 'Failed to update member' });
  }

  res.json({
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role,
    expiresAt: data.expires_at ?? null,
    departments: [],
  });
});

/** DELETE /api/org/members/:userId — remove a member from the org (admin only). */
router.delete('/org/members/:userId', requireAuth, requireRole('admin'), async (req, res) => {
  const { orgId, userId: adminId } = req.auth!;

  if (req.params.userId === adminId) {
    return res.status(400).json({ error: 'You cannot remove yourself from the organisation' });
  }

  const { data: target } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', req.params.userId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!target) return res.status(404).json({ error: 'Member not found' });

  const { error } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', req.params.userId)
    .eq('org_id', orgId);

  if (error) {
    logger.error('Remove org member failed', { route: 'DELETE /api/org/members/:userId', errorType: 'SupabaseDeleteError' });
    return res.status(500).json({ error: 'Failed to remove member' });
  }

  res.json({ ok: true });
});

export default router;
