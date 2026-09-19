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

const router = Router();

router.use(authenticateJwt);
router.use(requireRole(Role.WORKER));

router.get('/profile', getWorkerProfile);
router.post('/kyc', validateRequest({ body: kycSchema }), submitKyc);
router.post('/toggle-online', validateRequest({ body: toggleOnlineSchema }), toggleOnline);
router.post('/bookings/:id/accept', acceptBooking);
router.post('/bookings/:id/reject', rejectBooking);
router.post('/bookings/:id/status', validateRequest({ body: updateStatusSchema }), updateBookingStatus);
router.post('/bookings/:id/start', validateRequest({ body: startBookingSchema }), startBooking);
router.post('/bookings/:id/add-item', validateRequest({ body: addItemSchema }), addItemToBill);
router.post('/bookings/:id/complete', completeBooking);
router.get('/earnings', getEarnings);

export default router;
