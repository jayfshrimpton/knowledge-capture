import { Router } from 'express';
import { requireUser } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /api/me — returns the current user's profile + org, or onboarded:false if
 * they have not yet been associated with an organisation.
 */
router.get('/me', requireUser, async (req, res) => {
  const { userId, email } = req.auth!;

  const { data: userRow, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, role, expires_at, org_id, organisations(name)')
    .eq('id', userId)
    .maybeSingle();

  if (error) return res.status(500).json({ error: 'Failed to load profile' });
  if (!userRow || !userRow.org_id) {
    return res.json({ onboarded: false, email });
  }

  res.json({
    onboarded: true,
    user: {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      role: userRow.role,
      orgId: userRow.org_id,
      orgName: (userRow as any).organisations?.name ?? null,
      expiresAt: userRow.expires_at ?? null,
    },
  });
});

/**
 * POST /api/bootstrap — onboards a newly signed-up user by creating their
 * organisation and user row. Idempotent: if the user already has an org, returns it.
 * Body: { orgName: string, name?: string }
 */
router.post('/bootstrap', requireUser, async (req, res) => {
  const { userId, email, provider, emailVerified } = req.auth!;
  const orgName = (req.body?.orgName ?? '').trim();
  const name = (req.body?.name ?? '').trim() || null;

  // If already onboarded, return existing org.
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('org_id')
    .eq('id', userId)
    .maybeSingle();

  if (existing?.org_id) {
    return res.json({ orgId: existing.org_id, alreadyOnboarded: true });
  }

  // Don't onboard an unconfirmed email (Supabase). Entra accounts are always
  // verified, so this only ever blocks unverified Supabase sign-ups.
  if (!emailVerified) {
    return res.status(403).json({
      error: 'Please confirm your email address before continuing.',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }

  if (!orgName) {
    return res.status(400).json({ error: 'orgName is required' });
  }

  const { data: org, error: orgErr } = await supabaseAdmin
    .from('organisations')
    .insert({ name: orgName })
    .select('id')
    .single();

  if (orgErr || !org) {
    logger.error('Org create error', { route: 'POST /api/bootstrap', errorType: 'SupabaseInsertError' });
    return res.status(500).json({ error: 'Failed to create organisation' });
  }

  const { error: userErr } = await supabaseAdmin.from('users').insert({
    id: userId,
    org_id: org.id,
    name,
    email,
    role: 'admin', // first user in an org is the admin
    auth_provider: provider,
  });

  if (userErr) {
    logger.error('User create error', { route: 'POST /api/bootstrap', errorType: 'SupabaseInsertError' });
    return res.status(500).json({ error: 'Failed to create user profile' });
  }

  res.status(201).json({ orgId: org.id });
});

export default router;
