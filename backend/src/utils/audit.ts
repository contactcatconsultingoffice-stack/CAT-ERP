import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function logAction(userId: string, action: string, entity: string, entityId?: string, details?: string) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details,
      },
    });
  } catch (err) {
    console.error('AuditLog creation failed:', err);
  }
}
