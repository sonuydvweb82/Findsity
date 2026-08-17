import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { UPLOAD_DIR } from './middleware/upload.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import itemRoutes from './routes/item.routes.js';
import claimRoutes from './routes/claim.routes.js';
import messageRoutes from './routes/message.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import reportRoutes from './routes/report.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import adminRoutes from './routes/admin.routes.js';
import userRoutes from './routes/user.routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createApp(): express.Express {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json({ limit: '2mb' }));

  // Static uploads (local image storage fallback)
  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'findsity-api', time: new Date().toISOString() });
  });

  // Rate limiting
  const apiLimiter = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false });
  const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });
  const uploadLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/items', apiLimiter, itemRoutes);
  app.use('/api/claims', apiLimiter, claimRoutes);
  app.use('/api/conversations', apiLimiter, messageRoutes);
  app.use('/api/notifications', apiLimiter, notificationRoutes);
  app.use('/api/reports', apiLimiter, reportRoutes);
  app.use('/api/uploads', uploadLimiter, uploadRoutes);
  app.use('/api/admin', apiLimiter, adminRoutes);
  app.use('/api/users', apiLimiter, userRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}