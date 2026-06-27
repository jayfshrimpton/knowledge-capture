import { supabaseAdmin } from '../lib/supabase';
import { DocumentFormat } from '../types';

// Monthly credit allocations per plan. null = unlimited (enterprise).
export const PLAN_LIMITS: Record<string, number | null> = {
  starter: 50,
  business: 200,
  enterprise: null,
};

/**
 * Determine how many credits a capture will cost.
 *
 * Costs from LOR1-3:
 *   - Diagram output: 5 credits
 *   - Long document (>500 words): 2 credits
 *   - Short note: 1 credit
 *
 * We estimate the format before calling Gemini by inspecting the raw input
 * length. After structuring we pass the actual format for diagram detection.
 */
export function estimateCreditCost(rawText: string): number {
  const wordCount = rawText.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 500) return 2;
  return 1;
}

export function finalCreditCost(format: DocumentFormat, rawText: string): number {
  if (format === 'diagram') return 5;
  const wordCount = rawText.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 500) return 2;
  return 1;
}

export interface CreditsStatus {
  plan: string;
  limit: number | null;   // null = unlimited
  used: number;
  remaining: number | null; // null = unlimited
}

/**
 * Returns the org's credit usage for the current calendar month.
 */
export async function getCreditsStatus(orgId: string): Promise<CreditsStatus> {
  // Get plan and any custom override
  const { data: org, error: orgErr } = await supabaseAdmin
    .from('organisations')
    .select('plan, ai_credits_override')
    .eq('id', orgId)
    .single();

  if (orgErr || !org) throw new Error('Failed to load organisation');

  const plan: string = org.plan ?? 'starter';
  const limit: number | null = org.ai_credits_override ?? PLAN_LIMITS[plan] ?? null;

  // Sum credits used this calendar month
  const periodStart = new Date();
  periodStart.setDate(1);
  periodStart.setHours(0, 0, 0, 0);

  const { data: usageData, error: usageErr } = await supabaseAdmin
    .from('ai_credit_events')
    .select('credits')
    .eq('org_id', orgId)
    .gte('created_at', periodStart.toISOString());

  if (usageErr) throw new Error('Failed to load credit usage');

  const used = (usageData ?? []).reduce((sum, row) => sum + (row.credits ?? 0), 0);
  const remaining = limit === null ? null : Math.max(0, limit - used);

  return { plan, limit, used, remaining };
}

/**
 * Checks whether the org has enough credits for a capture.
 * Returns true if allowed, false if limit reached.
 * Enterprise (unlimited) always returns true.
 */
export async function hasCredits(orgId: string, cost: number): Promise<boolean> {
  const status = await getCreditsStatus(orgId);
  if (status.remaining === null) return true; // unlimited
  return status.remaining >= cost;
}

/**
 * Records credit consumption after a successful capture.
 */
export async function deductCredits(
  orgId: string,
  userId: string,
  credits: number,
  documentId: string | null,
  description?: string
): Promise<void> {
  const { error } = await supabaseAdmin.from('ai_credit_events').insert({
    org_id: orgId,
    user_id: userId,
    document_id: documentId,
    credits,
    description: description ?? 'AI document structuring',
  });

  if (error) throw new Error('Failed to record credit usage');
}
