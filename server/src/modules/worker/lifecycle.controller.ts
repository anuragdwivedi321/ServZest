import { Request, Response } from 'express';
import { bookingError, withBookingLock, withoutOtp } from '../../services/booking-lock.service';
import { bookingPricingInput } from '../../services/checkout.service';
import { pricingService } from '../../services/pricing.service';
import { getSocketServer } from '../../sockets/socket.server';

async function change(req: Request, res: Response, action: 'status' | 'start' | 'item' | 'complete') {
  const result = await withBookingLock(req.params.id, async tx => {
    const booking = await tx.booking.findUnique({ where: { id: req.params.id }, include: { worker: true, items: true } });
    if (!booking || booking.worker?.userId !== req.user!.id) throw bookingError('Booking not assigned to you.', 403);
    if (action === 'status' || action === 'start') {
      const next = action === 'start' ? 'IN_PROGRESS' : req.body.status;
      const previous = next === 'EN_ROUTE' ? 'ASSIGNED' : next === 'ARRIVED' ? 'EN_ROUTE' : 'ARRIVED';
      if (booking.status !== previous) throw bookingError('Booking status changed. Refresh and try again.', 409);
      if (action === 'start' && booking.startOtp !== req.body.otp) throw bookingError('Invalid customer start OTP.');
      const updated = await tx.booking.update({ where: { id: booking.id }, data: { status: next, ...(next === 'ARRIVED' ? { arrivedAt: new Date() } : {}), ...(next === 'IN_PROGRESS' ? { startedAt: new Date() } : {}) } });
      return { booking: withoutOtp(updated) };
    }
    if (booking.status !== 'IN_PROGRESS') throw bookingError('This job is not in progress.', 409);
    if (action === 'item') {
      if (req.body.serviceItemId && !await tx.serviceItem.findFirst({ where: { id: req.body.serviceItemId, serviceId: booking.serviceId } })) throw bookingError('Task does not belong to this service.');
      const item = await tx.bookingItem.create({ data: { bookingId: booking.id, ...req.body, approvalStatus: 'PENDING' } });
      return { item };
    }
    if (booking.items.some(item => item.approvalStatus === 'PENDING')) throw bookingError('Wait for the customer to approve or reject all extra items.');
    const approved = booking.items.filter(item => item.approvalStatus === 'APPROVED');
    const bill = await pricingService.calculateBill({ baseVisitCharge: booking.baseVisitCharge, serviceItemsTotal: approved.filter(i => !i.isPart).reduce((s, i) => s + i.unitPrice * i.quantity, 0), partsTotal: approved.filter(i => i.isPart).reduce((s, i) => s + i.unitPrice * i.quantity, 0), ...bookingPricingInput(booking) });
    const updated = await tx.booking.update({ where: { id: booking.id }, data: { status: 'COMPLETED', completedAt: new Date(), serviceTotal: bill.serviceTotal, partsTotal: bill.partsTotal, platformFee: bill.platformFee, totalAmount: bill.totalAmount } });
    await tx.workerProfile.update({ where: { id: booking.workerId! }, data: { isBusy: false } });
    return { booking: withoutOtp(updated), bill };
  });
  const io = getSocketServer();
  if (result.item) io?.to(`booking_${req.params.id}`).emit('booking:extra_item_added', { bookingId: req.params.id, item: result.item });
  else io?.to(`booking_${req.params.id}`).emit('booking:status_update', { bookingId: req.params.id, status: result.booking?.status });
  res.json({ success: true, ...result });
}
export const updateBookingStatus = (req: Request, res: Response) => change(req, res, 'status');
export const startBooking = (req: Request, res: Response) => change(req, res, 'start');
export const addItemToBill = (req: Request, res: Response) => change(req, res, 'item');
export const completeBooking = (req: Request, res: Response) => change(req, res, 'complete');
