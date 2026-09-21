import { prisma } from '../db/prisma';
import { settingsService } from './settings.service';
import { BookingStatus } from '@prisma/client';

export interface CandidateWorker {
  id: string;
  userId: string;
  name: string;
  phone: string;
  rating: number;
  lat: number;
  lng: number;
  straightDistanceMeters: number;
  roadDistanceKm: number;
  etaMinutes: number;
}

export interface DispatchSession {
  bookingId: string;
  serviceId: string;
  pickupLat: number;
  pickupLng: number;
  candidates: CandidateWorker[];
  currentIndex: number;
  timer: NodeJS.Timeout | null;
  expiresAt?: number;
  onWorkerRequested?: (worker: CandidateWorker, timeoutSec: number) => void;
  onDispatchExhausted?: () => void;
  onWorkerAssigned?: (worker: CandidateWorker) => void;
}

export class DispatchService {
  getOffer(workerId: string) {
    for (const session of this.activeSessions.values()) {
      const worker = session.candidates[session.currentIndex];
      if (worker?.id === workerId && session.expiresAt && session.expiresAt > Date.now()) return { bookingId: session.bookingId, distanceMeters: worker.straightDistanceMeters, roadDistanceKm: worker.roadDistanceKm, etaMinutes: worker.etaMinutes, timeoutSec: Math.ceil((session.expiresAt - Date.now()) / 1000) };
    }
    return null;
  }
  hasSession(id: string) { return this.activeSessions.has(id); }

  private activeSessions: Map<string, DispatchSession> = new Map();

  /**
   * Calculates estimated travel time (in minutes) based on straight-line distance.
   * Uses 1.3 road winding factor and 25 km/h average city speed.
   */
  calculateEta(straightDistanceMeters: number): { roadDistanceKm: number; etaMinutes: number } {
    const straightKm = straightDistanceMeters / 1000;
    const roadFactor = 1.3; // Road winding factor
    const roadDistanceKm = Number((straightKm * roadFactor).toFixed(2));
    const avgSpeedKmh = 25; // Average urban speed in India

    const etaHours = roadDistanceKm / avgSpeedKmh;
    const etaMinutes = Math.max(1, Math.round(etaHours * 60));

    return { roadDistanceKm, etaMinutes };
  }

  /**
   * Finds online, approved, non-busy workers within max radius (5km) matching the requested service.
   */
  async findNearbyWorkers(
    serviceId: string,
    pickupLat: number,
    pickupLng: number
  ): Promise<CandidateWorker[]> {
    const maxRadiusMeters = await settingsService.getSetting<number>('max_dispatch_radius_meters', 5000);
    const maxEtaMinutes = await settingsService.getSetting<number>('max_eta_minutes', 20);
    const subscriptionRequired = (await settingsService.getSetting<number>('subscription_required', 0)) === 1;

    try {
      const rows = await prisma.$queryRaw<
        Array<{
          id: string;
          userId: string;
          name: string;
          phone: string;
          rating: number;
          lat: number;
          lng: number;
          distanceMeters: number;
        }>
      >`
        SELECT 
          wp.id,
          wp.user_id as "userId",
          u.name,
          u.phone,
          wp.rating,
          ST_Y(wp.current_location::geometry) as lat,
          ST_X(wp.current_location::geometry) as lng,
          ST_Distance(
            wp.current_location, 
            ST_SetSRID(ST_MakePoint(${pickupLng}, ${pickupLat}), 4326)::geography
          ) as "distanceMeters"
        FROM worker_profiles wp
        JOIN users u ON wp.user_id = u.id
        JOIN worker_services ws ON ws.worker_id = wp.id
        WHERE ws.service_id = ${serviceId}
          AND wp.is_online = true
          AND wp.is_busy = false
          AND wp.kyc_status = 'APPROVED'
          AND wp.current_location IS NOT NULL
          AND wp.last_location_at > NOW() - INTERVAL '2 minutes'
          AND (${subscriptionRequired} = false OR EXISTS (
            SELECT 1 FROM worker_subscriptions sub
            WHERE sub.worker_id = wp.id AND sub.status = 'ACTIVE' AND sub.ends_at > NOW()
          ))
          AND ST_DWithin(
            wp.current_location,
            ST_SetSRID(ST_MakePoint(${pickupLng}, ${pickupLat}), 4326)::geography,
            ${maxRadiusMeters}
          )
        ORDER BY "distanceMeters" ASC;
      `;

      const candidates: CandidateWorker[] = [];

      for (const row of rows) {
        const { roadDistanceKm, etaMinutes } = this.calculateEta(row.distanceMeters);
        if (etaMinutes <= maxEtaMinutes) {
          candidates.push({
            id: row.id,
            userId: row.userId,
            name: row.name || 'Worker',
            phone: row.phone,
            rating: row.rating,
            lat: row.lat,
            lng: row.lng,
            straightDistanceMeters: Math.round(row.distanceMeters),
            roadDistanceKm,
            etaMinutes,
          });
        }
      }

      return candidates;
    } catch (err) {
      console.error('[DispatchService] Error executing PostGIS nearby query:', err);
      throw err;
    }
  }

