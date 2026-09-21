import { Request, Response } from 'express';
import { BookingStatus, KycStatus } from '@prisma/client';
import { prisma } from '../../db/prisma';

export const listServices = async (req: Request, res: Response) => {
  try {
    const services = await prisma.service.findMany({
      include: {
        items: {
          orderBy: { minPrice: 'asc' },
        },
        workers: {
          include: {
            worker: {
              select: {
                rating: true,
                totalRatings: true,
                isOnline: true,
                isBusy: true,
                kycStatus: true,
              },
            },
          },
        },
        bookings: {
          where: { status: BookingStatus.COMPLETED },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const publicServices = services.map(({ workers, bookings, ...service }) => {
      const approved = workers.map(link => link.worker).filter(worker => worker.kycStatus === KycStatus.APPROVED);
      const reviewCount = approved.reduce((total, worker) => total + worker.totalRatings, 0);
      const weightedRating = approved.reduce((total, worker) => total + worker.rating * worker.totalRatings, 0);
      return {
        ...service,
        market: {
          averageRating: reviewCount > 0 ? Math.round((weightedRating / reviewCount) * 10) / 10 : null,
          reviewCount,
          onlineWorkers: approved.filter(worker => worker.isOnline && !worker.isBusy).length,
          completedBookings: bookings.length,
        },
      };
    });
    return res.status(200).json({ success: true, services: publicServices });
  } catch (err) {
    console.error('Error fetching services:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch services' });
  }
};

export const getServiceBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const service = await prisma.service.findUnique({
      where: { slug },
      include: {
        items: {
          orderBy: { minPrice: 'asc' },
        },
      },
    });

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    return res.status(200).json({ success: true, service });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch service detail' });
  }
};
