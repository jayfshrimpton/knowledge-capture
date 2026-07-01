import { supabaseAdmin } from '../lib/supabase';

export interface TestFixtures {
  orgId: string;
  userId: string;
}

/**
 * Creates a minimal test org + user in Supabase. Call in beforeAll.
 * Returns the IDs to inject into mocked auth middleware.
 */
export async function createTestFixtures(): Promise<TestFixtures> {
  const orgId = crypto.randomUUID();
  const userId = crypto.randomUUID();

  const { error: orgErr } = await supabaseAdmin.from('organisations').insert({
    id: orgId,
    name: 'Test Organisation (integration)',
    plan: 'starter',
    seats: 3,
  });
  if (orgErr) throw new Error(`createTestFixtures: org insert failed — ${orgErr.message}`);

  const { error: userErr } = await supabaseAdmin.from('users').insert({
    id: userId,
    org_id: orgId,
    name: 'Test User',
    email: `test+${userId}@commonplace-test.invalid`,
    role: 'admin',
    auth_provider: 'supabase',
  });
  if (userErr) throw new Error(`createTestFixtures: user insert failed — ${userErr.message}`);

  return { orgId, userId };
}

/**
 * Deletes all data created during a test suite for the given org.
 * Call in afterAll. Order matters — FK children before parents.
 */
export async function cleanupTestFixtures(orgId: string): Promise<void> {
  // ai_credit_events → document_versions → documents → users → organisations
  await supabaseAdmin.from('ai_credit_events').delete().eq('org_id', orgId);
  const { data: docs } = await supabaseAdmin
    .from('documents')
    .select('id')
    .eq('org_id', orgId);
  if (docs?.length) {
    const docIds = docs.map((d) => d.id);
    await supabaseAdmin.from('document_versions').delete().in('document_id', docIds);
  }
  await supabaseAdmin.from('documents').delete().eq('org_id', orgId);
  await supabaseAdmin.from('users').delete().eq('org_id', orgId);
  await supabaseAdmin.from('organisations').delete().eq('id', orgId);
}
