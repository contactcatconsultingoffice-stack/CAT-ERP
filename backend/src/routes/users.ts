import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { requireAuth, requireAdmin, requireSuperAdmin } from '../auth';
import { validateRequest, UserSchema } from '../utils/validation';
import { asyncHandler } from '../middleware/security';
import { logAction } from '../utils/audit';
import { sendWelcomeEmail } from '../utils/email';

const router = express.Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
  const search = typeof req.query.search === 'string' && req.query.search.trim() !== '' ? req.query.search : undefined;
  const roleFilter = typeof req.query.role === 'string' && req.query.role !== 'ALL' ? req.query.role : undefined;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (roleFilter) where.role = roleFilter;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [data, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isSuperAdmin: true,
        createdAt: true,
        permissions: true
      },
      skip,
      take: limit
    }),
    prisma.user.count({ where })
  ]);

  res.json({ data, totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) });
}));

router.post('/', requireAuth, requireSuperAdmin, validateRequest(UserSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, name, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, mot de passe et rôle requis.' });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, name, passwordHash, role }
  });
  
  // Send welcome email asynchronously
  void sendWelcomeEmail(email, password, name || 'Nouvel Utilisateur', role);
  
  res.status(201).json(user);
}));

router.delete('/:id', requireAuth, requireSuperAdmin, asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) return res.status(404).json({ error: 'Utilisateur non trouvé.' });

  if (id === req.user?.sub) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
  }

  await prisma.user.delete({ where: { id } });
  await logAction(req.user!.sub, 'DELETE', 'USER', id, `Suppression de l'utilisateur ${targetUser.email}`);
  res.status(204).send();
}));

router.put('/:id/password', requireAuth, requireSuperAdmin, asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ error: 'Nouveau mot de passe requis.' });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const user = await prisma.user.update({
    where: { id },
    data: { passwordHash }
  });

  await logAction(req.user!.sub, 'UPDATE_PASSWORD', 'USER', id, `Changement de mot de passe pour ${user.email}`);
  res.json({ message: 'Mot de passe mis à jour.' });
}));

router.put('/:id/permissions', requireAuth, requireSuperAdmin, asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { permissions } = req.body;
  if (!Array.isArray(permissions)) return res.status(400).json({ error: 'Permissions invalides.' });

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé.' });
  }

  await prisma.user.update({
    where: { id },
    data: { permissions }
  });

  await logAction(req.user!.sub, 'UPDATE_PERMISSIONS', 'USER', id, `Droits mis à jour pour ${user.email} : ${permissions.join(', ')}`);
  res.json({ message: 'Permissions mises à jour.' });
}));

export default router;
