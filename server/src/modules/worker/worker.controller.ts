import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { dispatchService } from '../../services/dispatch.service';
import { pricingService } from '../../services/pricing.service';
import { getSocketServer } from '../../sockets/socket.server';
import { BookingStatus, KycStatus, ApprovalStatus } from '@prisma/client';

export const kycSchema = z.object({
  aadhaarNumber: z.string().min(12).max(14),
  photoUrl: z.string().url().optional(),
  vehicleType: z.string().optional(),
  skills: z.array(z.string()),
  serviceIds: z.array(z.string().uuid()),
});

export const toggleOnlineSchema = z.object({
  isOnline: z.boolean(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['EN_ROUTE', 'ARRIVED']),
});

export const startBookingSchema = z.object({
  otp: z.string().length(4),
});

export const addItemSchema = z.object({
  serviceItemId: z.string().uuid().optional(),
  description: z.string().min(2),
  quantity: z.number().min(1).default(1),
  unitPrice: z.number().min(0),
  isPart: z.boolean().default(false),
});

export const getWorkerProfile = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const profile = await prisma.workerProfile.findUnique({
    where: { userId },
    include: {
      services: { include: { service: true } },
      user: { select: { name: true, phone: true } },
    },
  });

  if (!profile) {
    return res.status(404).json({ success: false, message: 'Worker profile not found' });
  }

  // Find active booking if any
  const activeBooking = await prisma.booking.findFirst({
    where: {
      workerId: profile.id,
      status: { in: [BookingStatus.ASSIGNED, BookingStatus.EN_ROUTE, BookingStatus.ARRIVED, BookingStatus.IN_PROGRESS] },
    },
    include: {
      service: true,
      customer: { select: { name: true, phone: true } },
      items: true,
    },
  });

  return res.status(200).json({ success: true, profile, activeBooking });
};

export const submitKyc = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { aadhaarNumber, photoUrl, vehicleType, skills, serviceIds } = req.body;

  let profile = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!profile) {
    profile = await prisma.workerProfile.create({
      data: { userId, skills: [] },
    });
  }

  const updatedProfile = await prisma.workerProfile.update({
    where: { id: profile.id },
    data: {
      aadhaarNumber,
      photoUrl,
      vehicleType,
      skills,
      kycStatus: KycStatus.PENDING, // Awaiting admin approval
    },
  });

  // Link services
  await prisma.workerService.deleteMany({ where: { workerId: profile.id } });
  for (const serviceId of serviceIds) {
    await prisma.workerService.create({
      data: { workerId: profile.id, serviceId },
    });
  }

  return res.status(200).json({
    success: true,
    message: 'KYC submitted successfully. Awaiting admin review.',
    profile: updatedProfile,
  });
};

export const toggleOnline = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { isOnline } = req.body;

  const profile = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!profile) {
    return res.status(404).json({ success: false, message: 'Worker profile not found' });
  }

  if (profile.kycStatus !== KycStatus.APPROVED && isOnline) {
    return res.status(400).json({
      success: false,
      message: 'KYC must be approved by admin before going online.',
    });
  }

  const updated = await prisma.workerProfile.update({
    where: { id: profile.id },
    data: { isOnline },
  });

  return res.status(200).json({ success: true, isOnline: updated.isOnline });
};

export const acceptBooking = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const profile = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!profile) {
    return res.status(404).json({ success: false, message: 'Worker profile not found' });
  }

  const result = await dispatchService.handleWorkerAccept(id, profile.id);
  if (!result.success) {
    return res.status(400).json(result);
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      service: true,
      customer: { select: { id: true, name: true, phone: true } },
    },
  });

  const io = getSocketServer();
  if (io) {
    io.to(`booking_${id}`).emit('booking:status_update', {
      bookingId: id,
      status: BookingStatus.ASSIGNED,
      worker: {
        id: profile.id,
        name: req.user!.phone,
        rating: profile.rating,
      },
    });
  }

  return res.status(200).json({ success: true, message: 'Booking accepted', booking });
};

export const rejectBooking = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const profile = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!profile) {
    return res.status(404).json({ success: false, message: 'Worker profile not found' });
  }

  await dispatchService.handleWorkerReject(id, profile.id);
  return res.status(200).json({ success: true, message: 'Booking rejected, advancing to next candidate' });
};

export const updateBookingStatus = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { status } = req.body;

  const profile = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!profile) {
    return res.status(404).json({ success: false, message: 'Worker profile not found' });
  }

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.workerId !== profile.id) {
    return res.status(404).json({ success: false, message: 'Booking not assigned to this worker' });
  }

  // Validate state machine transitions:
  // ASSIGNED -> EN_ROUTE
  // EN_ROUTE -> ARRIVED
  if (status === 'EN_ROUTE' && booking.status !== BookingStatus.ASSIGNED) {
    return res.status(400).json({ success: false, message: 'Invalid transition to EN_ROUTE' });
  }
  if (status === 'ARRIVED' && booking.status !== BookingStatus.EN_ROUTE) {
    return res.status(400).json({ success: false, message: 'Invalid transition to ARRIVED' });
  }

  const updatedBooking = await prisma.booking.update({
    where: { id },
    data: {
      status: status === 'EN_ROUTE' ? BookingStatus.EN_ROUTE : BookingStatus.ARRIVED,
      ...(status === 'ARRIVED' ? { arrivedAt: new Date() } : {}),
    },
  });

  const io = getSocketServer();
  if (io) {
    io.to(`booking_${id}`).emit('booking:status_update', {
      bookingId: id,
      status: updatedBooking.status,
    });
  }

  return res.status(200).json({ success: true, booking: updatedBooking });
};

