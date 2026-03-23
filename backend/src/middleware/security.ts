import { Request, Response, NextFunction } from 'express';

// In-memory rate limiter to prevent basic brute force and DDoS without external dependencies (Redis)
const rateLimits = new Map<string, { count: number, resetTime: number }>();

function createRateLimiter(maxReq: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Basic IP tracking
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const l = rateLimits.get(ip);
    
    if (!l || l.resetTime < now) {
      rateLimits.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (l.count >= maxReq) {
      return res.status(429).json({ error: 'Trop de requêtes. Veuillez patienter.' });
    }
    
    l.count++;
    next();
  };
}

export const authRateLimiter = createRateLimiter(10, 15 * 60 * 1000); // 10 requests / 15 minutes
export const apiRateLimiter = createRateLimiter(200, 60 * 1000);      // 200 requests / 1 minute

// Sets basic HTTP security headers
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
}

// Wraps an async route to automatically pass Promise rejections to the global Error Handler
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
