import 'dotenv/config';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type JwtPayload = {
  sub: string;
  role?: 'ADMIN' | 'COLLABORATOR';
  isSuperAdmin?: boolean;
  permissions?: string[];
  isPartial?: boolean;
  setupRequired?: boolean;
};

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
  }
}

// ── JWT Secret validation ─────────────────────────────────────────────────────
// Fail fast in production if the secret is missing or is the dev placeholder
const JWT_SECRET = process.env.JWT_SECRET || '';

if (!JWT_SECRET) {
  console.error(
    '[FATAL] JWT_SECRET environment variable is not set. ' +
      'Set it to a long random string in your .env file.'
  );
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

const EFFECTIVE_SECRET = JWT_SECRET || 'dev-secret-INSECURE-change-before-deploy';

// ── Helpers ───────────────────────────────────────────────────────────────────

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, EFFECTIVE_SECRET, { expiresIn: '8h' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, EFFECTIVE_SECRET) as JwtPayload;
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie('token');
}

// ── Middleware ────────────────────────────────────────────────────────────────

export function getUserFromRequest(req: Request): JwtPayload | null {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice('Bearer '.length);
  } else if ((req as any).cookies?.token) {
    token = (req as any).cookies.token;
  }

  if (!token) return null;

  try {
    return jwt.verify(token, EFFECTIVE_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getUserFromRequest(req);

  if (!user) {
    return res.status(401).json({ error: 'Non authentifié ou session expirée.' });
  }

  req.user = user;
  return next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Non authentifié.' });
  }
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
  }
  return next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Non authentifié.' });
  }
  if (!req.user.isSuperAdmin) {
    return res.status(403).json({ error: 'Accès réservé au Super Administrateur.' });
  }
  return next();
}

export function requirePermission(module: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });

    // Super Admin and ADMIN override all permission checks
    if (req.user.isSuperAdmin || req.user.role === 'ADMIN') return next();

    // Collaborators must have explicit module permission
    if (req.user.permissions?.includes(module)) return next();

    return res.status(403).json({
      error: `Accès refusé. Permission requise : module "${module}".`,
    });
  };
}