export const startBooking = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { otp } = req.body;

  const profile = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!profile) {
    return res.status(404).json({ success: false, message: 'Worker profile not found' });
  }

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.workerId !== profile.id) {
    return res.status(404).json({ success: false, message: 'Booking not assigned to this worker' });
  }

  if (booking.status !== BookingStatus.ARRIVED) {
    return res.status(400).json({ success: false, message: 'Worker must arrive before starting job' });
  }

  if (booking.startOtp !== otp) {
    return res.status(400).json({ success: false, message: 'Invalid 4-digit start OTP' });
  }

  const updatedBooking = await prisma.booking.update({
    where: { id },
    data: {
      status: BookingStatus.IN_PROGRESS,
      startedAt: new Date(),
    },
  });

  const io = getSocketServer();
  if (io) {
    io.to(`booking_${id}`).emit('booking:status_update', {
      bookingId: id,
      status: BookingStatus.IN_PROGRESS,
    });
  }

  return res.status(200).json({ success: true, message: 'Job started successfully', booking: updatedBooking });
};

export const addItemToBill = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { serviceItemId, description, quantity, unitPrice, isPart } = req.body;

  const profile = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!profile) {
    return res.status(404).json({ success: false, message: 'Worker profile not found' });
  }

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.workerId !== profile.id) {
    return res.status(404).json({ success: false, message: 'Booking not assigned to this worker' });
  }

  if (booking.status !== BookingStatus.IN_PROGRESS) {
    return res.status(400).json({ success: false, message: 'Extra items can only be added while job is IN_PROGRESS' });
  }

  const item = await prisma.bookingItem.create({
    data: {
      bookingId: id,
      serviceItemId,
      description,
      quantity,
      unitPrice,
      isPart,
      approvalStatus: ApprovalStatus.PENDING,
    },
  });

  const io = getSocketServer();
  if (io) {
    io.to(`booking_${id}`).emit('booking:extra_item_added', {
      bookingId: id,
      item,
    });
  }

  return res.status(201).json({
    success: true,
    message: 'Item added and sent to customer for approval',
    item,
  });
};

export const completeBooking = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const profile = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!profile) {
    return res.status(404).json({ success: false, message: 'Worker profile not found' });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!booking || booking.workerId !== profile.id) {
    return res.status(404).json({ success: false, message: 'Booking not assigned to this worker' });
  }

  if (booking.status !== BookingStatus.IN_PROGRESS) {
    return res.status(400).json({ success: false, message: 'Only IN_PROGRESS bookings can be marked COMPLETED' });
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

  const updatedBooking = await prisma.booking.update({
    where: { id },
    data: {
      status: BookingStatus.COMPLETED,
      completedAt: new Date(),
      serviceTotal: bill.serviceTotal,
      partsTotal: bill.partsTotal,
      nightSurgeRate: bill.nightSurgeRate,
      rushSurgeRate: bill.rushSurgeRate,
      platformFee: bill.platformFee,
      totalAmount: bill.totalAmount,
    },
  });

  // Free worker
  await prisma.workerProfile.update({
    where: { id: profile.id },
    data: { isBusy: false },
  });

  const io = getSocketServer();
  if (io) {
    io.to(`booking_${id}`).emit('booking:status_update', {
      bookingId: id,
      status: BookingStatus.COMPLETED,
      bill,
    });
  }

  return res.status(200).json({ success: true, message: 'Job completed', booking: updatedBooking, bill });
};

export const getEarnings = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const profile = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!profile) {
    return res.status(404).json({ success: false, message: 'Worker profile not found' });
  }

  const completedBookings = await prisma.booking.findMany({
    where: {
      workerId: profile.id,
      status: BookingStatus.COMPLETED,
    },
    orderBy: { completedAt: 'desc' },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  let todayEarnings = 0;
  let weekEarnings = 0;
  let totalEarnings = 0;

  for (const b of completedBookings) {
    const netEarning = b.totalAmount - b.platformFee;
    totalEarnings += netEarning;

    if (b.completedAt && b.completedAt >= today) {
      todayEarnings += netEarning;
    }
    if (b.completedAt && b.completedAt >= oneWeekAgo) {
      weekEarnings += netEarning;
    }
  }

  return res.status(200).json({
    success: true,
    todayEarnings,
    weekEarnings,
    totalEarnings,
    completedJobsCount: completedBookings.length,
    recentJobs: completedBookings.slice(0, 10),
  });
};
