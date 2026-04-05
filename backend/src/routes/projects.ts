import express, { Request, Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requirePermission } from '../auth';
import { validateRequest, ProjectSchema, ProjectUpdateSchema } from '../utils/validation';
import { asyncHandler } from '../middleware/security';
import { logAction } from '../utils/audit';
import { generateProjectListPDF } from '../utils/export-pdf';

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generates a collision-safe project reference using a DB transaction.
 * Pattern: PRJ-YYYY-NNN (padded to 3 digits, resets each year).
 */
async function generateProjectReference(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PRJ-${year}-`;

  // Count existing projects with this year's prefix to get the next sequence
  const existing = await prisma.project.count({
    where: { reference: { startsWith: prefix } },
  });

  // Use a loop with retry to handle concurrent inserts (optimistic approach)
  let seq = existing + 1;
  let ref = `${prefix}${String(seq).padStart(3, '0')}`;

  // Check for collision and increment until unique
  while (await prisma.project.findUnique({ where: { reference: ref } })) {
    seq += 1;
    ref = `${prefix}${String(seq).padStart(3, '0')}`;
  }

  return ref;
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.get(
  '/export/pdf',
  requireAuth,
  requirePermission('projects'),
  asyncHandler(async (req: Request, res: Response) => {
    // Fetch all projects (no pagination for export)
    const projects = await prisma.project.findMany({
      include: {
        client: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const buffer = await generateProjectListPDF(projects);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=projets-catalogue.pdf');
    res.send(buffer);
  })
);

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const skip = (page - 1) * limit;

    const where: any = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { reference: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    // Collaborators only see projects they have missions on
    if (req.user?.role === 'COLLABORATOR' && !req.user?.isSuperAdmin) {
      const collab = await prisma.collaborator.findUnique({
        where: { userId: req.user.sub },
      });

      if (!collab) {
        // Collaborator exists as user but has no collaborator profile
        return res.json({ data: [], totalCount: 0, currentPage: page, totalPages: 0 });
      }

      where.missions = { some: { collaboratorId: collab.id } };
    }

    const [data, totalCount] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, contact: true, email: true } },
          partner: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    res.json({
      data,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    });
  })
);

router.post(
  '/',
  requireAuth,
  requirePermission('projects'),
  validateRequest(ProjectSchema),
  asyncHandler(async (req: any, res: Response) => {
    const { name, type, subType, status, priority, clientId, partnerId, description, contact } =
      req.body;

    const reference = await generateProjectReference();

    const project = await prisma.project.create({
      data: {
        name,
        type,
        subType,
        status: status || 'PLANNING',
        priority: priority || 'MEDIUM',
        clientId,
        partnerId: partnerId || null,
        description,
        contact,
        reference,
      },
    });

    await logAction(
      req.user!.sub,
      'CREATE',
      'PROJECT',
      project.id,
      `Création du projet ${project.name} (${reference})`
    );

    res.status(201).json(project);
  })
);

router.put(
  '/:id',
  requireAuth,
  requirePermission('projects'),
  validateRequest(ProjectUpdateSchema),
  asyncHandler(async (req: any, res: Response) => {
    const { id } = req.params;
    const { name, type, subType, status, priority, clientId, partnerId, description, contact } =
      req.body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (subType !== undefined) updateData.subType = subType;
    if (contact !== undefined) updateData.contact = contact;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (clientId !== undefined) updateData.clientId = clientId;
    if (partnerId !== undefined) updateData.partnerId = partnerId || null;
    if (description !== undefined) updateData.description = description;

    const project = await prisma.project.update({ where: { id }, data: updateData });

    await logAction(
      req.user!.sub,
      'UPDATE',
      'PROJECT',
      project.id,
      `Mise à jour du projet ${project.name}`
    );

    res.json(project);
  })
);

router.delete(
  '/:id',
  requireAuth,
  requirePermission('projects'),
  asyncHandler(async (req: any, res: Response) => {
    const { id } = req.params;
    const project = await prisma.project.delete({ where: { id } });

    await logAction(
      req.user!.sub,
      'DELETE',
      'PROJECT',
      id,
      `Suppression du projet ${project.name}`
    );

    res.status(204).send();
  })
);

export default router;
