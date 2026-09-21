import { withoutOtp } from '../../services/booking-lock.service';
import { bookingPricingInput } from '../../services/checkout.service';
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { dispatchService } from '../../services/dispatch.service';
import { pricingService } from '../../services/pricing.service';
import { getSocketServer } from '../../sockets/socket.server';
import { BookingStatus, KycStatus, ApprovalStatus } from '@prisma/client';
import { safeWorkerProfile } from '../../services/worker-profile.service';
import { writeAudit } from '../../services/audit.service';

export const kycSchema = z.object({
  identityLast4: z.string().regex(/^\d{4}$/, 'Enter the last 4 digits'),
  consentAccepted: z.literal(true),
  photoUrl: z.string().url().optional(),
  vehicleType: z.string().optional(),
  skills: z.array(z.string()),
  serviceIds: z.array(z.string().uuid()).min(1).max(20),
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
  description: z.string().trim().min(2).max(250),
  quantity: z.number().int().min(1).max(100).default(1),
  unitPrice: z.number().min(0).max(100000),
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

  const offer = dispatchService.getOffer(profile.id);
  const offeredBooking = offer ? await prisma.booking.findUnique({ where: { id: offer.bookingId }, include: { service: true } }) : null;
  const incomingRequest = offeredBooking?.status === 'SEARCHING' ? { ...offer, serviceName: offeredBooking.service.nameEn, pickupAddress: offeredBooking.pickupAddress, baseVisitCharge: offeredBooking.baseVisitCharge } : null;
  return res.status(200).json({ success: true, profile: safeWorkerProfile(profile), activeBooking: withoutOtp(activeBooking), incomingRequest });
};

export const submitKyc = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { identityLast4, photoUrl, vehicleType, skills, serviceIds } = req.body;

  const updatedProfile = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT id FROM worker_profiles WHERE user_id = ${userId} FOR UPDATE`;
    const profile = await tx.workerProfile.findUnique({ where: { userId } });
    if (profile?.isBusy) throw Object.assign(new Error('Finish your active job before changing KYC.'), { status: 409 });
    const ids = [...new Set(serviceIds)] as string[];
    if (await tx.service.count({ where: { id: { in: ids } } }) !== ids.length) throw Object.assign(new Error('Invalid service selection.'), { status: 400 });
    return tx.workerProfile.upsert({ where: { userId },
      create: { userId, identityLast4, identityMethod: 'SELF_DECLARED_LAST4', kycConsentAt: new Date(), kycSubmittedAt: new Date(), photoUrl, vehicleType, skills, services: { create: ids.map(serviceId => ({ serviceId })) } },
      update: { identityLast4, identityMethod: 'SELF_DECLARED_LAST4', kycConsentAt: new Date(), kycSubmittedAt: new Date(), kycReviewedAt: null, kycReviewedBy: null, kycRejectionReason: null, aadhaarNumber: null, aadhaarDocUrl: null, photoUrl, vehicleType, skills, kycStatus: 'PENDING', isOnline: false, services: { deleteMany: {}, create: ids.map(serviceId => ({ serviceId })) } },
    });
  });

  await writeAudit({ actorId: userId, action: 'KYC_SUBMITTED', entityType: 'WorkerProfile', entityId: updatedProfile.id, ipAddress: req.ip });

  return res.status(200).json({
    success: true,
    message: 'KYC submitted successfully. Awaiting admin review.',
    profile: safeWorkerProfile(updatedProfile),
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
  if (isOnline && (await (await import('../../services/settings.service')).settingsService.getSetting<number>('subscription_required', 0)) === 1) {
    const activeSubscription = await prisma.workerSubscription.count({ where: { workerId: profile.id, status: 'ACTIVE', endsAt: { gt: new Date() } } });
    if (!activeSubscription) return res.status(402).json({ success: false, message: 'An active professional subscription is required to receive jobs.' });
  }

  const updated = await prisma.workerProfile.updateMany({
    where: { id: profile.id, ...(isOnline ? { kycStatus: KycStatus.APPROVED } : {}) },
    data: { isOnline },
  });
  if (!updated.count) return res.status(409).json({ success: false, message: 'Approval changed. Refresh your profile.' });
  if (!isOnline && !profile.isBusy) await prisma.$executeRaw`UPDATE worker_profiles SET current_location = NULL, last_location_at = NULL WHERE id = ${profile.id} AND is_busy = false`;
  return res.status(200).json({ success: true, isOnline });
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

  return res.status(200).json({ success: true, message: 'Booking accepted', booking: withoutOtp(booking) });
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

export { updateBookingStatus, startBooking, addItemToBill, completeBooking } from './lifecycle.controller';

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
    include: { payment: true, service: true, customer: { select: { name: true } } },
    orderBy: { completedAt: 'desc' },
  });

  // Earnings days are India calendar days, independent of the server timezone.
  const indiaOffset = 330 * 60 * 1000;
  const indiaNow = new Date(Date.now() + indiaOffset);
  const today = new Date(Date.UTC(indiaNow.getUTCFullYear(), indiaNow.getUTCMonth(), indiaNow.getUTCDate()) - indiaOffset);

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  let todayEarnings = 0;
  let weekEarnings = 0;
  let totalEarnings = 0;

  for (const b of completedBookings) {
    const netEarning = b.totalAmount - b.platformFee;
    if (b.payment?.status !== 'COMPLETED') continue;
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
    recentJobs: completedBookings.slice(0, 10).map(b => withoutOtp(b)),
    pendingReceipts: completedBookings.filter(b => b.payment?.status !== 'COMPLETED').map(b => withoutOtp(b)),
    pendingAmount: completedBookings.filter(b => b.payment?.status !== 'COMPLETED').reduce((sum,b) => sum+b.totalAmount,0),
  });
};
