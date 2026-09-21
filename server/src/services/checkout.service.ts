import { z } from 'zod';
import { Prisma, BookingStatus } from '@prisma/client';
import { prisma } from '../db/prisma';
import { pricingService } from './pricing.service';

export const checkoutSchema = z.object({
  serviceId: z.string().uuid(),
  itemIds: z.array(z.string().uuid()).max(10).default([]),
  scheduledAt: z.string().datetime().optional(),
  couponCode: z.string().trim().toUpperCase().max(30).optional(),
});

export function validateSchedule(value?: string, now = Date.now()) {
  if (!value) return null;
  const date = new Date(value);
  const india = new Date(date.getTime() + 330 * 60000);
  if (!Number.isFinite(date.getTime()) || date.getTime() < now + 30 * 60000 || date.getTime() > now + 7 * 86400000 ||
      ![9, 11, 14, 16, 18].includes(india.getUTCHours()) || india.getUTCMinutes() !== 0 || india.getUTCSeconds() !== 0 || india.getUTCMilliseconds() !== 0) {
    throw Object.assign(new Error('Select an available slot at least 30 minutes ahead, within the next 7 days (India time).'), { status: 400 });
  }
  return date;
}

export async function checkoutQuote(input: z.infer<typeof checkoutSchema>, customerId?: string, db: Prisma.TransactionClient = prisma) {
  const scheduledAt = validateSchedule(input.scheduledAt);
  const service = await db.service.findUnique({ where: { id: input.serviceId }, include: { items: true } });
  if (!service) throw Object.assign(new Error('Service not found.'), { status: 404 });
  const uniqueIds = new Set(input.itemIds);
  const items = service.items.filter(item => uniqueIds.has(item.id));
  if (items.length !== uniqueIds.size) throw Object.assign(new Error('Selected tasks do not belong to this service.'), { status: 400 });
  let discountAmount = 0;
  if (input.couponCode) {
    if (input.couponCode !== 'WELCOME50') throw Object.assign(new Error('Invalid coupon code.'), { status: 400 });
    if (!customerId) throw Object.assign(new Error('Sign in to apply your welcome coupon.'), { status: 401 });
    const used = await db.booking.count({ where: { customerId, status: { notIn: [BookingStatus.CANCELLED, BookingStatus.NO_PROVIDER] } } });
    if (used) throw Object.assign(new Error('WELCOME50 is available on your first booking only.'), { status: 400 });
    discountAmount = 50;
  }
  const selectedItems = items.map(item => ({
    serviceItemId: item.id,
    description: item.nameEn,
    quantity: item.unit === 'per hour' ? 2 : 1,
    unitPrice: item.minPrice,
    approvalStatus: 'APPROVED' as const,
  }));
  const bill = await pricingService.calculateBill({
    baseVisitCharge: service.visitCharge,
    serviceItemsTotal: selectedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    bookingTime: scheduledAt || new Date(), discountAmount,
  });
  return { service, selectedItems, scheduledAt, bill };
}

export function bookingPricingInput(booking: { scheduledAt?: Date | null; createdAt: Date; discountAmount?: number; pricingSnapshot?: unknown }) {
  const snapshot = booking.pricingSnapshot as { nightSurgeRate: number; rushSurgeRate: number; commissionPct: number } | null;
  return {
    bookingTime: booking.scheduledAt || booking.createdAt,
    discountAmount: booking.discountAmount || 0,
    ...(snapshot ? { rules: snapshot } : {}),
  };
}
