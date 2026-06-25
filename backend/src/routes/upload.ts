import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { extractText, FileParseError } from '../services/fileParser';
import { supabaseAdmin, STORAGE_BUCKET } from '../lib/supabase';
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

/**
 * POST /api/upload — multipart form with field "file".
 * Extracts text, stores the original in Supabase Storage, and returns
 * { rawText, filePath }.
 */
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  const { orgId } = req.auth!;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded (field name must be "file")' });
  }

  const okType = ALLOWED.has(file.mimetype) || /\.(txt|docx|pdf)$/i.test(file.originalname);
  if (!okType) {
    return res.status(400).json({ error: 'Only .txt, .docx and .pdf files are supported' });
  }

  let rawText: string;
  try {
    rawText = await extractText(file.buffer, file.originalname, file.mimetype);
  } catch (err) {
    if (err instanceof FileParseError) {
      return res.status(422).json({ error: err.message });
    }
    logger.error('Unexpected file parse error', { route: 'POST /api/upload', errorType: 'FileParseError' });
    return res.status(500).json({ error: "We couldn't read this file. It may be corrupted or in an unsupported format." });
  }

  if (!rawText) {
    return res.status(422).json({ error: 'No readable text was found in the file.' });
  }

  // Store the original source file (best effort — do not fail the request if this errors).
  let filePath: string | null = null;
  try {
    const safeName = file.originalname.replace(/[^a-z0-9.\-_]/gi, '_');
    const path = `${orgId}/sources/${Date.now()}_${safeName}`;
    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
    if (!error) filePath = path;
    else logger.warn('Source file storage upload failed', { route: 'POST /api/upload', errorType: 'StorageUploadError' });
  } catch (err) {
    logger.warn('Source file storage upload threw', { route: 'POST /api/upload', errorType: 'StorageUploadError' });
  }

  res.json({ rawText, filePath });
});

export default router;
