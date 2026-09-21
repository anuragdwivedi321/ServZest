import { Request, Response } from 'express';
import { bookingError, withBookingLock } from '../../services/booking-lock.service';
import { dispatchService } from '../../services/dispatch.service';
import { pricingService } from '../../services/pricing.service';
import { getSocketServer } from '../../sockets/socket.server';

export const cancelBooking = async (req: Request, res: Response) => {
  const result = await withBookingLock(req.params.id, async tx => {
    const booking = await tx.booking.findUnique({ where: { id: req.params.id } });
    if (!booking || (booking.customerId !== req.user!.id && req.user!.role !== 'ADMIN')) throw bookingError('Booking not found.', 404);
    if (['COMPLETED', 'CANCELLED', 'NO_PROVIDER'].includes(booking.status)) throw bookingError('Booking is already closed.');
    if (booking.status === 'IN_PROGRESS' && req.user!.role !== 'ADMIN') throw bookingError('Contact support to cancel work in progress.', 403);
    const cancellation = await pricingService.calculateCancellationFee(booking.assignedAt, ['ARRIVED','IN_PROGRESS'].includes(booking.status));
    const updated = await tx.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: req.user!.role, cancelReason: req.body.reason || cancellation.reason, cancelFee: cancellation.fee } });
    if (booking.workerId) await tx.workerProfile.update({ where: { id: booking.workerId }, data: { isBusy: false } });
    return { booking: updated, cancellation };
  });
  dispatchService.cancelDispatch(req.params.id);
  getSocketServer()?.to(`booking_${req.params.id}`).emit('booking:status_update', { bookingId: req.params.id, status: 'CANCELLED' });
  res.json({ success: true, ...result });
};
export const approveItem = async (req: Request, res: Response) => {
  const item = await withBookingLock(req.params.id, async tx => {
    const booking = await tx.booking.findUnique({ where: { id: req.params.id } });
    if (!booking || booking.customerId !== req.user!.id || booking.status !== 'IN_PROGRESS') throw bookingError('This booking cannot be changed.', 403);
    const result = await tx.bookingItem.updateMany({ where: { id: req.body.itemId, bookingId: booking.id, approvalStatus: 'PENDING' }, data: { approvalStatus: req.body.action === 'APPROVE' ? 'APPROVED' : 'REJECTED' } });
    if (!result.count) throw bookingError('Item was already handled. Refresh the booking.', 409);
    return tx.bookingItem.findUnique({ where: { id: req.body.itemId } });
  });
  getSocketServer()?.to(`booking_${req.params.id}`).emit('booking:extra_item_response', { bookingId: req.params.id, item });
  res.json({ success: true, item });
};
