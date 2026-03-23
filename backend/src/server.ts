import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { prisma } from './prisma';
import { requireAdmin, requireAuth, requireSuperAdmin, signToken, requirePermission } from './auth';
import { logAction } from './utils/audit';

import { validateRequest, ClientSchema, ProjectSchema, CollaboratorSchema, UserSchema, PartnerSchema } from './utils/validation';

import { securityHeaders, apiRateLimiter, authRateLimiter, asyncHandler } from './middleware/security';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Security Headers & Global API Rate Limiter
app.use(securityHeaders);
app.use('/api/', apiRateLimiter);

// CORS configuration supporting comma-separated origins
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*'
}));
app.use(express.json());

// Transporter for emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

app.get('/api/health', asyncHandler(async (_req: express.Request, res: express.Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.json({ status: 'ok', db: 'disconnected' });
  }
}));

// --- Authentication ---
app.post('/api/login', authRateLimiter, asyncHandler(async (req: express.Request, res: express.Response) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  }
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Identifiants invalides.' });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Identifiants invalides.' });
  }

  const permissions = user.permissions || [];
  const token = signToken({ 
    sub: user.id, 
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
    permissions
  });
  
  await logAction(user.id, 'LOGIN', 'USER', user.id, `Connexion de ${user.email}`);
  
  return res.json({ 
    token, 
    user: { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
      permissions
    } 
  });
}));

app.post('/api/forgot-password', authRateLimiter, asyncHandler(async (req: express.Request, res: express.Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis.' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Don't reveal if user exists for security, but we'll return ok
    return res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

  await prisma.user.update({
    where: { email },
    data: { resetToken, resetTokenExpires }
  });

  const resetUrl = `${req.get('origin')}/reset-password?token=${resetToken}&email=${email}`;

  try {
    await transporter.sendMail({
      from: `"CAT ERP" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Réinitialisation de votre mot de passe - CAT ERP',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Réinitialisation de mot de passe</h2>
          <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte CAT ERP.</p>
          <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; border-radius: 5px;">Réinitialiser mon mot de passe</a>
          <p>Ce lien expirera dans une heure.</p>
          <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
        </div>
      `
    });
    res.json({ message: 'Email envoyé avec succès.' });
  } catch (err) {
    console.error('SMTP Error:', err);
    res.status(500).json({ error: "Erreur lors de l'envoi de l'email." });
  }
}));

app.post('/api/reset-password', authRateLimiter, asyncHandler(async (req: express.Request, res: express.Response) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'Données manquantes.' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.resetToken !== token || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
    return res.status(400).json({ error: 'Lien invalide ou expiré.' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { email },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpires: null
    }
  });

  res.json({ message: 'Mot de passe mis à jour avec succès.' });
}));

// --- Clients ---
app.get('/api/clients', requireAuth, requirePermission('clients'), asyncHandler(async (req: express.Request, res: express.Response) => {
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

app.post('/api/clients', requireAuth, requirePermission('clients'), validateRequest(ClientSchema), asyncHandler(async (req: express.Request, res: express.Response) => {
  const { name, contact, email, phone } = req.body;
  const client = await prisma.client.create({
    data: { name, contact, email, phone }
  });
  await logAction(req.user!.sub, 'CREATE', 'CLIENT', client.id, `Création du client ${client.name}`);
  res.status(201).json(client);
}));

app.put('/api/clients/:id', requireAuth, requirePermission('clients'), validateRequest(ClientSchema), asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { name, contact, email, phone } = req.body;
  const client = await prisma.client.update({
    where: { id },
    data: { name, contact, email, phone }
  });
  await logAction(req.user!.sub, 'UPDATE', 'CLIENT', client.id, `Mise à jour du client ${client.name}`);
  res.json(client);
}));

app.delete('/api/clients/:id', requireAuth, requirePermission('clients'), asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const client = await prisma.client.delete({ where: { id } });
  await logAction(req.user!.sub, 'DELETE', 'CLIENT', id, `Suppression du client ${client.name}`);
  res.status(204).send();
}));

