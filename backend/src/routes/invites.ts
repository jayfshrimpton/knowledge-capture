import { Router } from 'express';
import { randomUUID } from 'crypto';
import { requireAuth, requireUser, requireRole } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { logger } from '../lib/logger';

const router = Router();

/** POST /api/invites/guest — create a guest invite link (admin only). */
router.post('/invites/guest', requireAuth, requireRole('admin'), async (req, res) => {
  const { orgId, userId: createdBy } = req.auth!;
  const email = (req.body?.email ?? '').trim().toLowerCase();
  const expiresAt: string | undefined = req.body?.expiresAt;

  if (!email) return res.status(400).json({ error: 'email is required' });
  if (!expiresAt) return res.status(400).json({ error: 'expiresAt is required' });
  if (isNaN(Date.parse(expiresAt))) return res.status(400).json({ error: 'expiresAt must be a valid ISO date' });

  const token = randomUUID();

  const { error } = await supabaseAdmin.from('guest_invites').insert({
    org_id: orgId,
    email,
    token,
    created_by: createdBy,
    expires_at: expiresAt,
  });

  if (error) {
    logger.error('Create guest invite failed', { route: 'POST /api/invites/guest', errorType: 'SupabaseInsertError' });
    return res.status(500).json({ error: 'Failed to create invite' });
  }

  res.status(201).json({ token, link: `/accept-invite?token=${token}` });
});

/** GET /api/invites — list all guest invites for the org (admin only). */
router.get('/invites', requireAuth, requireRole('admin'), async (req, res) => {
  const { orgId } = req.auth!;

  const { data, error } = await supabaseAdmin
    .from('guest_invites')
    .select('id, email, token, expires_at, accepted_at, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('List invites failed', { route: 'GET /api/invites', errorType: 'SupabaseQueryError' });
    return res.status(500).json({ error: 'Failed to load invites' });
  }

  const result = (data ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    token: r.token,
    expiresAt: r.expires_at,
    acceptedAt: r.accepted_at ?? null,
    createdAt: r.created_at,
  }));

  res.json(result);
});

/** GET /api/invites/:token — public endpoint to inspect an invite before accepting. */
router.get('/invites/:token', async (req, res) => {
  const { data: invite, error } = await supabaseAdmin
    .from('guest_invites')
    .select('email, expires_at, accepted_at, org_id, organisations(name)')
    .eq('token', req.params.token)
    .maybeSingle();

  if (error || !invite) {
    return res.status(404).json({ error: 'Invite not found or invalid' });
  }

  const valid =
    !invite.accepted_at &&
    new Date(invite.expires_at) > new Date();

  res.json({
    email: invite.email,
    orgName: (invite as any).organisations?.name ?? null,
    expiresAt: invite.expires_at,
    valid,
  });
});

/**
 * POST /api/invites/:token/accept — accept a guest invite.
 * The caller must already be authenticated (Supabase) via requireUser.
 * Upserts the user row with role:'guest' and the invite's expiry.
 */
router.post('/invites/:token/accept', requireUser, async (req, res) => {
  const { userId, email } = req.auth!;

  const { data: invite, error: inviteErr } = await supabaseAdmin
    .from('guest_invites')
    .select('id, org_id, email, expires_at, accepted_at')
    .eq('token', req.params.token)
    .maybeSingle();

  if (inviteErr || !invite) {
    return res.status(404).json({ error: 'Invite not found or invalid' });
  }
  if (invite.accepted_at) {
    return res.status(409).json({ error: 'Invite has already been accepted' });
  }
  if (new Date(invite.expires_at) <= new Date()) {
    return res.status(410).json({ error: 'Invite has expired' });
  }

  // Upsert user row — create or claim existing guest slot.
  const { error: upsertErr } = await supabaseAdmin.from('users').upsert(
    {
      id: userId,
      org_id: invite.org_id,
      email: email ?? invite.email,
      role: 'guest',
      auth_provider: 'supabase',
    },
    { onConflict: 'id' },
  );

  if (upsertErr) {
    logger.error('Invite accept: user upsert failed', { route: 'POST /api/invites/:token/accept', errorType: 'SupabaseUpsertError' });
    return res.status(500).json({ error: 'Failed to activate guest access' });
  }

  // Mark invite as accepted.
  await supabaseAdmin
    .from('guest_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id);

  res.json({ ok: true, orgId: invite.org_id });
});

export default router;
