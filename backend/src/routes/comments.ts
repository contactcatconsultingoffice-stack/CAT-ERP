import express, { Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../auth';
import { asyncHandler } from '../middleware/security';

const router = express.Router();

// GET /comments?entityType=PROJECT&entityId=xxx
router.get('/', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const { entityType, entityId } = req.query;
  if (!entityType || !entityId) {
    return res.status(400).json({ error: 'entityType et entityId sont requis.' });
  }

  const comments = await prisma.comment.findMany({
    where: {
      entityType: String(entityType),
      entityId: String(entityId)
    },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } }
    },
    orderBy: { createdAt: 'asc' }
  });

  res.json(comments);
}));

// POST /comments
router.post('/', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const { content, entityType, entityId } = req.body;
  if (!content || !entityType || !entityId) {
    return res.status(400).json({ error: 'content, entityType et entityId sont requis.' });
  }

  const comment = await prisma.comment.create({
    data: {
      content: String(content).trim(),
      entityType: String(entityType),
      entityId: String(entityId),
      authorId: req.user.sub
    },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } }
    }
  });

  res.status(201).json(comment);
}));

// DELETE /comments/:id
router.delete('/:id', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const comment = await prisma.comment.findUnique({ where: { id } });

  if (!comment) return res.status(404).json({ error: 'Commentaire introuvable.' });

  // Only author or super admin can delete
  if (comment.authorId !== req.user.sub && !req.user.isSuperAdmin) {
    return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres commentaires.' });
  }

  await prisma.comment.delete({ where: { id } });
  res.status(204).send();
}));

export default router;
