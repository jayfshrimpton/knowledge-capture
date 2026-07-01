import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../middleware/auth';
import { supabaseAdmin, STORAGE_BUCKET } from '../lib/supabase';
import { extractText, FileParseError } from '../services/fileParser';
import { extractStyle, sanitizeStyle } from '../services/styleExtractor';
import { setDefaultStyle, toStyleResponse } from '../services/styles';
import { BrandStyle, OrgStyleRow } from '../types';
import { logger } from '../lib/logger';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
});

const ALLOWED = new Set([
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const LOGO_CONTENT_TYPE: Record<string, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
};

/** GET /api/styles — list the org's saved brand styles. */
router.get('/styles', requireAuth, async (req, res) => {
  const { orgId } = req.auth!;
  const { data, error } = await supabaseAdmin
    .from('org_styles')
    .select('*')
    .eq('org_id', orgId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('List org styles failed', { route: 'GET /api/styles', errorType: 'SupabaseQueryError' });
    return res.status(500).json({ error: 'Failed to load styles' });
  }

  res.json((data as OrgStyleRow[]).map(toStyleResponse));
});

/**
 * POST /api/styles/extract — multipart form with field "file" (admin only).
 * Extracts a brand style from the uploaded reference document, stores the
 * source file and any logo in storage, and returns a DRAFT style for the admin
 * to preview and edit. Nothing is persisted to org_styles until POST /api/styles.
 */
router.post('/styles/extract', requireAuth, requireRole('admin'), upload.single('file'), async (req, res) => {
  const { orgId } = req.auth!;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded (field name must be "file")' });
  }

  const okType = ALLOWED.has(file.mimetype) || /\.(txt|docx|pdf)$/i.test(file.originalname);
  if (!okType) {
    return res.status(400).json({ error: 'Only .txt, .docx and .pdf files are supported' });
  }

  // Extract text for the AI fallback (non-fatal if it fails).
  let rawText = '';
  try {
    rawText = await extractText(file.buffer, file.originalname, file.mimetype);
  } catch (err) {
    if (!(err instanceof FileParseError)) {
      logger.warn('Style source text extraction threw', { route: 'POST /api/styles/extract', errorType: 'FileParseError' });
    }
  }

  let extracted;
  try {
    extracted = await extractStyle({
      buffer: file.buffer,
      filename: file.originalname,
      mimetype: file.mimetype,
      rawText,
    });
  } catch (err) {
    logger.error('Style extraction failed', { route: 'POST /api/styles/extract', errorType: 'StyleExtractError' });
    return res.status(500).json({ error: "We couldn't read a style from this document. Try a .docx file." });
  }

  // Store the original reference file (best effort).
  let sourceFilePath: string | null = null;
  try {
    const safeName = file.originalname.replace(/[^a-z0-9.\-_]/gi, '_');
    const path = `${orgId}/style-sources/${Date.now()}_${safeName}`;
    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
    if (!error) sourceFilePath = path;
  } catch {
    logger.warn('Style source upload failed', { route: 'POST /api/styles/extract', errorType: 'StorageUploadError' });
  }

  // Store the extracted logo (best effort) and record its path on the style.
  if (extracted.logo) {
    try {
      const ext = extracted.logo.ext;
      const path = `${orgId}/styles/logo_${Date.now()}.${ext}`;
      const { error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(path, extracted.logo.buffer, {
          contentType: LOGO_CONTENT_TYPE[ext] ?? 'application/octet-stream',
          upsert: false,
        });
      if (!error) {
        extracted.style.logo = { path, ext };
      } else {
        extracted.style.logo = null;
      }
    } catch {
      logger.warn('Style logo upload failed', { route: 'POST /api/styles/extract', errorType: 'StorageUploadError' });
      extracted.style.logo = null;
    }
  }

  res.json({
    name: file.originalname.replace(/\.[^.]+$/, '') || 'Company style',
    style: extracted.style,
    method: extracted.method,
    notes: extracted.notes,
    sourceFilePath,
    sourceFilename: file.originalname,
  });
});

/**
 * POST /api/styles — persist a style (admin only).
 * Body: { name, style, sourceFilePath?, sourceFilename?, makeDefault? }
 * The logo path travels inside `style.logo` (set by the extract step).
 */
router.post('/styles', requireAuth, requireRole('admin'), async (req, res) => {
  const { orgId, userId } = req.auth!;
  const name = (req.body?.name ?? '').trim();
  if (!name) return res.status(400).json({ error: 'A style name is required' });

  const style: BrandStyle = sanitizeStyle(req.body?.style);
  // Preserve the logo reference (sanitizeStyle keeps `logo` verbatim).
  const sourceFilePath = req.body?.sourceFilePath ?? null;
  const sourceFilename = req.body?.sourceFilename ?? null;

  // First style for an org becomes the default automatically.
  const { count } = await supabaseAdmin
    .from('org_styles')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId);
  const makeDefault = req.body?.makeDefault === true || (count ?? 0) === 0;

  if (makeDefault) {
    await supabaseAdmin
      .from('org_styles')
      .update({ is_default: false })
      .eq('org_id', orgId)
      .eq('is_default', true);
  }

  const { data, error } = await supabaseAdmin
    .from('org_styles')
    .insert({
      org_id: orgId,
      created_by: userId,
      name,
      style,
      is_default: makeDefault,
      source_file_path: sourceFilePath,
      source_filename: sourceFilename,
      logo_path: style.logo?.path ?? null,
    })
    .select('*')
    .single();

  if (error || !data) {
    logger.error('Save org style failed', { route: 'POST /api/styles', errorType: 'SupabaseInsertError' });
    return res.status(500).json({ error: 'Failed to save style' });
  }

  res.status(201).json(toStyleResponse(data as OrgStyleRow));
});

