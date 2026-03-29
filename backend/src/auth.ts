import 'dotenv/config';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type JwtPayload = {
  sub: string;
  role: 'ADMIN' | 'COLLABORATOR';
  isSuperAdmin?: boolean;
  permissions?: string[];
};

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000 // 8 hours
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie('token');
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice('Bearer '.length);
  } else if ((req as any).cookies?.token) {
    token = (req as any).cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
}

export function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!req.user.isSuperAdmin) {
    return res.status(403).json({ error: 'Accès réservé au Super Administrateur.' });
  }
  return next();
}

export function requirePermission(module: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    // Super Admin and ADMIN (Associé) overrides all
    if (req.user.isSuperAdmin || req.user.role === 'ADMIN') return next();
    // Others (Collaborators) must have the module in their permissions
    if (req.user.permissions?.includes(module)) return next();
    
    return res.status(403).json({ error: `Accès refusé. Vous n'avez pas la permission de gérer le module: ${module}` });
  };
}


