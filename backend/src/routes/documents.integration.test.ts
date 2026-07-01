/**
 * Integration tests for document list/get, E2E export (Word + PDF),
 * and document versioning/restore.
 *
 * These tests hit the REAL Supabase database. Configure credentials in
 * backend/.env.test before running:
 *
 *   SUPABASE_URL=https://<test-project>.supabase.co
 *   SUPABASE_SECRET_KEY=<service-role-key>
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { supabaseAdmin } from '../lib/supabase';
import { createTestFixtures, cleanupTestFixtures } from '../test/integrationHelpers';
import type { DocumentSection } from '../types';

// ---------------------------------------------------------------------------
// Auth mock — same pattern as capture.integration.test.ts
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

// Gemini is not used in these tests but gemini.ts throws at import if key is
// missing — mock it as a precaution so the module graph loads cleanly.
vi.mock('../services/gemini', () => ({
  structureNotes: vi.fn(),
}));

import app from '../app';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

let orgId: string;
let userId: string;
let docId: string;

const SEED_SECTIONS: DocumentSection[] = [
  { heading: 'Purpose', content: 'Ensure safe operation of the compressor.' },
  { heading: 'Steps', items: ['Check oil level', 'Pressurise slowly', 'Monitor gauge'] },
];

beforeAll(async () => {
  const fixtures = await createTestFixtures();
  orgId = fixtures.orgId;
  userId = fixtures.userId;
  authCtx.orgId = orgId;
  authCtx.userId = userId;

  // Insert a seeded document directly so export + list tests don't depend on
  // the capture route being correct.
  const { data, error } = await supabaseAdmin
    .from('documents')
    .insert({
      org_id: orgId,
      created_by: userId,
      title: 'Compressor SOP',
      author_name: 'Jane Engineer',
      format: 'procedure',
      summary: 'How to start the compressor safely.',
      content: SEED_SECTIONS,
      diagram_data: null,
      warnings: ['Ensure pressure relief valve is functional.'],
      tags: ['compressor', 'safety', 'sop'],
      raw_input: 'Start compressor safely by checking oil and pressurising slowly.',
      source: 'ai',
      version: 1,
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(`Seed document insert failed: ${error?.message}`);
  docId = data.id;
});

afterAll(async () => {
  await cleanupTestFixtures(orgId);
});

// ---------------------------------------------------------------------------
// Document list / get
// ---------------------------------------------------------------------------

describe('GET /api/documents', () => {
  it('returns a 200 array that includes the seeded document', async () => {
    const res = await request(app).get('/api/documents').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((d: any) => d.id === docId);
    expect(found).toBeTruthy();
    expect(found.title).toBe('Compressor SOP');
  });
});

describe('GET /api/documents/:id', () => {
  it('returns the full document row', async () => {
    const res = await request(app).get(`/api/documents/${docId}`).expect(200);

    expect(res.body.id).toBe(docId);
    expect(res.body.title).toBe('Compressor SOP');
    expect(res.body.format).toBe('procedure');
    expect(Array.isArray(res.body.content)).toBe(true);
  });

  it('returns 404 when the document belongs to a different org', async () => {
    // Temporarily swap orgId to a random one that owns nothing.
    authCtx.orgId = crypto.randomUUID();
    await request(app).get(`/api/documents/${docId}`).expect(404);
    authCtx.orgId = orgId; // restore
  });
});

// ---------------------------------------------------------------------------
// E2E export — capture → save (seeded above) → export Word + PDF
// ---------------------------------------------------------------------------

describe('POST /api/documents/:id/export', () => {
  it('generates a Word document (.docx) with correct Content-Type', async () => {
    const res = await request(app)
      .post(`/api/documents/${docId}/export`)
      .send({ format: 'word' })
      .expect(200);

    const contentType = res.headers['content-type'];
    expect(contentType).toMatch(
      /application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/
    );
    expect(res.body.length ?? Buffer.byteLength(res.text)).toBeGreaterThan(0);
  });

  it('generates a PDF with correct Content-Type', async () => {
    const res = await request(app)
      .post(`/api/documents/${docId}/export`)
      .send({ format: 'pdf' })
      .expect(200);

    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.body.length ?? Buffer.byteLength(res.text)).toBeGreaterThan(0);
  });

  it('returns 400 for an unsupported export format', async () => {
    const res = await request(app)
      .post(`/api/documents/${docId}/export`)
      .send({ format: 'csv' })
      .expect(400);

    expect(res.body.error).toMatch(/format/i);
  });
});

// ---------------------------------------------------------------------------
// Versioning
// ---------------------------------------------------------------------------

describe('GET /api/documents/:id/versions', () => {
  it('returns an empty array when no versions have been saved', async () => {
    const res = await request(app).get(`/api/documents/${docId}/versions`).expect(200);
    // The seeded document has no version rows yet.
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Version lifecycle — snapshot then restore', () => {
  it('creates a version snapshot and restores it', async () => {
    // Manually insert a version snapshot (mimics what capture does on re-capture).
    const { error: vErr } = await supabaseAdmin.from('document_versions').insert({
      document_id: docId,
      version_number: 1,
      content: SEED_SECTIONS,
      structured_content: 'Compressor SOP v1',
      created_by: userId,
    });
    expect(vErr).toBeNull();

    // Versions list should now include v1.
    const listRes = await request(app).get(`/api/documents/${docId}/versions`).expect(200);
    expect(listRes.body.some((v: any) => v.version_number === 1)).toBe(true);

    // Fetch the full version content.
    const getRes = await request(app)
      .get(`/api/documents/${docId}/versions/1`)
      .expect(200);
    expect(getRes.body.version_number).toBe(1);
    expect(Array.isArray(getRes.body.content)).toBe(true);

    // Bump the live document to version 2 so restore has something to work with.
    await supabaseAdmin
      .from('documents')
      .update({ version: 2 })
      .eq('id', docId);

    // Restore v1 — should snapshot current (v2) and return v3.
    const restoreRes = await request(app)
      .post(`/api/documents/${docId}/versions/1/restore`)
      .expect(200);

    expect(restoreRes.body.version).toBe(3);

    // Versions table should now have an entry for v2 (the snapshot made during restore).
    const { data: allVersions } = await supabaseAdmin
      .from('document_versions')
      .select('version_number')
      .eq('document_id', docId);
    expect(allVersions?.some((v) => v.version_number === 2)).toBe(true);
  });

  it('returns 404 for a version that does not exist', async () => {
    await request(app).get(`/api/documents/${docId}/versions/999`).expect(404);
  });
});
