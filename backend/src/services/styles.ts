import { supabaseAdmin, STORAGE_BUCKET } from '../lib/supabase';
import { BrandStyle, OrgStyleRow, ResolvedStyle } from '../types';
import { logger } from '../lib/logger';

/**
 * Loads an organisation's default brand style, ready for the exporter, with the
 * logo image bytes downloaded from storage. Returns null when the org has no
 * default style (in which case the exporter uses its built-in look).
 */
export async function getDefaultStyle(orgId: string): Promise<ResolvedStyle | null> {
  const { data, error } = await supabaseAdmin
    .from('org_styles')
    .select('style, logo_path')
    .eq('org_id', orgId)
    .eq('is_default', true)
    .maybeSingle();

  if (error) {
    logger.warn('Failed to load default org style', { errorType: 'SupabaseQueryError' });
    return null;
  }
  if (!data) return null;

  const style = data.style as BrandStyle;
  let logo: ResolvedStyle['logo'] = null;

  if (style.logo?.path) {
    try {
      const { data: file, error: dlErr } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .download(style.logo.path);
      if (!dlErr && file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        logo = { buffer, ext: style.logo.ext };
      }
    } catch {
      logger.warn('Failed to download style logo', { errorType: 'StorageDownloadError' });
    }
  }

  return { style, logo };
}

/**
 * Clears the default flag from every style in an org, then sets it on one row.
 * The partial unique index (one default per org) requires clearing first.
 */
export async function setDefaultStyle(orgId: string, styleId: string): Promise<boolean> {
  const clear = await supabaseAdmin
    .from('org_styles')
    .update({ is_default: false })
    .eq('org_id', orgId)
    .eq('is_default', true);
  if (clear.error) return false;

  const set = await supabaseAdmin
    .from('org_styles')
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq('org_id', orgId)
    .eq('id', styleId);
  return !set.error;
}

/** Trims an OrgStyleRow to the fields returned by the API. */
export function toStyleResponse(row: OrgStyleRow) {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.is_default,
    style: row.style,
    sourceFilename: row.source_filename,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
