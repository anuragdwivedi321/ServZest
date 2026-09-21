import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { config } from '../config';
import { dispatchService } from '../services/dispatch.service';
import { readCookie } from '../middlewares/auth.middleware';
let io: Server | null = null;
const idSchema = z.string().uuid();
const locationSchema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
export const initSocketServer = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, { cors: { origin: config.nodeEnv === 'development' ? true : config.clientUrl, credentials: true } });
  io.use(async (socket, next) => {
    try {
      const token = typeof socket.handshake.auth?.token === 'string'
        ? socket.handshake.auth.token
        : readCookie(socket.handshake.headers.cookie, config.session.cookieName);
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] }) as { id: string; sid?: string };
      if (config.nodeEnv === 'production' && !decoded.sid) return next(new Error('Authentication required'));
      if (decoded.sid && !await prisma.session.findFirst({ where: { id: decoded.sid, userId: decoded.id, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } })) return next(new Error('Authentication required'));
      const user = await prisma.user.findUnique({ where: { id: decoded.id }, include: { workerProfile: { select: { id: true } } } });
      if (!user) return next(new Error('Authentication required'));
      socket.data.user = { id: user.id, role: user.role, workerId: user.workerProfile?.id };
      next();
    } catch { next(new Error('Authentication required')); }
  });
  io.on('connection', socket => {
    const user = socket.data.user;
    if (user.workerId) socket.join(`worker_${user.workerId}`);
    socket.on('join_worker', () => { if (user.workerId) socket.join(`worker_${user.workerId}`); });
    socket.on('join_booking', async (payload, ack) => {
      try {
        const id = idSchema.parse(payload?.bookingId);
        const booking = await prisma.booking.findUnique({ where: { id } });
        if (!booking || !(booking.customerId === user.id || booking.workerId === user.workerId || user.role === 'ADMIN')) throw new Error('Forbidden');
        await socket.join(`booking_${id}`);
        if (typeof ack === 'function') ack({ success: true });
      } catch { if (typeof ack === 'function') ack({ success: false }); }
    });
    socket.on('leave_booking', payload => { if (idSchema.safeParse(payload?.bookingId).success) socket.leave(`booking_${payload.bookingId}`); });
    let lastUpdate = 0;
    socket.on('worker:location_update', async (payload, ack) => {
      try {
        if (!user.workerId || (payload?.workerId && payload.workerId !== user.workerId)) throw new Error('Forbidden');
        if (Date.now() - lastUpdate < 2000) { if (typeof ack === 'function') ack({ success: false, message: 'Location updates are limited to once every two seconds.' }); return; }
        const { lat, lng } = locationSchema.parse(payload);
        lastUpdate = Date.now();
        const updated = await prisma.$executeRaw`
          UPDATE worker_profiles
          SET current_location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
              last_location_at = NOW()
          WHERE id = ${user.workerId}
            AND kyc_status = 'APPROVED'
            AND (
              is_online = true
              OR EXISTS (
                SELECT 1 FROM bookings
                WHERE worker_id = ${user.workerId}
                  AND status IN ('ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS')
              )
            )`;
        if (!updated) throw new Error('Worker is not eligible to share location');
        const booking = await prisma.booking.findFirst({ where: { workerId: user.workerId, status: { in: ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'] } } });
        if (booking) {
          const distance = await prisma.$queryRaw<Array<{ dist: number }>>`SELECT ST_Distance(current_location, ST_SetSRID(ST_MakePoint(${booking.pickupLng}, ${booking.pickupLat}), 4326)::geography) AS dist FROM worker_profiles WHERE id = ${user.workerId}`;
          io?.to(`booking_${booking.id}`).emit('booking:worker_location', { bookingId: booking.id, lat, lng, updatedAt: new Date().toISOString(), ...dispatchService.calculateEta(distance[0]?.dist || 0) });
        }
        if (typeof ack === 'function') ack({ success: true });
      } catch { if (typeof ack === 'function') ack({ success: false }); }
    });
  });
  return io;
};
export const getSocketServer = () => io;
