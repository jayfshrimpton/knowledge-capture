import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getCreditsStatus } from '../services/credits';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /api/credits
 * Returns the org's AI credit usage for the current billing period.
 * Response: { plan, limit, used, remaining }
 *   - limit / remaining are null for enterprise (unlimited).
 */
router.get('/credits', requireAuth, async (req, res) => {
  const { orgId } = req.auth!;

  try {
    const status = await getCreditsStatus(orgId);
    res.json(status);
  } catch (err) {
    logger.error('Failed to fetch credits status', { route: 'GET /api/credits', errorType: 'CreditsStatusError' });
    res.status(500).json({ error: 'Failed to load credit balance' });
  }
});

export default router;
