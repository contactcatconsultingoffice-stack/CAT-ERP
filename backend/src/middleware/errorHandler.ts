import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error("Erreur Globale interceptée :", err);

  // Validation Zod Errors
  if (err instanceof ZodError || err.name === 'ZodError') {
    return res.status(400).json({ 
      error: 'Erreur de validation des données.',
      details: err.errors ? err.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message })) : err
    });
  }

  // Prisma Database Errors
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Cet enregistrement existe déjà (conflit d\'unicité).' });
  }
  if (err.code === 'P2003') {
    return res.status(400).json({ error: 'Erreur de contrainte (entité liée inexistante).' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Enregistrement introuvable dans la base de données.' });
  }

  // Default Error Fallback
  const status = err.status || 500;
  const message = err.message || 'Erreur interne du serveur.';

  res.status(status).json({
    error: message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
}
