import express from 'express';
import { prisma } from '../prisma';
import { requireAuth, requirePermission } from '../auth';
import { validateRequest, PartnerSchema } from '../utils/validation';
import { asyncHandler } from '../middleware/security';
import { logAction } from '../utils/audit';

const router = express.Router();

router.get('/', requireAuth, requirePermission('partners'), asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const skip = (page - 1) * limit;

  const where: any = search ? {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { contact: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } }
    ]
  } : {};

  const [data, totalCount] = await Promise.all([
    prisma.partner.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limit
    }),
    prisma.partner.count({ where })
  ]);

  res.json({ data, totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) });
}));

router.post('/', requireAuth, requirePermission('partners'), validateRequest(PartnerSchema), asyncHandler(async (req: any, res) => {
  const { name, contact, email, phone, links } = req.body;
  const partner = await prisma.partner.create({
    data: { name, contact, email, phone, links }
  });
  await logAction(req.user!.sub, 'CREATE', 'PARTNER', partner.id, `Création du partenaire ${partner.name}`);
  res.status(201).json(partner);
}));

router.put('/:id', requireAuth, requirePermission('partners'), asyncHandler(async (req: any, res) => {
  const { id } = req.params;
  const { name, contact, email, phone, links } = req.body;
  const partner = await prisma.partner.update({
    where: { id },
    data: { name, contact, email, phone, links }
  });
  await logAction(req.user!.sub, 'UPDATE', 'PARTNER', partner.id, `Mise à jour du partenaire ${partner.name}`);
  res.json(partner);
}));

router.delete('/:id', requireAuth, requirePermission('partners'), asyncHandler(async (req: any, res) => {
  const { id } = req.params;
  const partner = await prisma.partner.delete({ where: { id } });
  await logAction(req.user!.sub, 'DELETE', 'PARTNER', id, `Suppression du partenaire ${partner.name}`);
  res.status(204).send();
}));

export default router;
