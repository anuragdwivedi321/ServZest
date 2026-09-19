import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { prisma } from '../db/prisma';
import { dispatchService } from '../services/dispatch.service';
import { BookingStatus } from '@prisma/client';

let io: Server | null = null;

export const initSocketServer = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Join worker personal channel
    socket.on('join_worker', ({ workerId }: { workerId: string }) => {
      socket.join(`worker_${workerId}`);
      console.log(`[Socket] Worker ${workerId} joined room worker_${workerId}`);
    });

    // Join booking live updates channel
    socket.on('join_booking', ({ bookingId }: { bookingId: string }) => {
      socket.join(`booking_${bookingId}`);
      console.log(`[Socket] Client joined room booking_${bookingId}`);
    });

    // Worker periodic location update (every 5-10 sec)
    socket.on(
      'worker:location_update',
      async ({ workerId, lat, lng }: { workerId: string; lat: number; lng: number }) => {
        try {
          // 1. Update worker PostGIS location in DB
          await prisma.$executeRaw`
            UPDATE worker_profiles
            SET current_location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
                updated_at = NOW()
            WHERE id = ${workerId}
          `;

          // 2. Check if worker is assigned to an active booking
          const activeBooking = await prisma.booking.findFirst({
            where: {
              workerId,
              status: { in: [BookingStatus.ASSIGNED, BookingStatus.EN_ROUTE] },
            },
          });

          if (activeBooking) {
            // Calculate distance to customer pickup
            const distance = await prisma.$queryRaw<Array<{ dist: number }>>`
              SELECT ST_Distance(
                current_location,
                ST_SetSRID(ST_MakePoint(${activeBooking.pickupLng}, ${activeBooking.pickupLat}), 4326)::geography
              ) as dist
              FROM worker_profiles
              WHERE id = ${workerId};
            `;

            const distMeters = distance[0]?.dist || 0;
            const { roadDistanceKm, etaMinutes } = dispatchService.calculateEta(distMeters);

            // Broadcast to customer
            io?.to(`booking_${activeBooking.id}`).emit('booking:worker_location', {
              bookingId: activeBooking.id,
              lat,
              lng,
              roadDistanceKm,
              etaMinutes,
            });
          }
        } catch (err) {
          console.error('[Socket] Error updating worker location:', err);
        }
      }
    );

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getSocketServer = (): Server | null => io;
