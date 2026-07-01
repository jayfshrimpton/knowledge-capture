import { describe, it, expect, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';

// ---------------------------------------------------------------------------
// Test keypair + module mocks
//
// Both JWKS clients (Entra + Supabase) are mocked to return the SAME public
// key, so a token signed with our private key validates on whichever path the
// issuer router selects. Issuer/audience/expiry still gate which tokens pass —
// that's exactly what we're testing.
// ---------------------------------------------------------------------------

const { publicKeyPem, privateKeyPem } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { generateKeyPairSync: gen } = require('crypto') as typeof import('crypto');
  const { publicKey, privateKey } = gen('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKeyPem: publicKey as string, privateKeyPem: privateKey as string };
});

vi.mock('jwks-rsa', () => ({
  default: () => ({
    getSigningKey: (_kid: string, cb: (err: Error | null, key?: unknown) => void) =>
      cb(null, { getPublicKey: () => publicKeyPem }),
  }),
}));

// Mutable result the mocked users lookup returns (for requireAuth tests).
const dbState = vi.hoisted(() => ({
  userLookup: { data: null as { org_id: string } | null, error: null as unknown },
}));

vi.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => dbState.userLookup,
        }),
      }),
    }),
  },
  STORAGE_BUCKET: 'documents',
}));

// Imported after the mocks above are registered. setup.ts has already defined
// the env vars the module reads at import time.
import { requireUser, requireAuth } from './auth';

// ---------------------------------------------------------------------------
// Token + req/res helpers
// ---------------------------------------------------------------------------

const TENANT = 'test-tenant';
const CLIENT = 'test-client';
const SUPABASE_URL = 'https://test-project.supabase.co';
const ENTRA_ISSUER = `https://login.microsoftonline.com/${TENANT}/v2.0`;
const SUPABASE_ISSUER = `${SUPABASE_URL}/auth/v1`;

function signEntra(claims: Record<string, unknown> = {}, opts: jwt.SignOptions = {}) {
  return jwt.sign(
    { oid: 'entra-oid-0001', preferred_username: 'work@contoso.com', ...claims },
    privateKeyPem,
    { algorithm: 'RS256', audience: CLIENT, issuer: ENTRA_ISSUER, expiresIn: '1h', ...opts }
  );
}

function signSupabase(claims: Record<string, unknown> = {}, opts: jwt.SignOptions = {}) {
  return jwt.sign(
    {
      sub: 'supabase-sub-0001',
      email: 'person@gmail.com',
      email_confirmed_at: new Date().toISOString(),
      ...claims,
    },
    privateKeyPem,
    { algorithm: 'RS256', audience: 'authenticated', issuer: SUPABASE_ISSUER, expiresIn: '1h', ...opts }
  );
}

function mockReq(token?: string): Request {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  } as unknown as Request;
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: any };
}

beforeEach(() => {
  dbState.userLookup = { data: null, error: null };
});

// ---------------------------------------------------------------------------
// requireUser — no org requirement
// ---------------------------------------------------------------------------

describe('requireUser', () => {
  it('accepts a valid Entra token and sets provider=entra', async () => {
    const req = mockReq(signEntra());
    const res = mockRes();
    const next = vi.fn();

    await requireUser(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.auth).toMatchObject({
      userId: 'entra-oid-0001',
      email: 'work@contoso.com',
      provider: 'entra',
      emailVerified: true,
      orgId: '',
    });
  });

  it('accepts a valid Supabase token and sets provider=supabase', async () => {
    const req = mockReq(signSupabase());
    const res = mockRes();
    const next = vi.fn();

    await requireUser(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.auth).toMatchObject({
      userId: 'supabase-sub-0001',
      email: 'person@gmail.com',
      provider: 'supabase',
      emailVerified: true,
    });
  });

  it('marks an unconfirmed Supabase email as emailVerified=false (but still passes)', async () => {
    const token = signSupabase({ email_confirmed_at: undefined, user_metadata: {} });
    const req = mockReq(token);
    const res = mockRes();
    const next = vi.fn();

    await requireUser(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.auth?.emailVerified).toBe(false);
  });

  it('rejects a missing token with 401', async () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    await requireUser(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('rejects an unknown issuer with 401', async () => {
    const token = signEntra({}, { issuer: 'https://evil.example.com/v2.0' });
    const req = mockReq(token);
    const res = mockRes();
    const next = vi.fn();

    await requireUser(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('rejects an expired token with 401', async () => {
    const token = signEntra({}, { expiresIn: '-1h' });
    const req = mockReq(token);
    const res = mockRes();
    const next = vi.fn();

    await requireUser(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('rejects an Entra token with the wrong audience with 401', async () => {
    const token = signEntra({}, { audience: 'some-other-app' });
    const req = mockReq(token);
    const res = mockRes();
    const next = vi.fn();

    await requireUser(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// requireAuth — requires the user to belong to an org
// ---------------------------------------------------------------------------

describe('requireAuth', () => {
  it('attaches orgId for an onboarded user (Supabase)', async () => {
    dbState.userLookup = { data: { org_id: 'org-123' }, error: null };
    const req = mockReq(signSupabase());
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.auth).toMatchObject({
      userId: 'supabase-sub-0001',
      orgId: 'org-123',
      provider: 'supabase',
    });
  });

  it('attaches orgId for an onboarded user (Entra)', async () => {
    dbState.userLookup = { data: { org_id: 'org-999' }, error: null };
    const req = mockReq(signEntra());
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.auth?.orgId).toBe('org-999');
    expect(req.auth?.provider).toBe('entra');
  });

  it('returns 403 NO_ORG when the user has no organisation', async () => {
    dbState.userLookup = { data: null, error: null };
    const req = mockReq(signSupabase());
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({ code: 'NO_ORG' });
  });

  it('rejects an invalid token with 401 before any DB lookup', async () => {
    const token = signSupabase({}, { issuer: 'https://evil.example.com/auth/v1' });
    const req = mockReq(token);
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });
});
