import 'dotenv/config';
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

// CORS configuration supporting comma-separated origins
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', asyncHandler(async (_req: express.Request, res: express.Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.json({ status: 'ok', db: 'disconnected' });
  }
}));

// API Routes
app.use('/api/auth', authRoutes); // Note: frontend uses /api/login, etc. directly currently.
// Wait, I should check the current frontend API calls.
// If the frontend calls /api/login, I should mount authRoutes at /api or adjust the routes in auth.ts.
// In auth.ts I used router.post('/login', ...). So mounting at /api works.
app.use('/api', authRoutes);
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

// Catch-all route for unknown API endpoints
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Route de l\'API introuvable.' });
});

// GLOBAL ERROR HANDLER (MUST BE LAST APP.USE)
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend API listening on http://localhost:${PORT}`);
});
