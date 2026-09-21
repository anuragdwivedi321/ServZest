import { asyncHandler } from '../../middlewares/async.middleware';
import { Router } from 'express';
import {
  getMetrics,
  listWorkers,
  updateWorkerKyc,
  getLiveWorkers,
  getSettings,
  updateSettings,
  listAllBookings,
  adminCancelBooking,
  listComplaints,
  updateComplaintStatus,
  getAdminServices,
  updateKycSchema,
  updateSettingsSchema,
} from './admin.controller';
import { authenticateJwt, requireRole } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { Role } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { z } from 'zod';
import { updateServicePricing, servicePricingSchema } from './pricing.controller';
import { cancelBookingSchema } from '../bookings/bookings.controller';
import { activateWorkerSubscription, listLedger, settleLedgerEntry } from '../worker/subscription.controller';

const router = Router();
router.param('id', validateRequest({ params: z.object({ id: z.string().uuid() }) }));

router.use(authenticateJwt);
router.use(requireRole(Role.ADMIN));
router.get('/customers', asyncHandler(async (_req, res) => {
  res.json({ success: true, customers: await prisma.user.findMany({ where: { role: 'CUSTOMER' }, select: { id: true, name: true, phone: true, createdAt: true, _count: { select: { bookings: true } } }, orderBy: { createdAt: 'desc' }, take: 200 }) });
}));

router.get('/metrics', asyncHandler(getMetrics));
router.get('/workers', validateRequest({ query: z.object({ kycStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional() }) }), asyncHandler(listWorkers));
router.post('/workers/:id/kyc', validateRequest({ body: updateKycSchema }), asyncHandler(updateWorkerKyc));
router.get('/live-workers', asyncHandler(getLiveWorkers));
router.get('/settings', asyncHandler(getSettings));
router.put('/settings', validateRequest({ body: updateSettingsSchema }), asyncHandler(updateSettings));
router.get('/bookings', asyncHandler(listAllBookings));
router.post('/bookings/:id/cancel', validateRequest({ body: cancelBookingSchema }), asyncHandler(adminCancelBooking));
router.get('/complaints', asyncHandler(listComplaints));
router.patch('/complaints/:id', validateRequest({ body: z.object({ status: z.enum(['OPEN', 'RESOLVED']) }) }), asyncHandler(updateComplaintStatus));
router.get('/services', asyncHandler(getAdminServices));
router.put('/services/:id', validateRequest({ body: servicePricingSchema }), asyncHandler(updateServicePricing));
router.post('/workers/:id/subscription', validateRequest({ body: z.object({ planId: z.string().uuid(), paymentRef: z.string().trim().min(6).max(100) }) }), asyncHandler(activateWorkerSubscription));
router.get('/ledger', asyncHandler(listLedger));
router.get('/audit-logs', asyncHandler(async (_req, res) => res.json({ success: true, logs: await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }) })));
router.patch('/ledger/:id/settle', validateRequest({ body: z.object({ reference: z.string().trim().min(3).max(100) }) }), asyncHandler(settleLedgerEntry));

export default router;
