import 'dotenv/config';
import { validateEnv } from './utils/env-validation';

// Validate environment variables on startup
validateEnv();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { prisma } from './prisma';
import { securityHeaders, apiRateLimiter, asyncHandler } from './middleware/security';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import projectRoutes from './routes/projects';
import collaboratorRoutes from './routes/collaborators';
import userRoutes from './routes/users';
import partnerRoutes from './routes/partners';
import prospectRoutes from './routes/prospects';
import financialRoutes from './routes/financial';
import contractRoutes from './routes/contracts';
import missionRoutes from './routes/missions';
import adminRoutes from './routes/admin';
import dashboardRoutes from './routes/dashboard';
import ratesRoutes from './routes/rates';
import commentRoutes from './routes/comments';
import calendarRoutes from './routes/calendar';

const app = express();

// Security Headers & Global API Rate Limiter
app.use(securityHeaders);
app.use('/api/', apiRateLimiter);
app.use(cookieParser());

// CORS — strict: only allow explicitly configured origins
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server (no origin) or matching origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

// Body parser with explicit size limit (prevents large payload attacks)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Health check
app.get(
  '/api/health',
  asyncHandler(async (_req: express.Request, res: express.Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', db: 'connected' });
    } catch {
      res.status(503).json({ status: 'degraded', db: 'disconnected' });
    }
  })
);

// API Routes — auth mounted ONCE at /api
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/collaborators', collaboratorRoutes);
app.use('/api/users', userRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/prospects', prospectRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/rates', ratesRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/calendar', calendarRoutes);

// Catch-all for unknown API endpoints
app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: "Route de l'API introuvable." });
});

// GLOBAL ERROR HANDLER (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend API listening on http://localhost:${PORT}`);
});
