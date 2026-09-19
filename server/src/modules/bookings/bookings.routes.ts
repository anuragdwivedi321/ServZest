import { Router } from 'express';
import {
  estimatePrice,
  createBooking,
  getBooking,
  cancelBooking,
  approveItem,
  payBill,
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
import { validateRequest } from '../../middlewares/validate.middleware';

const router = Router();

router.post('/estimate', validateRequest({ body: estimatePriceSchema }), estimatePrice);
router.post('/', authenticateJwt, validateRequest({ body: createBookingSchema }), createBooking);
router.get('/my', authenticateJwt, getMyBookings);
router.get('/:id', authenticateJwt, getBooking);
router.post('/:id/cancel', authenticateJwt, validateRequest({ body: cancelBookingSchema }), cancelBooking);
router.post('/:id/approve-item', authenticateJwt, validateRequest({ body: approveItemSchema }), approveItem);
router.post('/:id/pay', authenticateJwt, validateRequest({ body: payBillSchema }), payBill);
router.post('/:id/rate', authenticateJwt, validateRequest({ body: rateBookingSchema }), rateBooking);
router.post('/:id/complaint', authenticateJwt, validateRequest({ body: reportComplaintSchema }), reportComplaint);

export default router;
