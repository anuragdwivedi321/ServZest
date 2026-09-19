import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';

export const listServices = async (req: Request, res: Response) => {
  try {
    const services = await prisma.service.findMany({
      include: {
        items: {
          orderBy: { minPrice: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return res.status(200).json({ success: true, services });
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
