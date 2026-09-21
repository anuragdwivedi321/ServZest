import { asyncHandler } from '../../middlewares/async.middleware';
import { Router } from 'express';
import {
  getWorkerProfile,
  submitKyc,
  toggleOnline,
  acceptBooking,
  rejectBooking,
  updateBookingStatus,
  startBooking,
  addItemToBill,
  completeBooking,
  getEarnings,
  kycSchema,
  toggleOnlineSchema,
  updateStatusSchema,
  startBookingSchema,
  addItemSchema,
} from './worker.controller';
import { authenticateJwt, requireRole } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { Role } from '@prisma/client';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { saveUpiProfile, upiSchema, confirmReceipt, confirmPaymentSchema } from '../bookings/payment.controller';
import { getSubscription } from './subscription.controller';
const router = Router();
router.param('id', validateRequest({ params: z.object({ id: z.string().uuid() }) }));

router.use(authenticateJwt);
router.use(requireRole(Role.WORKER));

router.put('/upi', validateRequest({ body: upiSchema }), asyncHandler(saveUpiProfile));
router.post('/bookings/:id/receipt', validateRequest({ body: confirmPaymentSchema }), asyncHandler(confirmReceipt));
router.get('/profile', asyncHandler(getWorkerProfile));
router.post('/kyc', validateRequest({ body: kycSchema }), asyncHandler(submitKyc));
router.post('/toggle-online', validateRequest({ body: toggleOnlineSchema }), asyncHandler(toggleOnline));
router.post('/bookings/:id/accept', asyncHandler(acceptBooking));
router.post('/bookings/:id/reject', asyncHandler(rejectBooking));
router.post('/bookings/:id/status', validateRequest({ body: updateStatusSchema }), asyncHandler(updateBookingStatus));
router.post('/bookings/:id/start', rateLimit({ windowMs: 900000, limit: 10, keyGenerator: req => `${req.user!.id}:${req.params.id}` }), validateRequest({ body: startBookingSchema }), asyncHandler(startBooking));
router.post('/bookings/:id/add-item', validateRequest({ body: addItemSchema }), asyncHandler(addItemToBill));
router.post('/bookings/:id/complete', asyncHandler(completeBooking));
router.get('/earnings', asyncHandler(getEarnings));
router.get('/subscription', asyncHandler(getSubscription));

export default router;
