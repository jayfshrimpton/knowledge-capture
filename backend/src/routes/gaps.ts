import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /api/gaps/flagged
 * Documents in this org that have Gemini-detected warnings/gaps.
 */
router.get('/gaps/flagged', requireAuth, requireRole('admin'), async (req, res) => {
  const { orgId } = req.auth!;

  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('id, title, warnings, author_name, created_at')
    .eq('org_id', orgId)
    .not('warnings', 'is', null)
    .not('warnings', 'eq', '{}')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Flagged docs fetch failed', { route: 'GET /api/gaps/flagged', errorType: 'SupabaseSelectError' });
    return res.status(500).json({ error: 'Failed to load flagged documents' });
  }

  res.json(data ?? []);
});

/**
 * GET /api/gaps/search-misses
 * Most-searched queries across this org that returned zero results.
 */
router.get('/gaps/search-misses', requireAuth, requireRole('admin'), async (req, res) => {
  const { orgId } = req.auth!;

  const { data, error } = await supabaseAdmin
    .from('search_logs')
    .select('query')
    .eq('org_id', orgId)
    .eq('result_count', 0)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    logger.error('Search misses fetch failed', { route: 'GET /api/gaps/search-misses', errorType: 'SupabaseSelectError' });
    return res.status(500).json({ error: 'Failed to load search misses' });
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.query] = (counts[row.query] ?? 0) + 1;
  }

  const result = Object.entries(counts)
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  res.json(result);
});

/**
 * GET /api/gaps/coverage
 * All tags used in the org's documents with document counts, sorted sparse-first.
 */
router.get('/gaps/coverage', requireAuth, requireRole('admin'), async (req, res) => {
  const { orgId } = req.auth!;

  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('tags')
    .eq('org_id', orgId)
    .not('tags', 'is', null);

  if (error) {
    logger.error('Coverage fetch failed', { route: 'GET /api/gaps/coverage', errorType: 'SupabaseSelectError' });
    return res.status(500).json({ error: 'Failed to load tag coverage' });
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    for (const tag of row.tags ?? []) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }

  const result = Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.count - b.count);

  res.json(result);
});

/**
 * GET /api/gaps/activity
 * Per-user capture counts for this org over the last 30 days.
 */
router.get('/gaps/activity', requireAuth, requireRole('admin'), async (req, res) => {
  const { orgId } = req.auth!;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: docs, error: docsError } = await supabaseAdmin
    .from('documents')
    .select('created_by')
    .eq('org_id', orgId)
    .gte('created_at', thirtyDaysAgo)
    .not('created_by', 'is', null);

  if (docsError) {
    logger.error('Activity docs fetch failed', { route: 'GET /api/gaps/activity', errorType: 'SupabaseSelectError' });
    return res.status(500).json({ error: 'Failed to load activity data' });
  }

  const counts: Record<string, number> = {};
  for (const row of docs ?? []) {
    if (row.created_by) {
      counts[row.created_by] = (counts[row.created_by] ?? 0) + 1;
    }
  }

  const userIds = Object.keys(counts);
  if (userIds.length === 0) {
    return res.json([]);
  }

  const { data: users, error: usersError } = await supabaseAdmin
    .from('users')
    .select('id, name, email')
    .in('id', userIds);

  if (usersError) {
    logger.error('Activity users fetch failed', { route: 'GET /api/gaps/activity', errorType: 'SupabaseSelectError' });
    return res.status(500).json({ error: 'Failed to load user data' });
  }

  const result = (users ?? [])
    .map((u) => ({
      userId: u.id,
      email: u.email ?? '',
      name: u.name ?? null,
      count: counts[u.id] ?? 0,
    }))
    .sort((a, b) => b.count - a.count);

  res.json(result);
});

export default router;
