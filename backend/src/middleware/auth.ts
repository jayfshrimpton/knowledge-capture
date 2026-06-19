import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { AuthContext } from '../types';

// Augment Express Request with our auth context.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

/**
 * Validates the Supabase JWT only (no org requirement). Attaches userId/email
 * to req.auth with a placeholder orgId. Used by the onboarding/bootstrap route
 * where the user may not yet belong to an organisation.
 */
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Missing bearer token' });

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.auth = { userId: data.user.id, orgId: '', email: data.user.email ?? null };
    next();
  } catch (err) {
    console.error('requireUser error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Validates the Supabase JWT from the Authorization: Bearer <token> header,
 * then looks up the user's org_id from the users table. Rejects with 401 if the
 * token is missing/invalid, or 403 if the user has not been onboarded into an org.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

    if (!token) {
      return res.status(401).json({ error: 'Missing bearer token' });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { data: userRow, error: userErr } = await supabaseAdmin
      .from('users')
      .select('org_id')
      .eq('id', data.user.id)
      .maybeSingle();

    if (userErr) {
      return res.status(500).json({ error: 'Failed to load user profile' });
    }
    if (!userRow || !userRow.org_id) {
      return res
        .status(403)
        .json({ error: 'User is not associated with an organisation', code: 'NO_ORG' });
    }

    req.auth = {
      userId: data.user.id,
      orgId: userRow.org_id,
      email: data.user.email ?? null,
    };

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
