import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { pricingService } from '../../services/pricing.service';
import { dispatchService } from '../../services/dispatch.service';
import { getSocketServer } from '../../sockets/socket.server';
import { BookingStatus, ApprovalStatus, PaymentMethod, PaymentStatus, Role } from '@prisma/client';

export const estimatePriceSchema = z.object({
  serviceId: z.string().uuid(),
  serviceItemsTotal: z.number().optional(),
  partsTotal: z.number().optional(),
});

export const createBookingSchema = z.object({
  serviceId: z.string().uuid(),
  pickupLat: z.number(),
  pickupLng: z.number(),
  pickupAddress: z.string().min(3),
});

export const cancelBookingSchema = z.object({
  reason: z.string().optional(),
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
  stars: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export const reportComplaintSchema = z.object({
  issue: z.string().min(5),
});

export const estimatePrice = async (req: Request, res: Response) => {
  const { serviceId, serviceItemsTotal, partsTotal } = req.body;

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) {
    return res.status(404).json({ success: false, message: 'Service not found' });
  }

  const bill = await pricingService.calculateBill({
    baseVisitCharge: service.visitCharge,
    serviceItemsTotal,
    partsTotal,
  });

  return res.status(200).json({ success: true, bill });
};

export const createBooking = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { serviceId, pickupLat, pickupLng, pickupAddress } = req.body;

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) {
    return res.status(404).json({ success: false, message: 'Service not found' });
  }

  // Generate 4-digit start OTP
  const startOtp = Math.floor(1000 + Math.random() * 9000).toString();

  // Create booking in SEARCHING state
  const booking = await prisma.booking.create({
    data: {
      customerId,
      serviceId,
      pickupLat,
      pickupLng,
      pickupAddress,
      startOtp,
      baseVisitCharge: service.visitCharge,
      status: BookingStatus.SEARCHING,
    },
    include: {
      service: true,
      customer: { select: { id: true, name: true, phone: true } },
    },
  });

  // Trigger dispatch engine asynchronously
  const io = getSocketServer();

  dispatchService.startDispatch(booking.id, serviceId, pickupLat, pickupLng, {
    onWorkerRequested: (worker, timeoutSec) => {
      if (io) {
        io.to(`worker_${worker.id}`).emit('worker:new_request', {
          bookingId: booking.id,
          serviceName: service.nameEn,
          serviceNameHi: service.nameHi,
          pickupAddress,
          distanceMeters: worker.straightDistanceMeters,
          roadDistanceKm: worker.roadDistanceKm,
          etaMinutes: worker.etaMinutes,
          baseVisitCharge: service.visitCharge,
          timeoutSec,
        });
      }
    },
    onDispatchExhausted: async () => {
      console.log(`[BookingsController] Dispatch exhausted for booking ${booking.id}`);
      if (io) {
        io.to(`booking_${booking.id}`).emit('booking:status_update', {
          bookingId: booking.id,
          status: BookingStatus.SEARCHING,
          message: 'No worker currently available. You may retry or wait.',
          exhausted: true,
        });
      }
    },
    onWorkerAssigned: async (worker) => {
      console.log(`[BookingsController] Worker ${worker.id} assigned to booking ${booking.id}`);
      if (io) {
        io.to(`booking_${booking.id}`).emit('booking:status_update', {
          bookingId: booking.id,
          status: BookingStatus.ASSIGNED,
          worker: {
            id: worker.id,
            name: worker.name,
            phone: worker.phone,
            rating: worker.rating,
          },
          etaMinutes: worker.etaMinutes,
        });
      }
    },
  });

  return res.status(201).json({ success: true, booking });
};

export const getBooking = async (req: Request, res: Response) => {
  const { id } = req.params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      service: true,
      customer: { select: { id: true, name: true, phone: true } },
      worker: {
        include: {
          user: { select: { name: true, phone: true } },
        },
      },
      items: true,
      payment: true,
      rating: true,
    },
  });

  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }

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
    bookingTime: booking.createdAt,
  });

  return res.status(200).json({ success: true, booking, bill });
};

