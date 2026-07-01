import { supabaseAdmin } from '../lib/supabase';

export async function checkExpiringDocuments(): Promise<void> {
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('id, title, review_due_date, org_id')
    .lte('review_due_date', sevenDaysFromNow)
    .gte('review_due_date', now)
    .not('review_due_date', 'is', null);
  if (error) { console.error('[notifications] Error fetching expiring docs:', error); return; }
  if (!data?.length) return;
  for (const doc of data) {
    // TODO: send actual email when email provider is configured
    console.log(`[notifications] Doc "${doc.title}" (${doc.id}) review due by ${doc.review_due_date}`);
  }
}
