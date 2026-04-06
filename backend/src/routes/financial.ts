import express, { Request, Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requirePermission } from '../auth';
import { asyncHandler } from '../middleware/security';
import { logAction } from '../utils/audit';
import { validateRequest, FinancialRecordSchema } from '../utils/validation';

const router = express.Router();

// ── GET /financial/summary — global financial KPIs (not page-limited) ─────────
router.get(
  '/summary',
  requireAuth,
  requirePermission('financial'),
  asyncHandler(async (req: Request, res: Response) => {
    const [paidInvoices, pendingInvoices, allExpenses] = await Promise.all([
      prisma.financialRecord.findMany({
        where: { kind: 'INVOICE', status: 'PAID' },
        select: { amountTTC: true, currency: true },
      }),
      prisma.financialRecord.findMany({
        where: { kind: 'INVOICE', status: { notIn: ['PAID'] } },
        select: { amountTTC: true, currency: true, status: true },
      }),
      prisma.financialRecord.findMany({
        where: { kind: 'EXPENSE' },
        select: { amountTTC: true, currency: true },
      }),
    ]);

    // Return raw records so frontend can apply exchange rates
    res.json({
      paidInvoices,
      pendingInvoices,
      expenses: allExpenses,
    });
  })
);

// ── GET /financial — paginated list ──────────────────────────────────────────
router.get(
  '/',
  requireAuth,
  requirePermission('financial'),
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const kind = typeof req.query.kind === 'string' ? req.query.kind : undefined;
    const skip = (page - 1) * limit;

    const where: any = search
      ? {
          OR: [
            { externalRef: { contains: search, mode: 'insensitive' } },
            { project: { name: { contains: search, mode: 'insensitive' } } },
            { project: { client: { name: { contains: search, mode: 'insensitive' } } } },
          ],
        }
      : {};

    if (kind) {
      where.kind = kind;
    }

    const [data, totalCount] = await Promise.all([
      prisma.financialRecord.findMany({
        where,
        include: {
          project: {
            include: { client: { select: { name: true, email: true } } },
          },
        },
        orderBy: { issuedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.financialRecord.count({ where }),
    ]);

    res.json({
      data,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    });
  })
);

// ── POST /financial ──────────────────────────────────────────────────────────
router.post(
  '/',
  requireAuth,
  requirePermission('financial'),
  validateRequest(FinancialRecordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      kind,
      amountHT,
      amountTTC,
      currency,
      status,
      dueDate,
      projectId,
      externalRef,
      lines,
      paymentTerms,
      expenseCategory,
    } = req.body;

    if (!['QUOTE', 'INVOICE', 'EXPENSE'].includes(kind)) {
      return res.status(400).json({ error: 'Type de document invalide.' });
    }

    if (!projectId && kind !== 'EXPENSE') {
      return res.status(400).json({ error: 'Un projet est requis pour ce type de document.' });
    }

    // Auto-generate reference if not provided
    let ref = externalRef;
    if (!ref) {
      const year = new Date().getFullYear();
      const prefix = kind === 'QUOTE' ? 'DEV' : kind === 'EXPENSE' ? 'DEP' : 'FAC';
      const count = await prisma.financialRecord.count({ where: { kind } });
      let seq = count + 1;
      ref = `${prefix}-${year}-${String(seq).padStart(3, '0')}`;
      // Avoid collision
      while (await prisma.financialRecord.findFirst({ where: { externalRef: ref } })) {
        seq += 1;
        ref = `${prefix}-${year}-${String(seq).padStart(3, '0')}`;
      }
    }

    const record = await prisma.financialRecord.create({
      data: {
        kind,
        amountHT: Number(amountHT) || 0,
        amountTTC: Number(amountTTC) || 0,
        currency: currency || 'USD',
        status: status || 'READY_TO_SEND',
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: projectId || null,
        externalRef: ref,
        lines: lines || null,
        paymentTerms: paymentTerms || null,
        expenseCategory: expenseCategory || null,
      },
      include: { project: { include: { client: true } } },
    });

    await logAction(
      req.user!.sub,
      'CREATE',
      'FINANCIAL',
      record.id,
      `Création ${kind} ${ref}`
    );

    res.status(201).json(record);
  })
);

// ── PUT /financial/:id ───────────────────────────────────────────────────────
router.put(
  '/:id',
  requireAuth,
  requirePermission('financial'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, amountHT, amountTTC, externalRef, dueDate, lines, paymentTerms, expenseCategory } = req.body;

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (amountHT !== undefined) updateData.amountHT = Number(amountHT);
    if (amountTTC !== undefined) updateData.amountTTC = Number(amountTTC);
    if (externalRef !== undefined) updateData.externalRef = externalRef;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (lines !== undefined) updateData.lines = lines;
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms;
    if (expenseCategory !== undefined) updateData.expenseCategory = expenseCategory;

    const record = await prisma.financialRecord.update({
      where: { id },
      data: updateData,
      include: { project: { include: { client: true } } },
    });

    await logAction(
      req.user!.sub,
      'UPDATE',
      'FINANCIAL',
      record.id,
      `Mise à jour document ${record.externalRef}`
    );

    res.json(record);
  })
);

// ── DELETE /financial/:id ────────────────────────────────────────────────────
router.delete(
  '/:id',
  requireAuth,
  requirePermission('financial'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const record = await prisma.financialRecord.delete({ where: { id } });

    await logAction(
      req.user!.sub,
      'DELETE',
      'FINANCIAL',
      id,
      `Suppression document ${record.externalRef}`
    );

    res.status(204).send();
  })
);

export default router;
