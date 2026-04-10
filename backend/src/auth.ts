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
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error(
    '[FATAL] JWT_SECRET environment variable is not set. ' +
      'Set it to a long random string in your .env file.'
  );
  process.exit(1); // Fail fast in ALL environments — no dev-secret fallback
}

const EFFECTIVE_SECRET = JWT_SECRET;

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
  // HttpOnly cookie ONLY — Bearer header bypassed to prevent header injection attacks.
  // The Electron desktop app sends requests to the API server directly via the same cookie mechanism.
  const token = (req as any).cookies?.token;
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

export function require2FASetupAuth(req: Request, res: Response, next: NextFunction) {
  // 1. Try to authenticate via Cookie (for users setting up 2FA from their Dashboard)
  const cookieToken = (req as any).cookies?.token;
  if (cookieToken) {
    try {
      req.user = jwt.verify(cookieToken, EFFECTIVE_SECRET) as JwtPayload;
      return next();
    } catch {
      // Fall through to try Bearer
    }
  }

  // 2. Try to authenticate via Bearer token (for SuperAdmins forced to setup 2FA during Login)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(bearerToken, EFFECTIVE_SECRET) as JwtPayload;
      // Ensure the Bearer token is strictly a partial auth token to avoid abuse
      if (!decoded.isPartial) {
        return res.status(401).json({ error: 'Token invalide pour la phase d\'authentification partielle.' });
      }
      req.user = decoded;
      return next();
    } catch {
      return res.status(401).json({ error: 'Session de pré-authentification invalide ou expirée.' });
    }
  }

  // 3. Try to authenticate via preAuthToken in body (for frontend api client)
  if (req.body && req.body.preAuthToken) {
    try {
      const decoded = jwt.verify(req.body.preAuthToken, EFFECTIVE_SECRET) as JwtPayload;
      if (!decoded.isPartial) {
        return res.status(401).json({ error: 'Token invalide pour la phase d\'authentification partielle.' });
      }
      req.user = decoded;
      return next();
    } catch {
      return res.status(401).json({ error: 'Session de pré-authentification invalide ou expirée.' });
    }
  }

  return res.status(401).json({ error: 'Non authentifié.' });
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
