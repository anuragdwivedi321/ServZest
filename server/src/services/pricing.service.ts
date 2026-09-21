import { settingsService } from './settings.service';

export interface PriceEstimateInput {
  baseVisitCharge: number;
  serviceItemsTotal?: number;
  partsTotal?: number;
  bookingTime?: Date;
  discountAmount?: number;
  rules?: { nightSurgeRate: number; rushSurgeRate: number; commissionPct: number };
}

export interface BillBreakdown {
  baseVisitCharge: number;
  serviceTotal: number;
  partsTotal: number;
  isNightTime: boolean;
  nightSurgeRate: number; // e.g. 0.25
  nightSurgeAmount: number;
  rushSurgeRate: number; // e.g. 1.2
  rushSurgeAmount: number;
  subtotal: number;
  totalAmount: number;
  platformFee: number; // commission amount
  workerEarnings: number;
  discountAmount: number;
  commissionPct: number;
}

export interface CancellationFeeResult {
  fee: number;
  goesToWorker: boolean;
  reason: string;
}

export class PricingService {
  /**
   * Checks if a given time falls in the night window (10 PM to 6 AM)
   */
  isNightHours(date: Date = new Date()): boolean {
    const hours = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hourCycle: 'h23' }).format(date));
    return hours >= 22 || hours < 6;
  }

  /**
   * Calculates the pricing breakdown including visit, services, parts, night surcharge, rush surge, and platform commission.
   */
  async calculateBill(input: PriceEstimateInput): Promise<BillBreakdown> {
    const nightChargePct = input.rules ? 0 : await settingsService.getSetting<number>('night_charge_pct', 25);
    const rushMultiplier = input.rules ? 1 : await settingsService.getSetting<number>('rush_surge_multiplier', 1.0);
    const rushCap = input.rules ? 1 : await settingsService.getSetting<number>('rush_surge_cap', 1.5);
    const commissionPct = input.rules?.commissionPct ?? await settingsService.getSetting<number>('platform_commission_pct', 15);

    const money = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
    const baseVisit = money(input.baseVisitCharge);
    const serviceTotal = money(input.serviceItemsTotal || 0);
    const partsTotal = money(input.partsTotal || 0);

    const bookingTime = input.bookingTime || new Date();
    const isNight = this.isNightHours(bookingTime);

    // Night surcharge applies to base visit + services (parts are at cost)
    const nightSurgeRate = input.rules?.nightSurgeRate ?? (isNight ? nightChargePct / 100 : 0);
    const nightSurgeAmount = Math.round((baseVisit + serviceTotal) * nightSurgeRate);

    // Rush surge is capped at rushCap
    const effectiveRushMultiplier = input.rules?.rushSurgeRate ?? Math.min(Math.max(rushMultiplier, 1.0), rushCap);
    const rushSurgeRate = effectiveRushMultiplier;
    const rushSurgeAmount = Math.round((baseVisit + serviceTotal) * (effectiveRushMultiplier - 1.0));

    // Subtotal before surcharges
    const subtotal = money(baseVisit + serviceTotal + partsTotal);

    // Total bill charged to customer
    const discountAmount = money(Math.min(Math.max(0, input.discountAmount || 0), baseVisit + serviceTotal + nightSurgeAmount + rushSurgeAmount));
    const totalAmount = money(baseVisit + serviceTotal + partsTotal + nightSurgeAmount + rushSurgeAmount - discountAmount);

    // Platform commission is calculated on labor (visit + services + surcharges, excluding parts)
    const laborTotal = baseVisit + serviceTotal + nightSurgeAmount + rushSurgeAmount - discountAmount;
    const platformFee = money(Math.min(laborTotal, Math.round(laborTotal * (commissionPct / 100))));
    const workerEarnings = money(totalAmount - platformFee);

    return {
      baseVisitCharge: baseVisit,
      serviceTotal,
      partsTotal,
      isNightTime: isNight,
      nightSurgeRate,
      nightSurgeAmount,
      rushSurgeRate,
      rushSurgeAmount,
      subtotal,
      totalAmount,
      platformFee,
      workerEarnings,
      discountAmount,
      commissionPct,
    };
  }

  /**
   * Calculates cancellation fee based on assignment time and worker arrival status.
   */
  async calculateCancellationFee(
    assignedAt: Date | null,
    workerArrived: boolean,
    now: Date = new Date()
  ): Promise<CancellationFeeResult> {
    if (!assignedAt) {
      return { fee: 0, goesToWorker: false, reason: 'Cancelled before worker assignment' };
    }

    const gracePeriodSec = await settingsService.getSetting<number>('cancel_grace_period_sec', 120);
    const standardCancelFee = await settingsService.getSetting<number>('cancel_fee_after_grace', 40);

    const elapsedSeconds = Math.floor((now.getTime() - assignedAt.getTime()) / 1000);

    // Case 1: Worker has already arrived
    if (workerArrived) {
      return {
        fee: standardCancelFee,
        goesToWorker: true,
        reason: 'Cancelled after worker arrived at location (compensation to worker)',
      };
    }

    // Case 2: Within grace period (2 minutes)
    if (elapsedSeconds <= gracePeriodSec) {
      return {
        fee: 0,
        goesToWorker: false,
        reason: `Cancelled within free ${gracePeriodSec}s grace period`,
      };
    }

    // Case 3: After grace period but before arrival
    return {
      fee: standardCancelFee,
      goesToWorker: false,
      reason: `Cancelled after ${gracePeriodSec}s grace period`,
    };
  }
}

export const pricingService = new PricingService();
