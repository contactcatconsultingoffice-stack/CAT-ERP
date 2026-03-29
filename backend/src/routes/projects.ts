import express, { Request, Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requirePermission } from '../auth';
import { validateRequest, ProjectSchema } from '../utils/validation';
import { asyncHandler } from '../middleware/security';
import { logAction } from '../utils/audit';

const router = express.Router();

router.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const skip = (page - 1) * limit;

  const where: any = search ? {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { reference: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ]
  } : {};

  if (req.user?.role === 'COLLABORATOR' && !req.user?.isSuperAdmin) {
    const collabo = await prisma.collaborator.findUnique({ where: { userId: req.user.sub } });
    if (collabo) {
      where.missions = { some: { collaboratorId: collabo.id } };
    } else {
      where.id = 'none'; // Return empty if no collaborator profile
    }
  }

  const [data, totalCount] = await Promise.all([
    prisma.project.findMany({
      where,
      include: { client: { select: { id: true, name: true, email: true } }, partner: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.project.count({ where })
  ]);

  res.json({ data, totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) });
}));

router.post('/', requireAuth, requirePermission('projects'), validateRequest(ProjectSchema), asyncHandler(async (req: any, res: Response) => {
  const { name, type, status, priority, clientId, partnerId, description } = req.body;
  
  const year = new Date().getFullYear();
  const count = await prisma.project.count();
  const seq = String(count + 1).padStart(3, '0');
  const reference = `PRJ-${year}-${seq}`;

  const project = await prisma.project.create({
    data: { name, type, status, priority, clientId, partnerId, description, reference }
  });
  await logAction(req.user!.sub, 'CREATE', 'PROJECT', project.id, `Création du projet ${project.name} (${reference})`);
  res.status(201).json(project);
}));

router.put('/:id', requireAuth, requirePermission('projects'), validateRequest(ProjectSchema), asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { name, type, status, priority, clientId, partnerId, description } = req.body;
  const project = await prisma.project.update({
    where: { id },
    data: { name, type, status, priority, clientId, partnerId, description }
  });
  await logAction(req.user!.sub, 'UPDATE', 'PROJECT', project.id, `Mise à jour du projet ${project.name}`);
  res.json(project);
}));

router.delete('/:id', requireAuth, requirePermission('projects'), asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const project = await prisma.project.delete({ where: { id } });
  await logAction(req.user!.sub, 'DELETE', 'PROJECT', id, `Suppression du projet ${project.name}`);
  res.status(204).send();
}));

export default router;
