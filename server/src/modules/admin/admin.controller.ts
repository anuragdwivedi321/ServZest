import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { settingsService } from '../../services/settings.service';
import { pricingService } from '../../services/pricing.service';
import { getSocketServer } from '../../sockets/socket.server';
import { KycStatus, BookingStatus, Role } from '@prisma/client';

export const updateKycSchema = z.object({
  status: z.nativeEnum(KycStatus),
});

export const updateSettingsSchema = z.object({
  settings: z.record(z.union([z.string(), z.number()])),
});

export const getMetrics = async (req: Request, res: Response) => {
  const [onlineWorkers, totalWorkers, activeBookings, completedBookings, totalComplaints] =
    await Promise.all([
      prisma.workerProfile.count({ where: { isOnline: true } }),
      prisma.workerProfile.count(),
      prisma.booking.count({
        where: {
          status: {
            in: [
              BookingStatus.SEARCHING,
              BookingStatus.ASSIGNED,
              BookingStatus.EN_ROUTE,
              BookingStatus.ARRIVED,
              BookingStatus.IN_PROGRESS,
            ],
          },
        },
      }),
      prisma.booking.findMany({
        where: { status: BookingStatus.COMPLETED },
        select: { totalAmount: true, platformFee: true },
      }),
      prisma.complaint.count({ where: { status: 'OPEN' } }),
    ]);

  const totalRevenue = completedBookings.reduce((sum, b) => sum + b.platformFee, 0);
  const totalGrossVolume = completedBookings.reduce((sum, b) => sum + b.totalAmount, 0);

  return res.status(200).json({
    success: true,
    metrics: {
      onlineWorkers,
      totalWorkers,
      activeBookings,
      completedJobs: completedBookings.length,
      totalRevenue,
      totalGrossVolume,
      openComplaints: totalComplaints,
    },
  });
};

export const listWorkers = async (req: Request, res: Response) => {
  const { kycStatus } = req.query;

  const workers = await prisma.workerProfile.findMany({
    where: {
      ...(kycStatus ? { kycStatus: kycStatus as KycStatus } : {}),
    },
    include: {
      user: { select: { name: true, phone: true } },
      services: { include: { service: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.status(200).json({ success: true, workers });
};

export const updateWorkerKyc = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const worker = await prisma.workerProfile.update({
    where: { id },
    data: { kycStatus: status },
  });

  return res.status(200).json({ success: true, message: `KYC status updated to ${status}`, worker });
};

export const getLiveWorkers = async (req: Request, res: Response) => {
  try {
    const workers = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        phone: string;
        isOnline: boolean;
        isBusy: boolean;
        rating: number;
        lat: number;
        lng: number;
      }>
    >`
      SELECT 
        wp.id,
        u.name,
        u.phone,
        wp.is_online as "isOnline",
        wp.is_busy as "isBusy",
        wp.rating,
        ST_Y(wp.current_location::geometry) as lat,
        ST_X(wp.current_location::geometry) as lng
      FROM worker_profiles wp
      JOIN users u ON wp.user_id = u.id
      WHERE wp.current_location IS NOT NULL;
    `;

    return res.status(200).json({ success: true, workers });
  } catch (err) {
    console.error('Error fetching live workers:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch live workers' });
  }
};

export const getSettings = async (req: Request, res: Response) => {
  const settings = await settingsService.getAllSettings();
  return res.status(200).json({ success: true, settings });
};

export const updateSettings = async (req: Request, res: Response) => {
  const { settings } = req.body;

  for (const [key, val] of Object.entries(settings)) {
    await settingsService.updateSetting(key, val as string | number);
  }

  const updated = await settingsService.getAllSettings();
  return res.status(200).json({ success: true, message: 'Settings updated', settings: updated });
};

export const listAllBookings = async (req: Request, res: Response) => {
  const bookings = await prisma.booking.findMany({
    include: {
      service: true,
      customer: { select: { name: true, phone: true } },
      worker: {
        include: {
          user: { select: { name: true, phone: true } },
        },
      },
      payment: true,
      complaints: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.status(200).json({ success: true, bookings });
};

export const adminCancelBooking = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }

  // Admin has power to cancel any active booking, including IN_PROGRESS
  if (booking.workerId) {
    await prisma.workerProfile.update({
      where: { id: booking.workerId },
      data: { isBusy: false },
    });
  }

  const workerArrived = booking.status === BookingStatus.ARRIVED || booking.status === BookingStatus.IN_PROGRESS;
  const cancelResult = await pricingService.calculateCancellationFee(booking.assignedAt, workerArrived);

  const updatedBooking = await prisma.booking.update({
    where: { id },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: Role.ADMIN,
      cancelReason: reason || 'Cancelled by administrator',
      cancelFee: cancelResult.fee,
    },
  });

  const io = getSocketServer();
  if (io) {
    io.to(`booking_${id}`).emit('booking:status_update', {
      bookingId: id,
      status: BookingStatus.CANCELLED,
      cancelReason: reason || 'Cancelled by administrator',
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Booking cancelled by administrator',
    booking: updatedBooking,
  });
};

export const listComplaints = async (req: Request, res: Response) => {
  const complaints = await prisma.complaint.findMany({
    include: {
      booking: {
        include: {
          service: true,
          worker: { include: { user: true } },
        },
      },
      user: { select: { name: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.status(200).json({ success: true, complaints });
};
