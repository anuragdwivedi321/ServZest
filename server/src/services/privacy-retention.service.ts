import { prisma } from '../db/prisma';
import { config } from '../config';

let timer: NodeJS.Timeout | null = null;
let running = false;

export async function runPrivacyRetention() {
  if (running) return;
  running = true;
  try {
    const locationCutoff = new Date(Date.now() - config.retention.bookingLocationDays * 86400000);
    const workerCutoff = new Date(Date.now() - config.retention.workerLocationHours * 3600000);
    await prisma.$transaction([
      prisma.$executeRaw`UPDATE bookings SET pickup_address = 'Removed under retention policy', pickup_lat = 0, pickup_lng = 0, problem_description = NULL WHERE status IN ('COMPLETED', 'CANCELLED') AND COALESCE(completed_at, cancelled_at, created_at) < ${locationCutoff} AND pickup_address <> 'Removed under retention policy'`,
      prisma.$executeRaw`UPDATE worker_profiles SET current_location = NULL, last_location_at = NULL WHERE is_online = false AND is_busy = false AND last_location_at < ${workerCutoff}`,
      prisma.session.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 30 * 86400000) } } }),
    ]);
  } finally { running = false; }
}

export function startPrivacyRetention() {
  if (timer) return;
  timer = setInterval(() => void runPrivacyRetention().catch(error => console.error('Privacy retention job failed:', error)), 86400000);
  timer.unref();
  void runPrivacyRetention().catch(error => console.error('Privacy retention job failed:', error));
}

export function stopPrivacyRetention() {
  if (timer) clearInterval(timer);
  timer = null;
}