export const cancelBooking = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;
  const { reason } = req.body;

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }

  if (booking.status === BookingStatus.COMPLETED || booking.status === BookingStatus.CANCELLED) {
    return res.status(400).json({ success: false, message: 'Booking cannot be cancelled' });
  }

  // Rule: IN_PROGRESS can ONLY be cancelled by Admin
  if (booking.status === BookingStatus.IN_PROGRESS && userRole !== Role.ADMIN) {
    return res.status(403).json({
      success: false,
      message: 'Job is already in progress. Only an administrator can cancel this booking.',
    });
  }

  // Cancel any active dispatch session
  dispatchService.cancelDispatch(id);

  // If worker was assigned, free worker
  if (booking.workerId) {
    await prisma.workerProfile.update({
      where: { id: booking.workerId },
      data: { isBusy: false },
    });
  }

  // Calculate cancellation fee
  const workerArrived = booking.status === BookingStatus.ARRIVED || booking.status === BookingStatus.IN_PROGRESS;
  const cancelResult = await pricingService.calculateCancellationFee(booking.assignedAt, workerArrived);

  const updatedBooking = await prisma.booking.update({
    where: { id },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: userRole,
      cancelReason: reason || cancelResult.reason,
      cancelFee: cancelResult.fee,
    },
  });

  const io = getSocketServer();
  if (io) {
    io.to(`booking_${id}`).emit('booking:status_update', {
      bookingId: id,
      status: BookingStatus.CANCELLED,
      cancelFee: cancelResult.fee,
      cancelReason: reason || cancelResult.reason,
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Booking cancelled successfully',
    booking: updatedBooking,
    cancellation: cancelResult,
  });
};

export const approveItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { itemId, action } = req.body;

  const item = await prisma.bookingItem.findUnique({
    where: { id: itemId },
    include: { booking: true },
  });

  if (!item || item.bookingId !== id) {
    return res.status(404).json({ success: false, message: 'Item not found for this booking' });
  }

  const newStatus = action === 'APPROVE' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;

  const updatedItem = await prisma.bookingItem.update({
    where: { id: itemId },
    data: { approvalStatus: newStatus },
  });

  const io = getSocketServer();
  if (io) {
    io.to(`booking_${id}`).emit('booking:extra_item_response', {
      bookingId: id,
      itemId,
      status: newStatus,
      item: updatedItem,
    });
  }

  return res.status(200).json({ success: true, item: updatedItem });
};

export const payBill = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { method, transactionRef } = req.body;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }

  // Calculate final bill
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
    bookingTime: booking.createdAt,
  });

  const payment = await prisma.payment.upsert({
    where: { bookingId: id },
    update: {
      method,
      amount: bill.totalAmount,
      status: PaymentStatus.COMPLETED,
      transactionRef: transactionRef || (method === PaymentMethod.UPI ? `UPI_${Date.now()}` : 'CASH'),
    },
    create: {
      bookingId: id,
      method,
      amount: bill.totalAmount,
      status: PaymentStatus.COMPLETED,
      transactionRef: transactionRef || (method === PaymentMethod.UPI ? `UPI_${Date.now()}` : 'CASH'),
    },
  });

  // Save finalized totals on booking
  await prisma.booking.update({
    where: { id },
    data: {
      serviceTotal: bill.serviceTotal,
      partsTotal: bill.partsTotal,
      nightSurgeRate: bill.nightSurgeRate,
      rushSurgeRate: bill.rushSurgeRate,
      platformFee: bill.platformFee,
      totalAmount: bill.totalAmount,
    },
  });

  return res.status(200).json({ success: true, payment, bill });
};

export const rateBooking = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { id } = req.params;
  const { stars, comment } = req.body;

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || !booking.workerId) {
    return res.status(404).json({ success: false, message: 'Booking or assigned worker not found' });
  }

  const rating = await prisma.rating.create({
    data: {
      bookingId: id,
      customerId,
      workerId: booking.workerId,
      stars,
      comment,
    },
  });

  // Recalculate worker average rating
  const ratings = await prisma.rating.findMany({
    where: { workerId: booking.workerId },
    select: { stars: true },
  });

  const avgRating = ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length;

  await prisma.workerProfile.update({
    where: { id: booking.workerId },
    data: {
      rating: Number(avgRating.toFixed(2)),
      totalRatings: ratings.length,
    },
  });

  return res.status(201).json({ success: true, rating });
};

export const reportComplaint = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { issue } = req.body;

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
      worker: {
        include: {
          user: { select: { name: true, phone: true } },
        },
      },
      payment: true,
      rating: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.status(200).json({ success: true, bookings });
};
