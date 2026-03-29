import express, { Request, Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireSuperAdmin } from '../auth';
import { asyncHandler } from '../middleware/security';

const router = express.Router();

router.get('/logs', requireAuth, requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 100));
  const skip = (page - 1) * limit;

  const [data, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.auditLog.count()
  ]);

  res.json({ data, totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) });
}));

export default router;
