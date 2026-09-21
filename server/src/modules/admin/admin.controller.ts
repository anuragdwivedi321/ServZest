import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { settingsService } from '../../services/settings.service';
import { pricingService } from '../../services/pricing.service';
import { getSocketServer } from '../../sockets/socket.server';
import { KycStatus, BookingStatus, Role } from '@prisma/client';
import { safeWorkerProfile } from '../../services/worker-profile.service';

export const updateKycSchema = z.object({
  status: z.nativeEnum(KycStatus),
});

export const updateSettingsSchema = z.object({
  settings: z.object({
    platform_commission_pct: z.coerce.number().min(0).max(100).optional(),
    cancel_fee_after_grace: z.coerce.number().min(0).max(10000).optional(),
    cancel_grace_period_sec: z.coerce.number().int().min(0).max(3600).optional(),
    rush_surge_cap: z.coerce.number().min(1).max(1.5).optional(),
    rush_surge_multiplier: z.coerce.number().min(1).max(1.5).optional(),
    night_charge_pct: z.coerce.number().min(0).max(100).optional(),
    max_dispatch_radius_meters: z.coerce.number().int().min(100).max(50000).optional(),
    max_eta_minutes: z.coerce.number().int().min(1).max(120).optional(),
    worker_dispatch_timeout_sec: z.coerce.number().int().min(10).max(120).optional(),
    subscription_required: z.coerce.number().int().min(0).max(1).optional(),
  }).strict(),
});

export const getMetrics = async (req: Request, res: Response) => {
  const [totalUsers, onlineWorkers, totalWorkers, activeBookings, completedBookings, totalComplaints, totalBookings] =
    await Promise.all([
      prisma.user.count(),
      prisma.workerProfile.count({ where: { isOnline: true, lastLocationAt: { gt: new Date(Date.now() - 120000) } } }),
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
        select: { totalAmount: true, platformFee: true, payment: true },
      }),
      prisma.complaint.count({ where: { status: 'OPEN' } }),
      prisma.booking.count(),
    ]);

  const totalRevenue = completedBookings.filter(b => b.payment?.status === 'COMPLETED').reduce((sum, b) => sum + b.platformFee, 0);
  const totalGrossVolume = completedBookings.filter(b => b.payment?.status === 'COMPLETED').reduce((sum, b) => sum + b.totalAmount, 0);

  return res.status(200).json({
    success: true,
    metrics: {
      totalUsers,
      totalWorkers,
      totalBookings,
      onlineWorkers,
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
    take: 200,
  });

  return res.status(200).json({
    success: true,
    workers: workers.map(worker => safeWorkerProfile(worker, { includeMaskedAadhaar: true })),
  });
};

export const updateWorkerKyc = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const existing = await prisma.workerProfile.findUnique({
    where: { id },
    include: { services: { select: { id: true } } },
  });
  if (!existing) return res.status(404).json({ success: false, message: 'Worker profile not found' });
  if (status === 'APPROVED' && (!(existing.identityLast4 || existing.aadhaarNumber) || existing.services.length === 0)) {
    return res.status(400).json({ success: false, message: 'Identity submission and at least one service are required before approval.' });
  }

  const worker = await prisma.workerProfile.update({
    where: { id },
    data: { kycStatus: status, kycReviewedAt: new Date(), kycReviewedBy: req.user!.id, ...(status !== 'APPROVED' ? { isOnline: false } : {}) },
  });
  await prisma.auditLog.create({ data: { actorId: req.user!.id, action: `KYC_${status}`, entityType: 'WorkerProfile', entityId: id, ipAddress: req.ip } });

  return res.status(200).json({
    success: true,
    message: `KYC status updated to ${status}`,
    worker: safeWorkerProfile(worker, { includeMaskedAadhaar: true }),
  });
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
        wp.last_location_at as "lastLocationAt",
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

  await settingsService.updateSettings(settings);
  await prisma.auditLog.create({ data: { actorId: req.user!.id, action: 'SETTINGS_UPDATED', entityType: 'AdminSetting', metadata: settings, ipAddress: req.ip } });

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
    take: 200,
  });

  return res.status(200).json({ success: true, bookings });
};

export { cancelBooking as adminCancelBooking } from '../bookings/actions.controller';

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
    take: 200,
  });

  return res.status(200).json({ success: true, complaints });
};

export const updateComplaintStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const complaint = await prisma.complaint.update({
    where: { id },
    data: { status: status || 'RESOLVED' },
  });

  return res.status(200).json({ success: true, message: `Complaint status updated to ${complaint.status}`, complaint });
};

export const getAdminServices = async (req: Request, res: Response) => {
  const services = await prisma.service.findMany({
    include: { items: true },
    orderBy: { slug: 'asc' },
  });
  return res.status(200).json({ success: true, services });
};

export const updateServicePricing = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { visitCharge, items } = req.body;

  if (visitCharge !== undefined) {
    await prisma.service.update({
      where: { id },
      data: { visitCharge: Number(visitCharge) },
    });
  }

  if (Array.isArray(items)) {
    for (const item of items) {
      if (item.id) {
        await prisma.serviceItem.update({
          where: { id: item.id },
          data: {
            ...(item.minPrice !== undefined ? { minPrice: Number(item.minPrice) } : {}),
            ...(item.maxPrice !== undefined ? { maxPrice: Number(item.maxPrice) } : {}),
          },
        });
      }
    }
  }

  const updatedService = await prisma.service.findUnique({
    where: { id },
    include: { items: true },
  });

  return res.status(200).json({ success: true, message: 'Service pricing updated', service: updatedService });
};
