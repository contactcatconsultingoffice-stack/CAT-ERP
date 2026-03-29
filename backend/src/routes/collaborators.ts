import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { requireAuth, requireAdmin } from '../auth';
import { validateRequest, CollaboratorSchema } from '../utils/validation';
import { asyncHandler } from '../middleware/security';
import { logAction } from '../utils/audit';
import { sendWelcomeEmail } from '../utils/email';

const router = express.Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const skip = (page - 1) * limit;

  const where: any = search ? {
    OR: [
      { expertise: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { socialHandle: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } }
    ]
  } : {};

  const [data, totalCount] = await Promise.all([
    prisma.collaborator.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      skip,
      take: limit
    }),
    prisma.collaborator.count({ where })
  ]);

  res.json({ data, totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) });
}));

router.post('/', requireAuth, requireAdmin, validateRequest(CollaboratorSchema), asyncHandler(async (req: any, res: Response) => {
  const { email, name, password, expertise, socialHandle, phone } = req.body;
  const passwordHash = await bcrypt.hash(password || 'cat-erp-2024', 12);
  const user = await prisma.user.create({
    data: {
      email, name, passwordHash,
      role: 'COLLABORATOR',
      collaborator: { create: { expertise, socialHandle, phone } }
    },
    include: { collaborator: true }
  });
  await logAction(req.user!.sub, 'CREATE', 'COLLABORATOR', user.id, `Création du collaborateur ${name}`);

  // Send welcome email asynchronously
  void sendWelcomeEmail(email, password || 'cat-erp-2024', name, 'COLLABORATOR');

  res.status(201).json(user.collaborator);
}));

router.put('/:id', requireAuth, requireAdmin, asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { name, email, expertise, socialHandle, phone } = req.body;
  const collab = await prisma.collaborator.update({
    where: { id },
    data: { 
      expertise, socialHandle, phone,
      user: { update: { name, email } }
    },
    include: { user: true }
  });
  await logAction(req.user!.sub, 'UPDATE', 'COLLABORATOR', id, `Mise à jour du collaborateur ${name}`);
  res.json(collab);
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const collab = await prisma.collaborator.findUnique({ where: { id }, include: { user: true } });
  if (collab) {
    await prisma.collaborator.delete({ where: { id } });
    await prisma.user.delete({ where: { id: collab.userId } });
    await logAction(req.user!.sub, 'DELETE', 'COLLABORATOR', id, `Suppression du collaborateur ${collab.user.name}`);
  }
  res.status(204).send();
}));

export default router;
