import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
export const bookingError = (message: string, status = 400) => Object.assign(new Error(message), { status });
export const withBookingLock = <T>(id: string, fn: (tx: Prisma.TransactionClient) => Promise<T>) => prisma.$transaction(async tx => {
  await tx.$executeRaw`SELECT id FROM bookings WHERE id = ${id} FOR UPDATE`;
  return fn(tx);
}, { timeout: 20000 });
export function withoutOtp<T extends { startOtp: string }>(booking: T | null) {
  if (!booking) return null;
  const { startOtp: _privateOtp, ...safe } = booking;
  return safe;
}
