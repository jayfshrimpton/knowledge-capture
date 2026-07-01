/**
 * migrate.ts — idempotent Supabase migration runner
 *
 * Reads every .sql file in supabase/migrations/ (alphabetically) and runs any
 * that haven't been applied yet, tracking state in a _migration_files table.
 *
 * Usage:
 *   npm run migrate                  # apply pending migrations
 *   npm run migrate -- --check       # exit 1 if any migration is pending (CI mode)
 *
 * Requires DATABASE_URL in .env — copy it from Supabase:
 *   Dashboard → Settings → Database → Connection string (URI mode, port 5432)
 */

import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌  Missing DATABASE_URL in .env');
  console.error(
    '    Copy it from Supabase Dashboard → Settings → Database → Connection string (URI)'
  );
  process.exit(1);
}

const CHECK_ONLY = process.argv.includes('--check');
const MIGRATIONS_DIR = path.resolve(__dirname, '../../supabase/migrations');

async function main(): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    // Tracking table — safe to run every time
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migration_files (
        filename   text PRIMARY KEY,
        applied_at timestamptz DEFAULT now()
      );
    `);

    // Collect applied filenames
    const { rows } = await client.query<{ filename: string }>(
      'SELECT filename FROM _migration_files'
    );
    const applied = new Set(rows.map((r) => r.filename));

    // All local .sql files in order
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log('✅  All migrations are up to date.');
      return;
    }

    if (CHECK_ONLY) {
      console.error(`❌  ${pending.length} migration(s) not yet applied:`);
      pending.forEach((f) => console.error(`    • ${f}`));
      process.exit(1);
    }

    console.log(`🔄  Applying ${pending.length} pending migration(s)…\n`);

    for (const filename of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf-8');
      process.stdout.write(`  → ${filename} … `);

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO _migration_files (filename) VALUES ($1) ON CONFLICT DO NOTHING',
          [filename]
        );
        await client.query('COMMIT');
        console.log('done');
      } catch (err) {
        await client.query('ROLLBACK');
        console.log('FAILED');
        console.error(`\n❌  Error in ${filename}:`);
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    }

    console.log('\n✅  All migrations applied successfully.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
