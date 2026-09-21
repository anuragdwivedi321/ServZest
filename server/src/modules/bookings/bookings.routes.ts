import { apiErrorHandler } from '../../middlewares/api-error.middleware';
import { Router, Request, Response, NextFunction } from 'express';
import { getPaymentQr, reportPayment, reportPaymentSchema } from './payment.controller';
import { z } from 'zod';
import {
  estimatePrice,
  createBooking,
  getBooking,
  cancelBooking,
  approveItem,
  rateBooking,
  reportComplaint,
  getMyBookings,
  estimatePriceSchema,
  createBookingSchema,
  cancelBookingSchema,
  approveItemSchema,
  payBillSchema,
  rateBookingSchema,
  reportComplaintSchema,
} from './bookings.controller';
import { authenticateJwt } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { Role } from '@prisma/client';

const router = Router();
const safe = (handler: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(handler(req, res)).catch(next);
};

router.post('/estimate', (req, res, next) => req.headers.authorization ? authenticateJwt(req, res, next) : next(), validateRequest({ body: estimatePriceSchema }), estimatePrice);
router.post('/', authenticateJwt, requireRole(Role.CUSTOMER), validateRequest({ body: createBookingSchema }), createBooking);
router.get('/my', authenticateJwt, requireRole(Role.CUSTOMER), safe(getMyBookings));
router.use('/:id', validateRequest({ params: z.object({ id: z.string().uuid() }) }));
router.get('/:id', authenticateJwt, requireRole(Role.CUSTOMER, Role.ADMIN), safe(getBooking));
router.post('/:id/cancel', authenticateJwt, requireRole(Role.CUSTOMER), validateRequest({ body: cancelBookingSchema }), safe(cancelBooking));
router.post('/:id/approve-item', authenticateJwt, requireRole(Role.CUSTOMER), validateRequest({ body: approveItemSchema }), safe(approveItem));
router.post('/:id/payment-qr', authenticateJwt, requireRole(Role.CUSTOMER), safe(getPaymentQr));
router.post('/:id/pay', authenticateJwt, requireRole(Role.CUSTOMER), validateRequest({ body: reportPaymentSchema }), safe(reportPayment));
router.post('/:id/rate', authenticateJwt, requireRole(Role.CUSTOMER), validateRequest({ body: rateBookingSchema }), safe(rateBooking));
router.post('/:id/complaint', authenticateJwt, requireRole(Role.CUSTOMER), validateRequest({ body: reportComplaintSchema }), safe(reportComplaint));
router.use(apiErrorHandler);

export default router;
