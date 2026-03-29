import express, { Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requirePermission } from '../auth';
import { asyncHandler } from '../middleware/security';
import { logAction } from '../utils/audit';

const router = express.Router();

router.get('/', requireAuth, requirePermission('contacts'), asyncHandler(async (req: any, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const skip = (page - 1) * limit;

  const where: any = search ? {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { contact: { contains: search, mode: 'insensitive' } }
    ]
  } : {};

  const [data, totalCount] = await Promise.all([
    prisma.prospect.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.prospect.count({ where })
  ]);
  res.json({ data, totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) });
}));

router.post('/', requireAuth, requirePermission('contacts'), asyncHandler(async (req: any, res: Response) => {
  const { name, contact, email, status, notes } = req.body;
  const prospect = await prisma.prospect.create({
    data: { name, contact, email, status, notes }
  });
  await logAction(req.user!.sub, 'CREATE', 'CONTACT', prospect.id, `Création du contact ${prospect.name}`);
  res.status(201).json(prospect);
}));

router.put('/:id', requireAuth, requirePermission('contacts'), asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { name, contact, email, status, notes } = req.body;
  const prospect = await prisma.prospect.update({
    where: { id },
    data: { name, contact, email, status, notes }
  });
  await logAction(req.user!.sub, 'UPDATE', 'CONTACT', prospect.id, `Mise à jour du contact ${prospect.name}`);
  res.json(prospect);
}));

router.delete('/:id', requireAuth, requirePermission('contacts'), asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const prospect = await prisma.prospect.delete({ where: { id } });
  await logAction(req.user!.sub, 'DELETE', 'CONTACT', id, `Suppression du contact ${prospect.name}`);
  res.status(204).send();
}));

export default router;
