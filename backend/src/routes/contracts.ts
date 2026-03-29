import express, { Request, Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requirePermission } from '../auth';
import { asyncHandler } from '../middleware/security';

const router = express.Router();

router.get('/', requireAuth, requirePermission('contracts'), asyncHandler(async (req: any, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const skip = (page - 1) * limit;

  const where: any = search ? {
    OR: [
      { title: { contains: search, mode: 'insensitive' } },
      { type: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } }
    ]
  } : {};

  const [data, totalCount] = await Promise.all([
    prisma.contract.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.contract.count({ where })
  ]);

  res.json({ data, totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) });
}));

router.post('/', requireAuth, requirePermission('contracts'), asyncHandler(async (req: any, res: Response) => {
  const { type, title, rawText, projectId, financialId, signedAt, location } =
    req.body;

  const contract = await prisma.contract.create({
    data: {
      type,
      title,
      rawText,
      projectId,
      financialId,
      signedAt,
      location
    }
  });

  res.status(201).json(contract);
}));

export default router;
