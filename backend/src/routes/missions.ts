import express, { Request, Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requirePermission, requireAdmin } from '../auth';
import { asyncHandler } from '../middleware/security';

const router = express.Router();

router.get(
  '/',
  requireAuth,
  requirePermission('missions'),
  asyncHandler(async (req: any, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const skip = (page - 1) * limit;

    const where: any = search
      ? {
          OR: [
            { description: { contains: search, mode: 'insensitive' } },
            { project: { name: { contains: search, mode: 'insensitive' } } },
            { collaborator: { user: { name: { contains: search, mode: 'insensitive' } } } },
          ],
        }
      : {};

    const [data, totalCount] = await Promise.all([
      prisma.mission.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          collaborator: {
            include: { user: { select: { name: true, email: true } } },
          },
        },
        orderBy: { performedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.mission.count({ where }),
    ]);

    res.json({
      data,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    });
  })
);

router.post(
  '/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: any, res: Response) => {
    const { projectId, collaboratorId, description, hours, performedAt } = req.body;

    if (!projectId || !collaboratorId || !description || hours == null) {
      return res.status(400).json({ error: 'Champs requis manquants.' });
    }

    const mission = await prisma.mission.create({
      data: {
        projectId,
        collaboratorId,
        description,
        hours: parseFloat(hours),
        performedAt: performedAt ? new Date(performedAt) : new Date(),
      },
    });

    res.status(201).json(mission);
  })
);

router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: any, res: Response) => {
    const { id } = req.params;
    await prisma.mission.delete({ where: { id } });
    res.status(204).send();
  })
);

export default router;
