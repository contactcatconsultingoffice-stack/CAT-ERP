import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { signToken, setAuthCookie, clearAuthCookie, requireAuth } from '../auth'; 
import { authRateLimiter, asyncHandler } from '../middleware/security';
import { logAction } from '../utils/audit';
import { transporter } from '../utils/email';

const router = express.Router();

router.get('/me', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isSuperAdmin: true,
      permissions: true
    }
  });
  res.json(user);
}));

// --- Authentication ---
router.post('/login', authRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  console.log(`[AUTH] Login attempt for: ${email}`);
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
    role: user.role as 'ADMIN' | 'COLLABORATOR',
    isSuperAdmin: user.isSuperAdmin,
    permissions
  });
  
  setAuthCookie(res, token);
  await logAction(user.id, 'LOGIN', 'USER', user.id, `Connexion de ${user.email}`);
  
  return res.json({ 
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

router.post('/logout', (req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({ message: 'Déconnexion réussie.' });
});

router.post('/forgot-password', authRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis.' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
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

router.post('/reset-password', authRateLimiter, asyncHandler(async (req: Request, res: Response) => {
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

export default router;
