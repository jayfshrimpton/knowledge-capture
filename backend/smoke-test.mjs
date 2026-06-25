// End-to-end smoke test: auth -> bootstrap -> capture (Gemini + DB) -> list -> export.
// Run from backend/ with: node smoke-test.mjs
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const PUBLISHABLE = 'sb_publishable_3wobr3j4Qh-faF83oN7Riw_WMU5juaf';
const API = 'http://localhost:3001';

const stamp = Date.now();
const email = `smoke+${stamp}@example.com`;
const password = `Test-${stamp}!`;

const log = (...a) => console.log(...a);
const fail = (msg, extra) => { console.error('❌ FAIL:', msg, extra ?? ''); process.exit(1); };

const admin = createClient(SUPABASE_URL, SECRET, { auth: { persistSession: false } });
const anon = createClient(SUPABASE_URL, PUBLISHABLE, { auth: { persistSession: false } });

// 1. Create a pre-confirmed auth user (bypasses email confirmation for the test).
const { data: created, error: cErr } = await admin.auth.admin.createUser({
  email, password, email_confirm: true,
});
if (cErr) fail('admin.createUser', cErr.message);
const userId = created.user.id;
log('✅ 1. Created auth user', email);

// 2. Sign in to get a real JWT.
const { data: signIn, error: sErr } = await anon.auth.signInWithPassword({ email, password });
if (sErr) fail('signInWithPassword', sErr.message);
const token = signIn.session.access_token;
const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
log('✅ 2. Signed in, got JWT');

// 3. /api/me should report not onboarded.
let r = await fetch(`${API}/api/me`, { headers: authHeaders });
let me = await r.json();
if (me.onboarded !== false) fail('/api/me expected onboarded:false', JSON.stringify(me));
log('✅ 3. /api/me -> onboarded:false (as expected for new user)');

// 4. Bootstrap an organisation.
r = await fetch(`${API}/api/bootstrap`, {
  method: 'POST', headers: authHeaders,
  body: JSON.stringify({ orgName: 'Smoke Test Engineering', name: 'Smoke Tester' }),
});
const boot = await r.json();
if (!r.ok || !boot.orgId) fail('/api/bootstrap', JSON.stringify(boot));
log('✅ 4. Bootstrapped org', boot.orgId);

// 5. Capture: send real notes through Gemini, persist.
const notes = `Replacing the main circulation pump on chiller unit 3. First isolate the
unit at the local panel and lock it out. Drain the condenser loop down past the
pump housing using the drain valve near the floor. Undo the four flange bolts,
note the gasket orientation, and remove the old pump. Fit the new pump with a
fresh gasket, torque the flange bolts to 40 Nm in a star pattern. Refill the
loop, bleed the air from the top vent, remove the lockout and restart at the
panel. Check for leaks and confirm flow rate reads above 12 litres per second.`;
r = await fetch(`${API}/api/capture`, {
  method: 'POST', headers: authHeaders,
  body: JSON.stringify({ title: 'Chiller 3 Pump Replacement', author: 'Smoke Tester', rawText: notes }),
});
const doc = await r.json();
if (!r.ok || !doc.id) fail('/api/capture', JSON.stringify(doc));
log(`✅ 5. Captured -> id=${doc.id} format=${doc.format} sections=${(doc.content||[]).length} tags=[${(doc.tags||[]).join(', ')}] warnings=${(doc.warnings||[]).length}`);
log(`        summary: ${doc.summary}`);

// 6. List documents for the org.
r = await fetch(`${API}/api/documents`, { headers: authHeaders });
const list = await r.json();
if (!r.ok || !Array.isArray(list) || list.length < 1) fail('/api/documents', JSON.stringify(list));
log(`✅ 6. Library lists ${list.length} document(s)`);

// 7. Export Word + PDF, check we get non-trivial binaries.
for (const format of ['word', 'pdf']) {
  r = await fetch(`${API}/api/documents/${doc.id}/export`, {
    method: 'POST', headers: authHeaders, body: JSON.stringify({ format }),
  });
  if (!r.ok) fail(`export ${format}`, await r.text());
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 500) fail(`export ${format} too small`, `${buf.length} bytes`);
  log(`✅ 7. Export ${format}: ${buf.length} bytes (${r.headers.get('content-type')})`);
}

log('\n🎉 ALL CHECKS PASSED — MVP works end to end.');
log(`   Test login (org already created, doc in Library):`);
log(`     email:    ${email}`);
log(`     password: ${password}`);
