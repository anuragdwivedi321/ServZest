import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';

export async function writeAudit(entry: {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
}) {
  await prisma.auditLog.create({ data: entry });
}
