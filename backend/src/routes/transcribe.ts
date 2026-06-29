import { Router } from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireAuth } from '../middleware/auth';
import { logger } from '../lib/logger';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const ALLOWED_AUDIO = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/aac',
  'audio/flac',
  'audio/x-m4a',
  'video/webm',
  'video/mp4',
]);

router.post('/transcribe', requireAuth, upload.single('audio'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No audio file uploaded (field name must be "audio")' });
  }

  const ok =
    ALLOWED_AUDIO.has(file.mimetype) ||
    /\.(webm|mp4|mp3|wav|ogg|m4a|aac|flac)$/i.test(file.originalname);
  if (!ok) {
    return res.status(400).json({ error: 'Unsupported audio format' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent([
      'Transcribe this audio recording exactly as spoken. Output only the transcription text, no commentary, no labels.',
      {
        inlineData: {
          mimeType: file.mimetype,
          data: file.buffer.toString('base64'),
        },
      },
    ]);

    res.json({ transcript: result.response.text() });
  } catch (err) {
    logger.error('Gemini audio transcription failed', {
      route: 'POST /api/transcribe',
      errorType: err instanceof Error ? err.constructor.name : 'UnknownError',
    });
    res.status(500).json({ error: 'Transcription failed — please try again' });
  }
});

export default router;
