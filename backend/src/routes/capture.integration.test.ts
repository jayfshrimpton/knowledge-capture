/**
 * Integration tests for POST /api/capture.
 *
 * These tests hit the REAL Supabase database. Configure credentials in
 * backend/.env.test before running:
 *
 *   SUPABASE_URL=https://<test-project>.supabase.co
 *   SUPABASE_SECRET_KEY=<service-role-key>
 *
 * Run with: npm run test:integration
 *
 * Gemini is mocked so tests are deterministic and incur no API cost.
 * Auth middleware is mocked to inject test org/user — auth is already
 * covered comprehensively in middleware/auth.test.ts.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { supabaseAdmin } from '../lib/supabase';
import { createTestFixtures, cleanupTestFixtures } from '../test/integrationHelpers';

// ---------------------------------------------------------------------------
// Mutable auth context — populated in beforeAll after fixtures are created.
// ---------------------------------------------------------------------------

const authCtx = vi.hoisted(() => ({ orgId: '', userId: '' }));

vi.mock('../middleware/auth', () => ({
  requireAuth: vi.fn((req: any, _res: any, next: any) => {
    req.auth = {
      userId: authCtx.userId,
      orgId: authCtx.orgId,
      email: 'test@commonplace-test.invalid',
      provider: 'supabase',
      emailVerified: true,
    };
    next();
  }),
  requireUser: vi.fn((req: any, _res: any, next: any) => {
    req.auth = {
      userId: authCtx.userId,
      orgId: authCtx.orgId,
      email: 'test@commonplace-test.invalid',
      provider: 'supabase',
      emailVerified: true,
    };
    next();
  }),
}));

// ---------------------------------------------------------------------------
// Mock Gemini — deterministic output, no API cost.
// ---------------------------------------------------------------------------

const mockStructureNotes = vi.fn();

vi.mock('../services/gemini', () => ({
  structureNotes: (...args: unknown[]) => mockStructureNotes(...args),
}));

// ---------------------------------------------------------------------------
// Mock embeddings — capture now generates an embedding after saving.
// Mock it to avoid hitting the Gemini API and keep tests deterministic.
// ---------------------------------------------------------------------------

vi.mock('../services/embeddings', () => ({
  generateEmbedding: vi.fn().mockResolvedValue(new Array(768).fill(0.1)),
  buildDocumentText: vi.fn().mockReturnValue('test document text'),
  TaskType: {
    RETRIEVAL_QUERY: 'RETRIEVAL_QUERY',
    RETRIEVAL_DOCUMENT: 'RETRIEVAL_DOCUMENT',
  },
}));

const STRUCTURED_DOC = {
  format: 'procedure' as const,
  summary: 'A test procedure.',
  sections: [{ heading: 'Step 1', desc: 'Do the thing.' }],
  diagram: null,
  warnings: [],
  tags: ['test', 'procedure'],
};

// ---------------------------------------------------------------------------
// A raw text input long enough to pass the 20-word minimum.
// ---------------------------------------------------------------------------
const LONG_ENOUGH_TEXT =
  'This is a detailed description of the procedure that contains more than twenty words in total.';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

import app from '../app';

let orgId: string;
let userId: string;

beforeAll(async () => {
  const fixtures = await createTestFixtures();
  orgId = fixtures.orgId;
  userId = fixtures.userId;
  authCtx.orgId = orgId;
  authCtx.userId = userId;
});

afterAll(async () => {
  await cleanupTestFixtures(orgId);
});

beforeEach(() => {
  mockStructureNotes.mockReset();
  mockStructureNotes.mockResolvedValue(STRUCTURED_DOC);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/capture', () => {
  it('creates a new document and returns 201 with the saved row', async () => {
    const res = await request(app)
      .post('/api/capture')
      .send({ title: 'Integration Test Doc', rawText: LONG_ENOUGH_TEXT })
      .expect(201);

    expect(res.body.id).toBeTruthy();
    expect(res.body.org_id).toBe(orgId);
    expect(res.body.format).toBe('procedure');
    expect(res.body.title).toBe('Integration Test Doc');

    // Verify it was actually written to the database.
    const { data } = await supabaseAdmin
      .from('documents')
      .select('id, org_id, format')
      .eq('id', res.body.id)
      .single();
    expect(data?.org_id).toBe(orgId);
    expect(data?.format).toBe('procedure');
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/capture')
      .send({ rawText: LONG_ENOUGH_TEXT })
      .expect(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('returns 400 when input is under 20 words', async () => {
    const res = await request(app)
      .post('/api/capture')
      .send({ title: 'Short', rawText: 'Too short.' })
      .expect(400);
    expect(res.body.error).toMatch(/short/i);
  });

  it('updates existing document and creates a version row when documentId is supplied', async () => {
    // First capture — creates the document.
    const firstRes = await request(app)
      .post('/api/capture')
      .send({ title: 'Version Test Doc', rawText: LONG_ENOUGH_TEXT })
      .expect(201);

    const docId = firstRes.body.id;
    const originalVersion = firstRes.body.version;

    // Second capture — re-structures and bumps version.
    const secondRes = await request(app)
      .post('/api/capture')
      .send({ title: 'Version Test Doc', rawText: LONG_ENOUGH_TEXT, documentId: docId })
      .expect(200);

    expect(secondRes.body.version).toBe(originalVersion + 1);

    // A version snapshot should now exist for the original version.
    const { data: versions } = await supabaseAdmin
      .from('document_versions')
      .select('version_number')
      .eq('document_id', docId);
    expect(versions?.length).toBeGreaterThanOrEqual(1);
    expect(versions?.some((v) => v.version_number === originalVersion)).toBe(true);
  });

  it('returns 402 CREDITS_EXHAUSTED when the org has used all credits', async () => {
    // Exhaust the starter-plan limit (50 credits) by inserting credit events directly.
    await supabaseAdmin.from('ai_credit_events').insert({
      org_id: orgId,
      user_id: userId,
      document_id: null,
      credits: 50,
      description: 'Seed: exhaust credits for test',
    });

    const res = await request(app)
      .post('/api/capture')
      .send({ title: 'Blocked Doc', rawText: LONG_ENOUGH_TEXT })
      .expect(402);

    expect(res.body.code).toBe('CREDITS_EXHAUSTED');

    // Clean up the seeded credit event so other tests aren't affected.
    await supabaseAdmin
      .from('ai_credit_events')
      .delete()
      .eq('org_id', orgId)
      .eq('description', 'Seed: exhaust credits for test');
  });

  it('returns degraded:true and saves a draft when Gemini throws', async () => {
    mockStructureNotes.mockRejectedValueOnce(new Error('Gemini service unavailable'));

    const res = await request(app)
      .post('/api/capture')
      .send({ title: 'Draft Doc', rawText: LONG_ENOUGH_TEXT })
      .expect(200);

    expect(res.body.degraded).toBe(true);
    expect(res.body.documentId).toBeTruthy();

    // Confirm the draft was persisted to the database.
    const { data } = await supabaseAdmin
      .from('documents')
      .select('format, status')
      .eq('id', res.body.documentId)
      .single();
    expect(data?.format).toBe('unstructured');
    expect(data?.status).toBe('draft');
  });
});