// --- Projects ---
app.get('/api/projects', requireAuth, requirePermission('projects'), asyncHandler(async (req: express.Request, res: express.Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [data, totalCount] = await Promise.all([
    prisma.project.findMany({
      include: { client: { select: { id: true, name: true, email: true } }, partner: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.project.count()
  ]);

  res.json({ data, totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) });
}));

app.post('/api/projects', requireAuth, requirePermission('projects'), validateRequest(ProjectSchema), asyncHandler(async (req: express.Request, res: express.Response) => {
  const { name, type, status, priority, clientId, partnerId, description } = req.body;
  
  const year = new Date().getFullYear();
  const count = await prisma.project.count();
  const seq = String(count + 1).padStart(3, '0');
  const reference = `PRJ-${year}-${seq}`;

  const project = await prisma.project.create({
    data: { name, type, status, priority, clientId, partnerId, description, reference }
  });
  await logAction(req.user!.sub, 'CREATE', 'PROJECT', project.id, `Création du projet ${project.name} (${reference})`);
  res.status(201).json(project);
}));

app.put('/api/projects/:id', requireAuth, requirePermission('projects'), validateRequest(ProjectSchema), asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { name, type, status, priority, clientId, partnerId, description } = req.body;
  const project = await prisma.project.update({
    where: { id },
    data: { name, type, status, priority, clientId, partnerId, description }
  });
  await logAction(req.user!.sub, 'UPDATE', 'PROJECT', project.id, `Mise à jour du projet ${project.name}`);
  res.json(project);
}));

app.delete('/api/projects/:id', requireAuth, requirePermission('projects'), asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const project = await prisma.project.delete({ where: { id } });
  await logAction(req.user!.sub, 'DELETE', 'PROJECT', id, `Suppression du projet ${project.name}`);
  res.status(204).send();
}));

// --- Collaborators ---
app.get('/api/collaborators', requireAuth, requirePermission('collaborators'), asyncHandler(async (req: express.Request, res: express.Response) => {
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

app.post('/api/collaborators', requireAuth, requireAdmin, validateRequest(CollaboratorSchema), asyncHandler(async (req: express.Request, res: express.Response) => {
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
  res.status(201).json(user.collaborator);
}));

app.put('/api/collaborators/:id', requireAuth, requireAdmin, asyncHandler(async (req: express.Request, res: express.Response) => {
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

app.delete('/api/collaborators/:id', requireAuth, requireAdmin, asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const collab = await prisma.collaborator.findUnique({ where: { id }, include: { user: true } });
  if (collab) {
    await prisma.collaborator.delete({ where: { id } });
    await prisma.user.delete({ where: { id: collab.userId } });
    await logAction(req.user!.sub, 'DELETE', 'COLLABORATOR', id, `Suppression du collaborateur ${collab.user.name}`);
  }
  res.status(204).send();
}));

// --- Users (Admin Management) ---
app.get('/api/users', requireAuth, requireAdmin, asyncHandler(async (req: express.Request, res: express.Response) => {
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

app.post('/api/users', requireAuth, requireAdmin, validateRequest(UserSchema), asyncHandler(async (req: express.Request, res: express.Response) => {
  const { email, name, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, mot de passe et rôle requis.' });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, name, passwordHash, role }
  });
  res.status(201).json(user);
}));

app.delete('/api/users/:id', requireAuth, requireAdmin, asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) return res.status(404).json({ error: 'Utilisateur non trouvé.' });

  if (targetUser.role === 'ADMIN' && !req.user?.isSuperAdmin) {
    return res.status(403).json({ error: 'Seul le Super Administrateur peut supprimer un Admin.' });
  }

  if (id === req.user?.sub) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
  }

  await prisma.user.delete({ where: { id } });
  await logAction(req.user!.sub, 'DELETE', 'USER', id, `Suppression de l'utilisateur ${targetUser.email}`);
  res.status(204).send();
}));

// --- Super Admin: Change any user password ---
app.put('/api/users/:id/password', requireAuth, requireSuperAdmin, asyncHandler(async (req: express.Request, res: express.Response) => {
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

// --- Super Admin: Manage Collaborator Permissions ---
app.put('/api/users/:id/permissions', requireAuth, requireSuperAdmin, asyncHandler(async (req: express.Request, res: express.Response) => {
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

// --- Super Admin: Activity Logs ---
app.get('/api/admin/logs', requireAuth, requireSuperAdmin, asyncHandler(async (req: express.Request, res: express.Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 100)); // larger max limits for logs
  const skip = (page - 1) * limit;

  const [data, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.auditLog.count()
  ]);

  res.json({ data, totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) });
}));


// --- Partners ---
app.get('/api/partners', requireAuth, requirePermission('partners'), asyncHandler(async (req: express.Request, res: express.Response) => {
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

app.post('/api/partners', requireAuth, requirePermission('partners'), validateRequest(PartnerSchema), asyncHandler(async (req: express.Request, res: express.Response) => {
  const { name, contact, email, phone } = req.body;
  const partner = await prisma.partner.create({
    data: { name, contact, email, phone }
  });
  await logAction(req.user!.sub, 'CREATE', 'PARTNER', partner.id, `Création du partenaire ${partner.name}`);
  res.status(201).json(partner);
}));

app.put('/api/partners/:id', requireAuth, requirePermission('partners'), asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { name, contact, email, phone } = req.body;
  const partner = await prisma.partner.update({
    where: { id },
    data: { name, contact, email, phone }
  });
  await logAction(req.user!.sub, 'UPDATE', 'PARTNER', partner.id, `Mise à jour du partenaire ${partner.name}`);
  res.json(partner);
}));

app.delete('/api/partners/:id', requireAuth, requirePermission('partners'), asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const partner = await prisma.partner.delete({ where: { id } });
  await logAction(req.user!.sub, 'DELETE', 'PARTNER', id, `Suppression du partenaire ${partner.name}`);
  res.status(204).send();
}));

// --- Prospects (Contacts CRM) ---
app.get('/api/prospects', requireAuth, requirePermission('contacts'), asyncHandler(async (req: express.Request, res: express.Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [data, totalCount] = await Promise.all([
    prisma.prospect.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.prospect.count()
  ]);
  res.json({ data, totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) });
}));

app.post('/api/prospects', requireAuth, requirePermission('contacts'), asyncHandler(async (req: express.Request, res: express.Response) => {
  const { name, contact, email, status, notes } = req.body;
  const prospect = await prisma.prospect.create({
    data: { name, contact, email, status, notes }
  });
  await logAction(req.user!.sub, 'CREATE', 'CONTACT', prospect.id, `Création du contact ${prospect.name}`);
  res.status(201).json(prospect);
}));

app.put('/api/prospects/:id', requireAuth, requirePermission('contacts'), asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { name, contact, email, status, notes } = req.body;
  const prospect = await prisma.prospect.update({
    where: { id },
    data: { name, contact, email, status, notes }
  });
  await logAction(req.user!.sub, 'UPDATE', 'CONTACT', prospect.id, `Mise à jour du contact ${prospect.name}`);
  res.json(prospect);
}));

