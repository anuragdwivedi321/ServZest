import { BookingStatus } from '@prisma/client';
import { prisma } from '../db/prisma';
import { dispatchService } from './dispatch.service';
import { getSocketServer } from '../sockets/socket.server';

export async function dispatchBooking(id: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: { service: true } });
  if (!booking || booking.status !== BookingStatus.SEARCHING) return;
  const io = getSocketServer();
  await dispatchService.startDispatch(id, booking.serviceId, booking.pickupLat, booking.pickupLng, {
    onWorkerRequested: (worker, timeoutSec) => {
      io?.to(`worker_${worker.id}`).emit('worker:new_request', {
        bookingId: id, serviceName: booking.service.nameEn, serviceNameHi: booking.service.nameHi,
        pickupAddress: booking.pickupAddress, problemDescription: booking.problemDescription,
        distanceMeters: worker.straightDistanceMeters, roadDistanceKm: worker.roadDistanceKm,
        etaMinutes: worker.etaMinutes, baseVisitCharge: booking.baseVisitCharge, timeoutSec,
      });
    },
    onDispatchExhausted: () => {
      void prisma.booking.updateMany({ where: { id, status: BookingStatus.SEARCHING }, data: { status: BookingStatus.NO_PROVIDER } })
        .then(result => { if (result.count) io?.to(`booking_${id}`).emit('booking:status_update', { bookingId: id, status: 'NO_PROVIDER' }); })
        .catch(error => console.error('Dispatch completion failed', error));
    },
    onWorkerAssigned: (worker) => {
      io?.to(`booking_${id}`).emit('booking:status_update', { bookingId: id, status: 'ASSIGNED', worker, etaMinutes: worker.etaMinutes });
    },
  });
}

let running = false;
let schedulerTimer: NodeJS.Timeout | null = null;
export async function dispatchDueBookings() {
  if (running) return;
  running = true;
  try {
    const due = await prisma.booking.findMany({ where: { status: BookingStatus.SCHEDULED, scheduledAt: { lte: new Date() } }, take: 50 });
    for (const booking of due) {
      const claimed = await prisma.booking.updateMany({ where: { id: booking.id, status: BookingStatus.SCHEDULED }, data: { status: BookingStatus.SEARCHING } });
      if (claimed.count) await dispatchBooking(booking.id).catch(error => console.error('Scheduled dispatch failed:', error));
    }
    // Retry interrupted lookups as well as searches recovered after a restart.
    const searching = await prisma.booking.findMany({ where: { status: BookingStatus.SEARCHING }, select: { id: true } });
    for (const booking of searching) {
      if (!dispatchService.hasSession(booking.id)) await dispatchBooking(booking.id).catch(error => console.error('Dispatch recovery failed:', error));
    }
  } finally { running = false; }
}

export async function startBookingScheduler() {
  if (schedulerTimer) return;
  schedulerTimer = setInterval(() => void dispatchDueBookings().catch(error => console.error('Booking scheduler:', error)), 10000);
  schedulerTimer.unref();
  await dispatchDueBookings();
}

export function stopBookingScheduler() {
  if (schedulerTimer) clearInterval(schedulerTimer);
  schedulerTimer = null;
}
