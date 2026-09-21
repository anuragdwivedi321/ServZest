import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';

async function expireSubscriptions(workerId?: string) {
  await prisma.workerSubscription.updateMany({
    where: { ...(workerId ? { workerId } : {}), status: 'ACTIVE', endsAt: { lte: new Date() } },
    data: { status: 'EXPIRED' },
  });
}

export const getSubscription = async (req: Request, res: Response) => {
  const profile = await prisma.workerProfile.findUnique({ where: { userId: req.user!.id }, select: { id: true } });
  if (!profile) return res.status(404).json({ success: false, message: 'Professional profile not found.' });
  await expireSubscriptions(profile.id);
  const [plans, subscription, ledger] = await Promise.all([
    prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } }),
    prisma.workerSubscription.findFirst({ where: { workerId: profile.id, status: 'ACTIVE', endsAt: { gt: new Date() } }, include: { plan: true }, orderBy: { endsAt: 'desc' } }),
    prisma.ledgerEntry.findMany({ where: { workerId: profile.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);
  const dueCommission = ledger.filter(entry => entry.status === 'DUE').reduce((sum, entry) => sum + entry.amount, 0);
  return res.json({ success: true, plans, subscription, ledger, dueCommission });
};

export const activateWorkerSubscription = async (req: Request, res: Response) => {
  const { id: workerId } = req.params;
  const { planId, paymentRef } = req.body;
  const result = await prisma.$transaction(async tx => {
    const [worker, plan, current] = await Promise.all([
      tx.workerProfile.findUnique({ where: { id: workerId }, select: { id: true } }),
      tx.subscriptionPlan.findFirst({ where: { id: planId, isActive: true } }),
      tx.workerSubscription.findFirst({ where: { workerId, status: 'ACTIVE', endsAt: { gt: new Date() } }, orderBy: { endsAt: 'desc' } }),
    ]);
    if (!worker || !plan) throw Object.assign(new Error('Professional or subscription plan not found.'), { status: 404 });
    const startsAt = current?.endsAt && current.endsAt > new Date() ? current.endsAt : new Date();
    const endsAt = new Date(startsAt.getTime() + plan.durationDays * 86400000);
    const subscription = await tx.workerSubscription.create({ data: { workerId, planId, startsAt, endsAt, paymentRef }, include: { plan: true } });
    await tx.ledgerEntry.create({ data: { workerId, type: 'SUBSCRIPTION_FEE', amount: plan.price, status: 'SETTLED', reference: paymentRef, settledAt: new Date() } });
    await tx.auditLog.create({ data: { actorId: req.user!.id, action: 'SUBSCRIPTION_ACTIVATED', entityType: 'WorkerSubscription', entityId: subscription.id, metadata: { workerId, planId, paymentRef }, ipAddress: req.ip } });
    return subscription;
  });
  return res.status(201).json({ success: true, subscription: result });
};

export const listLedger = async (_req: Request, res: Response) => {
  const entries = await prisma.ledgerEntry.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
  return res.json({ success: true, entries });
};

export const settleLedgerEntry = async (req: Request, res: Response) => {
  const entry = await prisma.ledgerEntry.update({ where: { id: req.params.id }, data: { status: 'SETTLED', settledAt: new Date(), reference: req.body.reference } });
  await prisma.auditLog.create({ data: { actorId: req.user!.id, action: 'LEDGER_ENTRY_SETTLED', entityType: 'LedgerEntry', entityId: entry.id, metadata: { reference: req.body.reference }, ipAddress: req.ip } });
  return res.json({ success: true, entry });
};
