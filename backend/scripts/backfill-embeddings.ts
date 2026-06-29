/**
 * One-time backfill script: generates embeddings for all documents that
 * don't have one yet and stores them in the `embedding` column.
 *
 * Run from the backend/ directory:
 *   npx tsx scripts/backfill-embeddings.ts
 *
 * Requires SUPABASE_URL, SUPABASE_SECRET_KEY, and GEMINI_API_KEY in .env.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

function buildText(doc: { title: string; summary: string | null; raw_input: string | null }): string {
  const parts: string[] = [doc.title];
  if (doc.summary) parts.push(doc.summary);
  if (doc.raw_input) parts.push(doc.raw_input.slice(0, 4000));
  return parts.join('\n\n');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  console.log('Starting embedding backfill…\n');

  let processed = 0;
  let errors = 0;

  // Keep fetching the first batch of unembedded docs until none remain.
  // (Don't use offset pagination — as we update rows they leave the filter.)
  while (true) {
    const { data: docs, error: fetchError } = await supabase
      .from('documents')
      .select('id, title, summary, raw_input')
      .is('embedding', null)
      .limit(10);

    if (fetchError) {
      console.error('Failed to fetch batch:', fetchError.message);
      break;
    }

    if (!docs || docs.length === 0) break;

    for (const doc of docs) {
      try {
        const text = buildText(doc);
        const result = await embeddingModel.embedContent({
          content: { role: 'user', parts: [{ text }] },
          taskType: TaskType.RETRIEVAL_DOCUMENT,
        });
        const embedding = result.embedding.values;
        const vectorString = `[${embedding.join(',')}]`;

        const { error: updateError } = await supabase
          .from('documents')
          .update({ embedding: vectorString })
          .eq('id', doc.id);

        if (updateError) {
          console.error(`  ✗ ${doc.id} — ${updateError.message}`);
          errors++;
        } else {
          console.log(`  ✓ ${doc.id} — ${doc.title}`);
          processed++;
        }
      } catch (err) {
        console.error(`  ✗ ${doc.id} — ${err instanceof Error ? err.message : String(err)}`);
        errors++;
      }

      // Gentle rate-limiting to avoid Gemini quota issues.
      await sleep(200);
    }
  }

  console.log(`\nDone.  Processed: ${processed}  Errors: ${errors}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
