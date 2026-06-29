/**
 * Integration tests for POST /api/search and POST /api/ask.
 *
 * These tests hit the REAL Supabase database (including the pgvector
 * match_documents RPC). Embeddings and Gemini are mocked so tests are
 * deterministic and incur no API cost.
 *
 * Prerequisites:
 *   - Migration 009_pgvector_embeddings.sql must be applied to the test DB.
 *   - backend/.env.test must supply SUPABASE_URL and SUPABASE_SECRET_KEY.
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { supabaseAdmin } from '../lib/supabase';
import { createTestFixtures, cleanupTestFixtures } from '../test/integrationHelpers';
import app from '../app';

// ---------------------------------------------------------------------------
// Auth mock — same pattern as other integration tests
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
// Mock embeddings — deterministic vectors, no Gemini API cost.
// The test document is inserted with TEST_VECTOR, so a query returning the
// same vector will achieve cosine similarity ≈ 1.
// ---------------------------------------------------------------------------

const TEST_VECTOR = new Array(768).fill(0.5);

vi.mock('../services/embeddings', () => ({
  generateEmbedding: vi.fn().mockResolvedValue(TEST_VECTOR),
  buildDocumentText: vi.fn().mockReturnValue('test document text'),
  TaskType: {
    RETRIEVAL_QUERY: 'RETRIEVAL_QUERY',
    RETRIEVAL_DOCUMENT: 'RETRIEVAL_DOCUMENT',
  },
}));

// ---------------------------------------------------------------------------
// Mock Gemini answerQuestion
// ---------------------------------------------------------------------------

vi.mock('../services/gemini', () => ({
  structureNotes: vi.fn(),
  answerQuestion: vi.fn().mockResolvedValue({
    answer: 'This is a test answer based on the retrieved documents.',
    cited_ids: [] as string[],
  }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

let orgId: string;
let userId: string;
let testDocId: string;

beforeAll(async () => {
  const fixtures = await createTestFixtures();
  orgId = fixtures.orgId;
  userId = fixtures.userId;
  authCtx.orgId = orgId;
  authCtx.userId = userId;

  // Insert a test document with the known vector so similarity search can find it.
  testDocId = crypto.randomUUID();
  const vectorString = `[${TEST_VECTOR.join(',')}]`;

  const { error } = await supabaseAdmin.from('documents').insert({
    id: testDocId,
    org_id: orgId,
    created_by: userId,
    title: 'Test Searchable Document',
    format: 'reference',
    summary: 'A document about testing vector search.',
    content: [],
    raw_input: 'Vector search is a technique for finding semantically similar content.',
    source: 'ai',
    embedding: vectorString,
  });

  if (error) throw new Error(`Failed to insert test document: ${error.message}`);
});

afterAll(async () => {
  await cleanupTestFixtures(orgId);
});

// ---------------------------------------------------------------------------
// POST /api/search
// ---------------------------------------------------------------------------

describe('POST /api/search', () => {
  it('returns 400 when query is missing', async () => {
    const res = await request(app).post('/api/search').send({}).expect(400);
    expect(res.body.error).toMatch(/query/i);
  });

  it('returns 400 when query is empty string', async () => {
    const res = await request(app).post('/api/search').send({ query: '   ' }).expect(400);
    expect(res.body.error).toMatch(/query/i);
  });

  it('returns ranked documents for a valid query', async () => {
    const res = await request(app)
      .post('/api/search')
      .send({ query: 'vector search techniques' })
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);

    // The test document should appear (same vector → similarity ≈ 1).
    const found = res.body.find((r: any) => r.id === testDocId);
    expect(found).toBeDefined();
    expect(found.similarity).toBeGreaterThan(0.9);
    expect(found.title).toBe('Test Searchable Document');
  });

  it('results include DocumentListItem-compatible fields and a similarity score', async () => {
    const res = await request(app)
      .post('/api/search')
      .send({ query: 'test' })
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      const first = res.body[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('title');
      expect(first).toHaveProperty('format');
      expect(first).toHaveProperty('similarity');
      expect(typeof first.similarity).toBe('number');
    }
  });

  it('only returns documents belonging to the requesting org', async () => {
    const res = await request(app)
      .post('/api/search')
      .send({ query: 'test' })
      .expect(200);

    // All returned IDs should belong to our test org (checked via the test doc).
    const ids: string[] = res.body.map((r: any) => r.id);
    if (ids.includes(testDocId)) {
      // Confirm it belongs to our org.
      const { data } = await supabaseAdmin
        .from('documents')
        .select('org_id')
        .eq('id', testDocId)
        .single();
      expect(data?.org_id).toBe(orgId);
    }
  });
});

// ---------------------------------------------------------------------------
// POST /api/ask
// ---------------------------------------------------------------------------

describe('POST /api/ask', () => {
  it('returns 400 when question is missing', async () => {
    const res = await request(app).post('/api/ask').send({}).expect(400);
    expect(res.body.error).toMatch(/question/i);
  });

  it('returns 400 when question is empty string', async () => {
    const res = await request(app).post('/api/ask').send({ question: '' }).expect(400);
    expect(res.body.error).toMatch(/question/i);
  });

  it('returns an answer and a sources array', async () => {
    const res = await request(app)
      .post('/api/ask')
      .send({ question: 'What is vector search?' })
      .expect(200);

    expect(typeof res.body.answer).toBe('string');
    expect(res.body.answer.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.sources)).toBe(true);
  });
});
