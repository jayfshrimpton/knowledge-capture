import { supabaseAdmin } from './supabase';
import { UserRole } from '../types';

/**
 * Returns the set of document IDs visible to the given user.
 * Returns null for admins (no ID filter — org_id alone is sufficient).
 * Throws if the Supabase RPC fails.
 */
export async function getVisibleDocIds(
  orgId: string,
  userId: string,
  role: UserRole,
): Promise<string[] | null> {
  if (role === 'admin') return null;

  const rpc = role === 'member' ? 'get_member_visible_docs' : 'get_guest_visible_docs';
  const { data, error } = await supabaseAdmin.rpc(rpc, { p_org_id: orgId, p_user_id: userId });
  if (error) throw error;
  return (data ?? []).map((r: { document_id: string }) => r.document_id);
}
