import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { authenticateJwt, requireRole } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../middlewares/async.middleware';
const router = Router();
router.post('/', rateLimit({ windowMs: 3600000, limit: 10 }), validateRequest({ body: z.object({
  name: z.string().trim().min(2).max(80), phone: z.string().regex(/^[6-9]\d{9}$/),
  category: z.enum(['Booking Query', 'Billing', 'Worker Feedback', 'Worker Joining', 'Other']), message: z.string().trim().min(10).max(3000),
}) }), asyncHandler(async (req, res) => {
  const ticket = await prisma.supportTicket.create({ data: req.body });
  res.status(201).json({ success: true, ticketId: ticket.id });
}));
router.use(authenticateJwt, requireRole('ADMIN'));
router.get('/', asyncHandler(async (_req, res) => {
  res.json({ success: true, tickets: await prisma.supportTicket.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }) });
}));
router.patch('/:id', validateRequest({ params: z.object({ id: z.string().uuid() }), body: z.object({ status: z.enum(['OPEN', 'RESOLVED']), resolution: z.string().trim().max(2000) }) }), asyncHandler(async (req, res) => {
  const ticket = await prisma.supportTicket.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, ticket });
}));
export default router;