/** PATCH /api/styles/:id — rename or edit a style's definition (admin only). */
router.patch('/styles/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { orgId } = req.auth!;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof req.body?.name === 'string') {
    const name = req.body.name.trim();
    if (!name) return res.status(400).json({ error: 'Name cannot be empty' });
    update.name = name;
  }
  if (req.body?.style !== undefined) {
    const style = sanitizeStyle(req.body.style);
    update.style = style;
    update.logo_path = style.logo?.path ?? null;
  }

  if (Object.keys(update).length === 1) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  const { data, error } = await supabaseAdmin
    .from('org_styles')
    .update(update)
    .eq('id', req.params.id)
    .eq('org_id', orgId)
    .select('*')
    .single();

  if (error || !data) {
    logger.error('Update org style failed', { route: 'PATCH /api/styles/:id', errorType: 'SupabaseUpdateError' });
    return res.status(500).json({ error: 'Failed to update style' });
  }

  res.json(toStyleResponse(data as OrgStyleRow));
});

/** POST /api/styles/:id/default — make this the org's default style (admin only). */
router.post('/styles/:id/default', requireAuth, requireRole('admin'), async (req, res) => {
  const { orgId } = req.auth!;

  const { data: target } = await supabaseAdmin
    .from('org_styles')
    .select('id')
    .eq('id', req.params.id)
    .eq('org_id', orgId)
    .maybeSingle();
  if (!target) return res.status(404).json({ error: 'Style not found' });

  const ok = await setDefaultStyle(orgId, req.params.id);
  if (!ok) {
    logger.error('Set default org style failed', { route: 'POST /api/styles/:id/default', errorType: 'SupabaseUpdateError' });
    return res.status(500).json({ error: 'Failed to set default style' });
  }

  res.json({ ok: true });
});

/** DELETE /api/styles/:id — remove a style (admin only). */
router.delete('/styles/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { orgId } = req.auth!;

  const { error } = await supabaseAdmin
    .from('org_styles')
    .delete()
    .eq('id', req.params.id)
    .eq('org_id', orgId);

  if (error) {
    logger.error('Delete org style failed', { route: 'DELETE /api/styles/:id', errorType: 'SupabaseDeleteError' });
    return res.status(500).json({ error: 'Failed to delete style' });
  }

  res.json({ ok: true });
});

export default router;
