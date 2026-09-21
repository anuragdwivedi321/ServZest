import { randomInt } from 'crypto';
import { getRoadRoute } from '../../services/road-route.service';
import { checkoutSchema, checkoutQuote, bookingPricingInput } from '../../services/checkout.service';
import { dispatchBooking } from '../../services/booking-dispatch.service';
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { pricingService } from '../../services/pricing.service';
import { dispatchService } from '../../services/dispatch.service';
import { getSocketServer } from '../../sockets/socket.server';
import { BookingStatus, ApprovalStatus, PaymentMethod, PaymentStatus, Role } from '@prisma/client';

export const estimatePriceSchema = checkoutSchema;
export const createBookingSchema = checkoutSchema.extend({
  pickupLat: z.number().min(-90).max(90),
  pickupLng: z.number().min(-180).max(180),
  pickupAddress: z.string().trim().min(8).max(500),
  problemDescription: z.string().trim().max(1000).optional(),
  locationConfirmed: z.literal(true),
  requestKey: z.string().uuid(),
  acceptedTotal: z.number().nonnegative(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
});

export const approveItemSchema = z.object({
  itemId: z.string().uuid(),
  action: z.enum(['APPROVE', 'REJECT']),
});

export const payBillSchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  transactionRef: z.string().optional(),
});

export const rateBookingSchema = z.object({
  stars: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});

export const reportComplaintSchema = z.object({
  issue: z.string().trim().min(5).max(3000),
});

export const estimatePrice = async (req: Request, res: Response) => {
  try {
    const quote = await checkoutQuote(req.body, req.user?.id);
    return res.json({ success: true, bill: quote.bill });
  } catch (error: any) {
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Could not calculate price. Please retry.' });
  }
};

export const createBooking = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const input = req.body;
  try {
    const booking = await prisma.$transaction(async tx => {
      // Serialize this customer's coupon use and repeated checkout requests.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${customerId}))`;
      const existing = await tx.booking.findUnique({ where: { requestKey: input.requestKey } });
      if (existing) {
        if (existing.customerId !== customerId) throw Object.assign(new Error('Invalid booking request.'), { status: 409 });
        return existing;
      }
      const quote = await checkoutQuote(input, customerId, tx);
      if (Math.abs(quote.bill.totalAmount - input.acceptedTotal) > 0.01) {
        throw Object.assign(new Error('Price changed. Refresh the estimate and confirm again.'), { status: 409 });
      }
      return tx.booking.create({ data: {
        customerId, serviceId: input.serviceId, pickupLat: input.pickupLat, pickupLng: input.pickupLng,
        pickupAddress: input.pickupAddress, problemDescription: input.problemDescription,
        requestKey: input.requestKey, scheduledAt: quote.scheduledAt,
        couponCode: input.couponCode || null, discountAmount: quote.bill.discountAmount,
        startOtp: randomInt(1000, 10000).toString(),
        status: quote.scheduledAt ? BookingStatus.SCHEDULED : BookingStatus.SEARCHING,
        baseVisitCharge: quote.bill.baseVisitCharge, serviceTotal: quote.bill.serviceTotal,
        totalAmount: quote.bill.totalAmount, platformFee: quote.bill.platformFee,
        nightSurgeRate: quote.bill.nightSurgeRate, rushSurgeRate: quote.bill.rushSurgeRate,
        pricingSnapshot: { nightSurgeRate: quote.bill.nightSurgeRate, rushSurgeRate: quote.bill.rushSurgeRate, commissionPct: quote.bill.commissionPct },
        items: { create: quote.selectedItems },
      } });
    }, { timeout: 20000 });
    if (booking.status === BookingStatus.SEARCHING && !dispatchService.hasSession(booking.id)) {
      void dispatchBooking(booking.id).catch(error => console.error('Dispatch failed:', error));
    }
    return res.status(201).json({ success: true, booking });
  } catch (error: any) {
    console.error('Checkout:', error.message);
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Booking could not be saved. Please retry.' });
  }
};

