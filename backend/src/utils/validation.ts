import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Middleware for validating request bodies against a Zod schema
export const validateRequest = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Erreur de validation des données.',
          details: error.issues
        });
      }
      return res.status(400).json({ error: 'Données invalides.' });
    }
  };
};

export const ClientSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100),
  contact: z.string().max(100).optional().nullable(),
  email: z.string().email('Email invalide').optional().nullable().or(z.literal('')),
  phone: z.string().max(30).optional().nullable().or(z.literal(''))
});

export const PartnerSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100),
  contact: z.string().max(100).optional().nullable(),
  email: z.string().email('Email invalide').optional().nullable().or(z.literal('')),
  phone: z.string().max(30).optional().nullable().or(z.literal('')),
  links: z.string().max(500).optional().nullable().or(z.literal(''))
});

export const ProjectSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(150),
  type: z.enum(['STRATEGIE', 'GESTION', 'DEVELOPPEMENT', 'TECH']),
  subType: z.string().max(150).optional().nullable(),
  contact: z.string().max(150).optional().nullable(),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  clientId: z.string().cuid('Client ID invalide'),
  partnerId: z.string().cuid('Partner ID invalide').optional().nullable(),
  description: z.string().max(1000).optional().nullable()
});

// Partial schema for PUT (all fields optional for partial updates like drag-and-drop status change)
export const ProjectUpdateSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  type: z.enum(['STRATEGIE', 'GESTION', 'DEVELOPPEMENT', 'TECH']).optional(),
  subType: z.string().max(150).optional().nullable(),
  contact: z.string().max(150).optional().nullable(),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  clientId: z.string().cuid('Client ID invalide').optional(),
  partnerId: z.string().cuid('Partner ID invalide').optional().nullable(),
  description: z.string().max(1000).optional().nullable()
});

export const CollaboratorSchema = z.object({
  email: z.string().email('Email invalide'),
  name: z.string().min(2).max(100),
  password: z.string().min(6, 'Mot de passe trop court - min 6').optional(),
  expertise: z.string().max(100).optional().nullable(),
  socialHandle: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable()
});

export const UserSchema = z.object({
  email: z.string().email('Email invalide'),
  name: z.string().min(2).max(100),
  password: z.string().min(6, 'Mot de passe trop court - min 6'),
  role: z.enum(['ADMIN', 'COLLABORATOR']),
  gender: z.enum(['Homme', 'Femme']).optional().nullable()
});