  /**
   * Starts sequential dispatch for a booking.
   */
  async startDispatch(
    bookingId: string,
    serviceId: string,
    pickupLat: number,
    pickupLng: number,
    callbacks: {
      onWorkerRequested: (worker: CandidateWorker, timeoutSec: number) => void;
      onDispatchExhausted: () => void;
      onWorkerAssigned: (worker: CandidateWorker) => void;
    }
  ): Promise<CandidateWorker[]> {
    const existing = this.activeSessions.get(bookingId);
    if (existing) return existing.candidates;
    const session: DispatchSession = {
      bookingId,
      serviceId,
      pickupLat,
      pickupLng,
      candidates: [],
      currentIndex: 0,
      timer: null,
      ...callbacks,
    };

    this.activeSessions.set(bookingId, session);
    try {
      const candidates = await this.findNearbyWorkers(serviceId, pickupLat, pickupLng);
      // Cancellation can happen while the database lookup is in flight.
      if (this.activeSessions.get(bookingId) !== session) return [];
      session.candidates = candidates;
      await this.sendNextCandidate(bookingId);
      return candidates;
    } catch (error) {
      if (this.activeSessions.get(bookingId) === session) this.cancelDispatch(bookingId);
      throw error;
    }
  }

  /**
   * Sends request to the next worker in the candidate list with 30s timeout.
   */
  private async sendNextCandidate(bookingId: string): Promise<void> {
    const session = this.activeSessions.get(bookingId);
    if (!session) return;

    if (session.currentIndex >= session.candidates.length) {
      console.log(`[DispatchService] All candidates exhausted for booking ${bookingId}`);
      session.onDispatchExhausted?.();
      this.activeSessions.delete(bookingId);
      return;
    }

    const worker = session.candidates[session.currentIndex];
    const index = session.currentIndex;
    const timeoutSec = await settingsService.getSetting<number>('worker_dispatch_timeout_sec', 30);
    if (this.activeSessions.get(bookingId) !== session || session.currentIndex !== index) return;

    console.log(
      `[DispatchService] Dispatching booking ${bookingId} to candidate ${session.currentIndex + 1}/${session.candidates.length}: ${worker.name} (${worker.id})`
    );

    session.expiresAt = Date.now() + timeoutSec * 1000;
    session.onWorkerRequested?.(worker, timeoutSec);

    // Set 30-second timer
    if (session.timer) clearTimeout(session.timer);
    session.timer = setTimeout(() => {
      console.log(`[DispatchService] Worker ${worker.id} timed out for booking ${bookingId}`);
      session.currentIndex += 1;
      void this.sendNextCandidate(bookingId).catch(error => console.error('Dispatch advance failed:', error));
    }, timeoutSec * 1000);
  }

  /**
   * Called when a worker explicitly rejects or times out.
   */
  async handleWorkerReject(bookingId: string, workerId: string): Promise<void> {
    const session = this.activeSessions.get(bookingId);
    if (!session) return;

    const currentCandidate = session.candidates[session.currentIndex];
    if (currentCandidate && currentCandidate.id === workerId) {
      if (session.timer) clearTimeout(session.timer);
      session.currentIndex += 1;
      await this.sendNextCandidate(bookingId);
    }
  }

  /**
   * Called when a worker accepts the booking.
   * Performs atomic assignment to prevent race conditions.
   */
  async handleWorkerAccept(bookingId: string, workerId: string): Promise<{ success: boolean; message: string }> {
    const session = this.activeSessions.get(bookingId);

    if (!session || session.candidates[session.currentIndex]?.id !== workerId) {
      return { success: false, message: 'This offer has expired or belongs to another professional.' };
    }
    const subscriptionRequired = (await settingsService.getSetting<number>('subscription_required', 0)) === 1;
    try {
      await prisma.$transaction(async tx => {
        await tx.$executeRaw`SELECT id FROM bookings WHERE id = ${bookingId} FOR UPDATE`;
        if (this.activeSessions.get(bookingId) !== session || session.candidates[session.currentIndex]?.id !== workerId || !session.expiresAt || session.expiresAt <= Date.now()) throw new Error('Offer expired.');
        const worker = await tx.workerProfile.updateMany({
          where: { id: workerId, isBusy: false, isOnline: true, kycStatus: 'APPROVED', lastLocationAt: { gt: new Date(Date.now()-120000) }, services: { some: { serviceId: session.serviceId } }, ...(subscriptionRequired ? { subscriptions: { some: { status: 'ACTIVE', endsAt: { gt: new Date() } } } } : {}) },
          data: { isBusy: true },
        });
        if (!worker.count) throw new Error('Professional is no longer available.');
        const assigned = await tx.booking.updateMany({
          where: { id: bookingId, status: BookingStatus.SEARCHING },
          data: { workerId, status: BookingStatus.ASSIGNED, assignedAt: new Date() },
        });
        if (!assigned.count) throw new Error('Booking already assigned or cancelled.');
      });
    } catch (error: any) { return { success: false, message: error.message }; }

    if (session) {
      if (session.timer) clearTimeout(session.timer);
      const worker = session.candidates.find((w) => w.id === workerId);
      if (worker) {
        session.onWorkerAssigned?.(worker);
      }
      this.activeSessions.delete(bookingId);
    }

    return { success: true, message: 'Worker successfully assigned' };
  }

  /**
   * Cancels any active dispatch session for a booking.
   */
  cancelDispatch(bookingId: string): void {
    const session = this.activeSessions.get(bookingId);
    if (session) {
      if (session.timer) clearTimeout(session.timer);
      this.activeSessions.delete(bookingId);
    }
  }
}

export const dispatchService = new DispatchService();
