import express, { Request, Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../auth';
import { asyncHandler } from '../middleware/security';

const router = express.Router();

router.get('/summary', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const results = await Promise.all([
    prisma.client.count(),
    prisma.project.count(),
    prisma.user.count(),
    prisma.collaborator.count(),
    prisma.partner.count(),
    prisma.prospect.count(),
    prisma.contract.count(),
    prisma.mission.count(),
    prisma.project.groupBy({
      by: ['status'],
      _count: { _all: true }
    })
  ]);

  const clientsCount = results[0];
  const projectsCount = results[1];
  const usersCount = results[2];
  const collaboratorsCount = results[3];
  const partnersCount = results[4];
  const prospectsCount = results[5];
  const contractsCount = results[6];
  const missionsCount = results[7];
  const projectStatusRaw = results[8] as any[];

  const statusCounts = projectStatusRaw.reduce((acc: Record<string, number>, curr: any) => {
    acc[curr.status] = curr._count._all;
    return acc;
  }, {} as Record<string, number>);

  // Optionally add recent data for quick view
  const recentProjects = await prisma.project.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { client: { select: { name: true } } }
  });

  res.json({
    counts: {
      clients: clientsCount,
      projects: projectsCount,
      users: usersCount,
      collaborators: collaboratorsCount,
      partners: partnersCount,
      prospects: prospectsCount,
      contracts: contractsCount,
      missions: missionsCount,
      status: statusCounts
    },
    recentProjects
  });
}));

export default router;