export const getBooking = async (req: Request, res: Response) => {
  const { id } = req.params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      service: true,
      customer: { select: { id: true, name: true, phone: true } },
      worker: { select: { id: true, photoUrl: true, rating: true, totalRatings: true, vehicleType: true, user: { select: { name: true, phone: true } } } },
      items: true,
      payment: true,
      rating: true,
    },
  });

  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }

  if (booking.customerId !== req.user!.id && req.user!.role !== Role.ADMIN) return res.status(403).json({ success: false, message: 'This booking belongs to another customer.' });

  // Calculate live bill breakdown
  const approvedItems = booking.items.filter((i) => i.approvalStatus === ApprovalStatus.APPROVED);
  const serviceTotal = approvedItems
    .filter((i) => !i.isPart)
    .reduce((acc, curr) => acc + curr.unitPrice * curr.quantity, 0);
  const partsTotal = approvedItems
    .filter((i) => i.isPart)
    .reduce((acc, curr) => acc + curr.unitPrice * curr.quantity, 0);

  const bill = await pricingService.calculateBill({
    baseVisitCharge: booking.baseVisitCharge,
    serviceItemsTotal: serviceTotal,
    partsTotal: partsTotal,
    ...bookingPricingInput(booking),
  });

  let workerLocation = null;
  if (booking.workerId && ['ASSIGNED', 'EN_ROUTE', 'ARRIVED'].includes(booking.status)) {
    const rows = await prisma.$queryRaw<Array<{ lat: number; lng: number; updatedAt: Date; distance: number }>>`
      SELECT ST_Y(current_location::geometry) AS lat, ST_X(current_location::geometry) AS lng,
      last_location_at AS "updatedAt", ST_Distance(current_location,
      ST_SetSRID(ST_MakePoint(${booking.pickupLng}, ${booking.pickupLat}), 4326)::geography) AS distance
      FROM worker_profiles WHERE id = ${booking.workerId} AND current_location IS NOT NULL
      AND last_location_at > NOW() - INTERVAL '2 minutes'`;
    if (rows[0]) {
      const route = await getRoadRoute([rows[0].lat, rows[0].lng], [booking.pickupLat, booking.pickupLng]);
      workerLocation = { lat: rows[0].lat, lng: rows[0].lng, updatedAt: rows[0].updatedAt, distanceMeters: rows[0].distance,
        ...dispatchService.calculateEta(rows[0].distance), route,
        ...(route ? { etaMinutes: Math.max(1, Math.ceil(route.durationSeconds / 60)) } : {}) };
    }
  }
  return res.status(200).json({ success: true, booking, bill, workerLocation });
};

export { cancelBooking, approveItem } from './actions.controller';

export const rateBooking = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { id } = req.params;
  const { stars, comment } = req.body;

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || !booking.workerId) {
    return res.status(404).json({ success: false, message: 'Booking or assigned worker not found' });
  }

  if (booking.customerId !== customerId || booking.status !== BookingStatus.COMPLETED) return res.status(403).json({ success: false, message: 'Only your completed booking can be reviewed.' });

  const rating = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT id FROM worker_profiles WHERE id = ${booking.workerId} FOR UPDATE`;
    const saved = await tx.rating.upsert({ where: { bookingId: id }, update: { stars, comment }, create: { bookingId: id, customerId, workerId: booking.workerId!, stars, comment } });
    const stats = await tx.rating.aggregate({ where: { workerId: booking.workerId! }, _avg: { stars: true }, _count: true });
    await tx.workerProfile.update({ where: { id: booking.workerId! }, data: { rating: Number((stats._avg.stars || 0).toFixed(2)), totalRatings: stats._count } });
    return saved;
  });

  return res.status(201).json({ success: true, rating });
};

export const reportComplaint = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { issue } = req.body;

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.customerId !== userId) return res.status(403).json({ success: false, message: 'This booking belongs to another customer.' });
  const complaint = await prisma.complaint.create({
    data: {
      bookingId: id,
      userId,
      issue,
    },
  });

  return res.status(201).json({ success: true, complaint });
};

export const getMyBookings = async (req: Request, res: Response) => {
  const customerId = req.user!.id;

  const bookings = await prisma.booking.findMany({
    where: { customerId },
    include: {
      service: true,
      worker: { select: { id: true, photoUrl: true, rating: true, totalRatings: true, vehicleType: true, user: { select: { name: true, phone: true } } } },
      payment: true,
      rating: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return res.status(200).json({ success: true, bookings });
};
