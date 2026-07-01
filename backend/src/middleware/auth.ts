import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { supabaseAdmin } from '../lib/supabase';
import { AuthContext, AuthProvider, UserRole } from '../types';
import { logger } from '../lib/logger';

// Augment Express Request with our auth context.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;

if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID) {
  throw new Error(
    'Missing AZURE_TENANT_ID or AZURE_CLIENT_ID environment variables. ' +
      'Copy .env.example to .env and fill in the values.'
  );
}

if (!SUPABASE_URL) {
  throw new Error(
    'Missing SUPABASE_URL environment variable (required for Supabase token validation). ' +
      'Copy .env.example to .env and fill in the values.'
  );
}

const ENTRA_ISSUER = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0`;
// Supabase stamps the issuer as <project-url>/auth/v1 (no trailing slash).
const SUPABASE_ISSUER = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1`;

// JWKS clients — each caches signing keys automatically.
// Entra: we use the tenant endpoint so the same backend can serve a single
// tenant. For multi-tenant, replace AZURE_TENANT_ID with "common".
const entraJwks = jwksRsa({
  jwksUri: `https://login.microsoftonline.com/${AZURE_TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 600_000, // 10 minutes
  rateLimit: true,
});

// Supabase: asymmetric (JWKS) verification — no shared secret needed. Requires
// the project to use asymmetric JWT signing keys (the current Supabase default).
const supabaseJwks = jwksRsa({
  jwksUri: `${SUPABASE_ISSUER}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600_000,
  rateLimit: true,
});

function makeGetSigningKey(client: jwksRsa.JwksClient) {
  return (header: JwtHeader, callback: SigningKeyCallback): void => {
    client.getSigningKey(header.kid, (err, key) => {
      if (err || !key) return callback(err ?? new Error('Signing key not found'));
      callback(null, key.getPublicKey());
    });
  };
}

interface EntraTokenPayload {
  oid: string;           // Entra Object ID — stable user identifier
  preferred_username?: string;
  email?: string;
  tid?: string;          // Tenant ID
  aud?: string;
}

interface SupabaseTokenPayload {
  sub: string;           // Supabase Auth user id
  email?: string;
  aud?: string;          // "authenticated"
  email_confirmed_at?: string;
  user_metadata?: { email_verified?: boolean };
}

/** Normalised result of validating either provider's token. */
interface ValidatedIdentity {
  userId: string;
  email: string | null;
  provider: AuthProvider;
  emailVerified: boolean;
}

function validateEntraToken(token: string): Promise<EntraTokenPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      makeGetSigningKey(entraJwks),
      {
        audience: AZURE_CLIENT_ID,
        issuer: ENTRA_ISSUER,
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) return reject(err);
        const payload = decoded as EntraTokenPayload;
        if (!payload?.oid) return reject(new Error('Token missing oid claim'));
        resolve(payload);
      }
    );
  });
}

function validateSupabaseToken(token: string): Promise<SupabaseTokenPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      makeGetSigningKey(supabaseJwks),
      {
        audience: 'authenticated',
        issuer: SUPABASE_ISSUER,
        // Supabase asymmetric keys may be ECC (ES256) or RSA (RS256).
        algorithms: ['ES256', 'RS256'],
      },
      (err, decoded) => {
        if (err) return reject(err);
        const payload = decoded as SupabaseTokenPayload;
        if (!payload?.sub) return reject(new Error('Token missing sub claim'));
        resolve(payload);
      }
    );
  });
}

/**
 * Validates a bearer token from either identity provider. Routes on the `iss`
 * claim (read without verification), then runs the matching signature check.
 * Default-denies any unrecognised issuer.
 */
async function validateToken(token: string): Promise<ValidatedIdentity> {
  const decoded = jwt.decode(token, { complete: true });
  const iss = (decoded?.payload as { iss?: string } | null)?.iss;

  if (iss === ENTRA_ISSUER) {
    const payload = await validateEntraToken(token);
    return {
      userId: payload.oid,
      email: payload.preferred_username ?? payload.email ?? null,
      provider: 'entra',
      // Entra work/school accounts are inherently verified.
      emailVerified: true,
    };
  }

  if (iss === SUPABASE_ISSUER) {
    const payload = await validateSupabaseToken(token);
    return {
      userId: payload.sub,
      email: payload.email ?? null,
      provider: 'supabase',
      emailVerified: Boolean(
        payload.email_confirmed_at || payload.user_metadata?.email_verified
      ),
    };
  }

  throw new Error('Unrecognised token issuer');
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

/**
 * Validates the bearer token from either provider (Entra or Supabase) with no
 * org requirement. Attaches userId/email/provider to req.auth with a
 * placeholder orgId. Used by the onboarding/bootstrap route where the user may
 * not yet belong to an organisation.
 */
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Please sign in to continue.' });

    let identity: ValidatedIdentity;
    try {
      identity = await validateToken(token);
    } catch {
      return res.status(401).json({ error: 'Your session has expired — please sign in again.' });
    }

    req.auth = {
      userId: identity.userId,
      orgId: '',
      role: 'member',
      expiresAt: null,
      email: identity.email,
      provider: identity.provider,
      emailVerified: identity.emailVerified,
    };
    next();
  } catch (err) {
    logger.error('requireUser unexpected error', { route: 'auth', errorType: 'AuthMiddlewareError' });
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Validates the bearer token from either provider (Entra or Supabase) from the
 * Authorization: Bearer <token> header, then looks up the user's org_id from
 * the users table. Rejects with 401 if the token is missing/invalid, or 403 if
 * the user has not been onboarded into an org. The org lookup is
 * provider-agnostic: users.id holds either an Entra OID or a Supabase sub.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Please sign in to continue.' });
    }

    let identity: ValidatedIdentity;
    try {
      identity = await validateToken(token);
    } catch {
      return res.status(401).json({ error: 'Your session has expired — please sign in again.' });
    }

    const { data: userRow, error: userErr } = await supabaseAdmin
      .from('users')
      .select('org_id, role')
      .eq('id', identity.userId)
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
      userId: identity.userId,
      orgId: userRow.org_id,
      role: (userRow.role ?? 'member') as UserRole,
      expiresAt: null,
      email: identity.email,
      provider: identity.provider,
      emailVerified: identity.emailVerified,
    };

    next();
  } catch (err) {
    logger.error('requireAuth unexpected error', { route: 'auth', errorType: 'AuthMiddlewareError' });
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Returns middleware that restricts access to users with one of the given roles.
 * Must be used after requireAuth (which populates req.auth.role).
 */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
