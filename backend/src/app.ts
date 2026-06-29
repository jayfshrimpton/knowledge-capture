import express from 'express';
import cors from 'cors';
import { logger } from './lib/logger';

import bootstrapRoutes from './routes/bootstrap';
import captureRoutes from './routes/capture';
import uploadRoutes from './routes/upload';
import documentRoutes from './routes/documents';
import templateRoutes from './routes/templates';
import creditsRoutes from './routes/credits';
import billingRoutes from './routes/billing';
import searchRoutes from './routes/search';

const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const app = express();

app.use(cors({ origin: origins }));

// Stripe webhook needs the raw body for signature verification.
// Mount it BEFORE express.json() so the body is not parsed as JSON.
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api', bootstrapRoutes);
app.use('/api', captureRoutes);
app.use('/api', uploadRoutes);
app.use('/api', documentRoutes);
app.use('/api', templateRoutes);
app.use('/api', creditsRoutes);
app.use('/api', billingRoutes);
app.use('/api', searchRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { errorType: err?.code ?? 'UnhandledError' });
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File is too large (max 15 MB)' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
