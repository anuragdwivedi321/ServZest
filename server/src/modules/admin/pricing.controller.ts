import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { bookingError } from '../../services/booking-lock.service';
export const servicePricingSchema = z.object({ visitCharge: z.number().min(0).max(100000).optional(), items: z.array(z.object({ id: z.string().uuid(), minPrice: z.number().min(0).max(100000), maxPrice: z.number().min(0).max(100000) }).refine(item => item.maxPrice >= item.minPrice, 'Maximum price must be at least minimum price')).max(100).optional() });
export const updateServicePricing = async (req: Request, res: Response) => {
  const service = await prisma.$transaction(async tx => {
    const current = await tx.service.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!current) throw bookingError('Service not found.', 404);
    for (const item of req.body.items || []) {
      if (!current.items.some(existing => existing.id === item.id)) throw bookingError('Task does not belong to this service.');
      await tx.serviceItem.update({ where: { id: item.id }, data: { minPrice: item.minPrice, maxPrice: item.maxPrice } });
    }
    return tx.service.update({ where: { id: current.id }, data: { visitCharge: req.body.visitCharge }, include: { items: true } });
  });
  res.json({ success: true, service });
};
