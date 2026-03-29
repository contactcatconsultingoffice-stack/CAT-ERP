import express, { Request, Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requirePermission } from '../auth';
import { validateRequest, ClientSchema } from '../utils/validation';
import { asyncHandler } from '../middleware/security';
import { logAction } from '../utils/audit';

const router = express.Router();

router.get('/', requireAuth, requirePermission('clients'), asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const skip = (page - 1) * limit;

  const where: any = search ? {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { contact: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ]
  } : {};

  const [data, totalCount] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limit
    }),
    prisma.client.count({ where })
  ]);

  res.json({
    data,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit)
  });
}));

router.post('/', requireAuth, requirePermission('clients'), validateRequest(ClientSchema), asyncHandler(async (req: any, res: Response) => {
  const { name, contact, email, phone } = req.body;
  const client = await prisma.client.create({
    data: { name, contact, email, phone }
  });
  await logAction(req.user!.sub, 'CREATE', 'CLIENT', client.id, `Création du client ${client.name}`);
  res.status(201).json(client);
}));

router.put('/:id', requireAuth, requirePermission('clients'), validateRequest(ClientSchema), asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { name, contact, email, phone } = req.body;
  const client = await prisma.client.update({
    where: { id },
    data: { name, contact, email, phone }
  });
  await logAction(req.user!.sub, 'UPDATE', 'CLIENT', client.id, `Mise à jour du client ${client.name}`);
  res.json(client);
}));

router.delete('/:id', requireAuth, requirePermission('clients'), asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const client = await prisma.client.delete({ where: { id } });
  await logAction(req.user!.sub, 'DELETE', 'CLIENT', id, `Suppression du client ${client.name}`);
  res.status(204).send();
}));

export default router;
