import express from 'express';
import { prisma } from '../prisma';
import { requireAuth, requirePermission } from '../auth';
import { asyncHandler } from '../middleware/security';
import { logAction } from '../utils/audit';

const router = express.Router();

router.get('/', requireAuth, requirePermission('financial'), asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const skip = (page - 1) * limit;

  const where: any = search ? {
    OR: [
      { externalRef: { contains: search, mode: 'insensitive' } },
      { project: { name: { contains: search, mode: 'insensitive' } } },
      { project: { client: { name: { contains: search, mode: 'insensitive' } } } }
    ]
  } : {};

  const [data, totalCount] = await Promise.all([
    prisma.financialRecord.findMany({
      where,
      include: { project: { include: { client: { select: { name: true, email: true } } } } },
      orderBy: { issuedAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.financialRecord.count({ where })
  ]);

  res.json({ data, totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) });
}));

router.post('/', requireAuth, requirePermission('financial'), asyncHandler(async (req: any, res) => {
  const {
    kind, amountHT, amountTTC, currency, status, dueDate, projectId, externalRef, lines, paymentTerms
  } = req.body;

  let ref = externalRef;
  if (!ref) {
    const year = new Date().getFullYear();
    const prefix = kind === 'QUOTE' ? 'DEV' : 'FAC';
    const count = await prisma.financialRecord.count({ where: { kind } });
    const seq = String(count + 1).padStart(3, '0');
    ref = `${prefix}-${year}-${seq}`;
  }

  const record = await prisma.financialRecord.create({
    data: {
      kind, amountHT, amountTTC, currency,
      status: status || 'READY_TO_SEND',
      dueDate, projectId, externalRef: ref, lines, paymentTerms
    },
    include: { project: { include: { client: true } } }
  });

  await logAction(req.user!.sub, 'CREATE', 'FINANCIAL', record.id, `Création ${kind} ${ref}`);
  res.status(201).json(record);
}));

router.put('/:id', requireAuth, requirePermission('financial'), asyncHandler(async (req: any, res) => {
  const { id } = req.params;
  const { status, amountHT, amountTTC, externalRef, dueDate, lines, paymentTerms } = req.body;
  const record = await prisma.financialRecord.update({
    where: { id },
    data: { status, amountHT, amountTTC, externalRef, dueDate, lines, paymentTerms },
    include: { project: { include: { client: true } } }
  });
  await logAction(req.user!.sub, 'UPDATE', 'FINANCIAL', record.id, `Mise à jour document ${record.externalRef}`);
  res.json(record);
}));

router.delete('/:id', requireAuth, requirePermission('financial'), asyncHandler(async (req: any, res) => {
  const { id } = req.params;
  const record = await prisma.financialRecord.delete({ where: { id } });
  await logAction(req.user!.sub, 'DELETE', 'FINANCIAL', id, `Suppression document ${record.externalRef}`);
  res.status(204).send();
}));

export default router;
