import express, { Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../auth';
import { asyncHandler } from '../middleware/security';

const router = express.Router();

// GET /calendar — all events for the authenticated user's team
router.get('/', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const { month, year } = req.query;

  let where: any = {};
  if (month && year) {
    const m = parseInt(String(month));
    const y = parseInt(String(year));
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1); // first day of next month
    where.startAt = { gte: start, lt: end };
  }

  const events = await prisma.calendarEvent.findMany({
    where,
    include: {
      creator: { select: { id: true, name: true, email: true } }
    },
    orderBy: { startAt: 'asc' }
  });

  res.json(events);
}));

// POST /calendar — create event or todo
router.post('/', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const { title, description, startAt, endAt, type, color } = req.body;

  if (!title || !startAt) {
    return res.status(400).json({ error: 'title et startAt sont requis.' });
  }

  const event = await prisma.calendarEvent.create({
    data: {
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : null,
      type: type === 'TODO' ? 'TODO' : 'EVENT',
      color: color || '#6366f1',
      creatorId: req.user.sub
    },
    include: {
      creator: { select: { id: true, name: true, email: true } }
    }
  });

  res.status(201).json(event);
}));

// PUT /calendar/:id — update (toggle isDone, edit fields)
router.put('/:id', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Événement introuvable.' });

  // Only creator or super admin can edit
  if (existing.creatorId !== req.user.sub && !req.user.isSuperAdmin) {
    return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres événements.' });
  }

  const { title, description, startAt, endAt, type, color, isDone } = req.body;

  const event = await prisma.calendarEvent.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: String(title).trim() }),
      ...(description !== undefined && { description: description ? String(description).trim() : null }),
      ...(startAt !== undefined && { startAt: new Date(startAt) }),
      ...(endAt !== undefined && { endAt: endAt ? new Date(endAt) : null }),
      ...(type !== undefined && { type: type === 'TODO' ? 'TODO' : 'EVENT' }),
      ...(color !== undefined && { color }),
      ...(isDone !== undefined && { isDone: Boolean(isDone) }),
    },
    include: {
      creator: { select: { id: true, name: true, email: true } }
    }
  });

  res.json(event);
}));

// DELETE /calendar/:id
router.delete('/:id', requireAuth, asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Événement introuvable.' });

  if (existing.creatorId !== req.user.sub && !req.user.isSuperAdmin) {
    return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres événements.' });
  }

  await prisma.calendarEvent.delete({ where: { id } });
  res.status(204).send();
}));

export default router;
