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
  updateKycSchema,
  updateSettingsSchema,
} from './admin.controller';
import { authenticateJwt, requireRole } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJwt);
router.use(requireRole(Role.ADMIN));

router.get('/metrics', getMetrics);
router.get('/workers', listWorkers);
router.post('/workers/:id/kyc', validateRequest({ body: updateKycSchema }), updateWorkerKyc);
router.get('/live-workers', getLiveWorkers);
router.get('/settings', getSettings);
router.put('/settings', validateRequest({ body: updateSettingsSchema }), updateSettings);
router.get('/bookings', listAllBookings);
router.post('/bookings/:id/cancel', adminCancelBooking);
router.get('/complaints', listComplaints);

export default router;