app.delete('/api/prospects/:id', requireAuth, requirePermission('contacts'), asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const prospect = await prisma.prospect.delete({ where: { id } });
  await logAction(req.user!.sub, 'DELETE', 'CONTACT', id, `Suppression du contact ${prospect.name}`);
  res.status(204).send();
}));

// --- Financial records (quotes / invoices) ---
app.get('/api/financial', requireAuth, requirePermission('financial'), asyncHandler(async (req: express.Request, res: express.Response) => {
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

app.post('/api/financial', requireAuth, requirePermission('financial'), asyncHandler(async (req: express.Request, res: express.Response) => {
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

app.put('/api/financial/:id', requireAuth, requirePermission('financial'), asyncHandler(async (req: express.Request, res: express.Response) => {
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

app.delete('/api/financial/:id', requireAuth, requirePermission('financial'), asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const record = await prisma.financialRecord.delete({ where: { id } });
  await logAction(req.user!.sub, 'DELETE', 'FINANCIAL', id, `Suppression document ${record.externalRef}`);
  res.status(204).send();
}));

// --- Contracts ---
app.get('/api/contracts', requireAuth, requirePermission('contracts'), asyncHandler(async (req: express.Request, res: express.Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const skip = (page - 1) * limit;

  const where: any = search ? {
    OR: [
      { title: { contains: search, mode: 'insensitive' } },
      { type: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } }
    ]
  } : {};

  const [data, totalCount] = await Promise.all([
    prisma.contract.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.contract.count({ where })
  ]);

  res.json({ data, totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) });
}));

app.post('/api/contracts', requireAuth, requirePermission('contracts'), asyncHandler(async (req: express.Request, res: express.Response) => {
  const { type, title, rawText, projectId, financialId, signedAt, location } =
    req.body;

  const contract = await prisma.contract.create({
    data: {
      type,
      title,
      rawText,
      projectId,
      financialId,
      signedAt,
      location
    }
  });

  res.status(201).json(contract);
}));

// --- Missions (timesheets) ---
app.get('/api/missions', requireAuth, requirePermission('missions'), asyncHandler(async (req: express.Request, res: express.Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [data, totalCount] = await Promise.all([
    prisma.mission.findMany({
      include: { 
        project: { select: { id: true, name: true } }, 
        collaborator: { include: { user: { select: { name: true, email: true } } } } 
      },
      orderBy: { performedAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.mission.count()
  ]);

  res.json({ data, totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) });
}));

app.post('/api/missions', requireAuth, requireAdmin, asyncHandler(async (req: express.Request, res: express.Response) => {
  const { projectId, collaboratorId, description, hours, performedAt } =
    req.body;

  const mission = await prisma.mission.create({
    data: {
      projectId,
      collaboratorId,
      description,
      hours,
      performedAt
    }
  });

  res.status(201).json(mission);
}));

// Catch-all route for unknown API endpoints
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Route de l\'API introuvable.' });
});

// GLOBAL ERROR HANDLER (MUST BE LAST APP.USE)
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend API listening on http://localhost:${PORT}`);
});
