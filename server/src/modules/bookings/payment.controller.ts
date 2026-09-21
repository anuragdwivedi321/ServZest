import { withBookingLock } from '../../services/booking-lock.service';
import { Request, Response } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import { prisma } from '../../db/prisma';
import { getSocketServer } from '../../sockets/socket.server';

export const upiSchema = z.object({
  upiId: z.string().trim().regex(/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z0-9.-]{2,64}$/, 'Enter a valid UPI ID'),
  upiName: z.string().trim().min(2).max(80),
});
export const reportPaymentSchema = z.object({
  method: z.enum(['CASH', 'UPI']),
  transactionRef: z.string().trim().regex(/^[a-zA-Z0-9-]{6,64}$/, 'Enter your UPI transaction reference').optional(),
}).refine(value => value.method !== 'UPI' || Boolean(value.transactionRef), 'UPI transaction reference is required');
export const confirmPaymentSchema = z.object({ action: z.enum(['CONFIRM', 'REJECT']) });
const fail = (message: string, status = 400) => Object.assign(new Error(message), { status });
export function upiLink(payee: string, name: string, amount: number, reference: string) {
  const values = { pa: payee, pn: name, am: amount.toFixed(2), cu: 'INR', tr: reference, tn: `ServZest ${reference}` };
  return 'upi://pay?' + Object.entries(values).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
}

export const saveUpiProfile = async (req: Request, res: Response) => {
  const profile = await prisma.workerProfile.update({ where: { userId: req.user!.id }, data: req.body });
  res.json({ success: true, upiId: profile.upiId, upiName: profile.upiName });
};

export const getPaymentQr = async (req: Request, res: Response) => {
  const payment = await withBookingLock(req.params.id, async tx => {
    const booking = await tx.booking.findUnique({ where: { id: req.params.id }, include: { worker: true, payment: true } });
    if (!booking || booking.customerId !== req.user!.id) throw fail('Booking not found.', 404);
    if (booking.status !== 'COMPLETED') throw fail('QR payment is available after the final bill is ready.');
    if (booking.payment?.status === 'COMPLETED') throw fail('This booking is already paid.', 409);
    if (booking.payment?.reportedAt) throw fail('Your payment is awaiting the professional’s receipt confirmation.', 409);
    if (booking.payment?.status === 'PENDING' && booking.payment.method === 'UPI' && booking.payment.payeeUpiId) return booking.payment;
    if (!booking.worker?.upiId || !booking.worker.upiName) throw fail('Professional has not set up UPI. Ask them to add their UPI ID or pay cash.');
    return tx.payment.upsert({ where: { bookingId: booking.id },
      create: { bookingId: booking.id, method: 'UPI', amount: booking.totalAmount, payeeUpiId: booking.worker.upiId, payeeName: booking.worker.upiName },
      update: { method: 'UPI', status: 'PENDING', amount: booking.totalAmount, payeeUpiId: booking.worker.upiId, payeeName: booking.worker.upiName, transactionRef: null },
    });
  });
  const uri = upiLink(payment.payeeUpiId!, payment.payeeName!, payment.amount, payment.id);
  const qrDataUrl = await QRCode.toDataURL(uri, { width: 300, margin: 2, errorCorrectionLevel: 'M' });
  res.json({ success: true, qrDataUrl, uri, amount: payment.amount, payeeName: payment.payeeName, payeeUpiId: payment.payeeUpiId });
};

export const reportPayment = async (req: Request, res: Response) => {
  const payment = await withBookingLock(req.params.id, async tx => {
    const booking = await tx.booking.findUnique({ where: { id: req.params.id }, include: { payment: true } });
    if (!booking || booking.customerId !== req.user!.id) throw fail('Booking not found.', 404);
    if (booking.status !== 'COMPLETED' || !booking.workerId) throw fail('Payment can be reported only after service completion.');
    if (booking.payment?.status === 'COMPLETED' || booking.payment?.reportedAt) return booking.payment;
    if (req.body.method === 'UPI' && (!booking.payment?.payeeUpiId || booking.payment.method !== 'UPI')) throw fail('Open the payment QR first.');
    return tx.payment.upsert({ where: { bookingId: booking.id },
      create: { bookingId: booking.id, method: req.body.method, amount: booking.totalAmount, reportedAt: new Date(), transactionRef: req.body.transactionRef },
      update: { method: req.body.method, status: 'PENDING', amount: booking.totalAmount, reportedAt: new Date(), transactionRef: req.body.transactionRef || null },
    });
  });
  getSocketServer()?.to(`booking_${req.params.id}`).emit('booking:payment_update', { bookingId: req.params.id });
  res.json({ success: true, payment, message: 'Reported. Waiting for the professional to confirm receipt.' });
};

export const confirmReceipt = async (req: Request, res: Response) => {
  const payment = await withBookingLock(req.params.id, async tx => {
    const booking = await tx.booking.findUnique({ where: { id: req.params.id }, include: { worker: true, payment: true } });
    if (!booking || booking.worker?.userId !== req.user!.id) throw fail('Booking not assigned to you.', 403);
    if (booking.status !== 'COMPLETED' || !booking.payment?.reportedAt) throw fail('Customer has not reported payment yet.');
    if (booking.payment.status === 'COMPLETED') return booking.payment;
    const updated = await tx.payment.update({ where: { bookingId: booking.id }, data: req.body.action === 'CONFIRM'
      ? { status: 'COMPLETED', confirmedAt: new Date(), confirmedBy: req.user!.id }
      : { status: 'FAILED', reportedAt: null, transactionRef: null } });
    if (req.body.action === 'CONFIRM' && booking.platformFee > 0) {
      await tx.ledgerEntry.upsert({
        where: { bookingId_type: { bookingId: booking.id, type: 'COMMISSION_DUE' } },
        create: { workerId: booking.worker.id, bookingId: booking.id, paymentId: updated.id, type: 'COMMISSION_DUE', amount: booking.platformFee, status: 'DUE' },
        update: {},
      });
    }
    await tx.auditLog.create({ data: { actorId: req.user!.id, action: req.body.action === 'CONFIRM' ? 'PAYMENT_RECEIPT_CONFIRMED' : 'PAYMENT_RECEIPT_REJECTED', entityType: 'Payment', entityId: updated.id, metadata: { bookingId: booking.id, method: updated.method }, ipAddress: req.ip } });
    return updated;
  });
  getSocketServer()?.to(`booking_${req.params.id}`).emit('booking:payment_update', { bookingId: req.params.id });
  res.json({ success: true, payment });
};
