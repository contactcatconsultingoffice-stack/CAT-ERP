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

router.get('/financial-global', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const records = await prisma.financialRecord.findMany({
    include: { project: { select: { name: true, type: true } } },
    orderBy: { issuedAt: 'asc' }
  });

  const stats = {
    totalRevenue: 0,
    totalPending: 0,
    quotePipeline: 0,
    avgProjectValue: 0,
    monthlyRevenue: [] as { month: string; revenue: number; pending: number }[],
    revenueByType: [] as { name: string; value: number }[]
  };

  const monthlyMap = new Map<string, { revenue: number; pending: number }>();
  const typeMap = new Map<string, number>();

  records.forEach(r => {
    const amount = Number(r.amountTTC);
    const month = r.issuedAt.toISOString().substring(0, 7); // YYYY-MM
    
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, { revenue: 0, pending: 0 });
    }
    const mData = monthlyMap.get(month)!;

    if (r.kind === 'INVOICE') {
      if (r.status === 'PAID') {
        stats.totalRevenue += amount;
        mData.revenue += amount;
        
        const type = r.project?.type || 'AUTRE';
        typeMap.set(type, (typeMap.get(type) || 0) + amount);
      } else if (r.status === 'SENT' || r.status === 'PENDING') {
        stats.totalPending += amount;
        mData.pending += amount;
      }
    } else if (r.kind === 'QUOTE' && r.status === 'SENT') {
      stats.quotePipeline += amount;
    }
  });

  stats.avgProjectValue = records.length > 0 ? stats.totalRevenue / records.length : 0;
  
  stats.monthlyRevenue = Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    revenue: data.revenue,
    pending: data.pending
  })).sort((a, b) => a.month.localeCompare(b.month));

  stats.revenueByType = Array.from(typeMap.entries()).map(([name, value]) => ({
    name,
    value
  }));

  res.json(stats);
}));

export default router;
