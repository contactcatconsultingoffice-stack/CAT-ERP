import { Request, Response, NextFunction } from 'express';

// In-memory rate limiter to prevent basic brute force and DDoS without external dependencies (Redis)
const rateLimits = new Map<string, { count: number, resetTime: number }>();

// Periodically purge expired entries to prevent memory leaks in long-running processes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimits.entries()) {
    if (val.resetTime < now) rateLimits.delete(key);
  }
}, 5 * 60 * 1000); // every 5 minutes

function createRateLimiter(limiterName: string, maxReq: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `${limiterName}:${ip}`;
    const now = Date.now();
    const l = rateLimits.get(key);
    
    if (!l || l.resetTime < now) {
      rateLimits.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (l.count >= maxReq) {
      return res.status(429).json({ error: 'Trop de requêtes. Veuillez patienter.' });
    }
    
    l.count++;
    next();
  };
}

export const authRateLimiter = createRateLimiter('auth', 50, 15 * 60 * 1000); // 50 requests / 15 minutes
export const apiRateLimiter = createRateLimiter('api', 500, 60 * 1000);      // 500 requests / 1 minute

// Sets basic & advanced HTTP security headers
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CSP: No unsafe-inline for scripts — React built by Vite uses no inline scripts.
  // unsafe-inline on style-src is still needed for dynamic CSS-in-JS patterns.
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'");
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
}

// Wraps an async route to automatically pass Promise rejections to the global Error Handler
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
