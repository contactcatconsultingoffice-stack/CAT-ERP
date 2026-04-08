import express, { Request, Response } from 'express';
import { requireAuth, requirePermission } from '../auth';
import { validateRequest, ClientSchema } from '../utils/validation';
import { asyncHandler } from '../middleware/security';
import { logAction } from '../utils/audit';
import { generateClientListPDF } from '../utils/export-pdf';
import { ClientService } from '../services/client.service';

const router = express.Router();

router.get(
  '/export/pdf',
  requireAuth,
  requirePermission('clients'),
  asyncHandler(async (req: Request, res: Response) => {
    const clients = await ClientService.getAllForExport();
    const buffer = await generateClientListPDF(clients);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=annuaire-clients.pdf');
    res.send(buffer);
  })
);

router.get('/', requireAuth, requirePermission('clients'), asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;

  const result = await ClientService.findAll({ page, limit, search });
  res.json(result);
}));

router.post('/', requireAuth, requirePermission('clients'), validateRequest(ClientSchema), asyncHandler(async (req: any, res: Response) => {
  const { name, contact, email, phone } = req.body;
  const client = await ClientService.create({ name, contact, email, phone });
  
  await logAction(req.user!.sub, 'CREATE', 'CLIENT', client.id, `Création du client ${client.name}`);
  res.status(201).json(client);
}));

router.put('/:id', requireAuth, requirePermission('clients'), validateRequest(ClientSchema), asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { name, contact, email, phone } = req.body;
  const client = await ClientService.update(id, { name, contact, email, phone });
  
  await logAction(req.user!.sub, 'UPDATE', 'CLIENT', client.id, `Mise à jour du client ${client.name}`);
  res.json(client);
}));

router.delete('/:id', requireAuth, requirePermission('clients'), asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const client = await ClientService.delete(id);
  
  await logAction(req.user!.sub, 'DELETE', 'CLIENT', id, `Suppression du client ${client.name}`);
  res.status(204).send();
}));

export default router;

