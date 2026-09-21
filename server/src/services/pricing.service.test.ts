import { pricingService } from './pricing.service';
import { settingsService } from './settings.service';

describe('PricingService', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('isNightHours', () => {
    it('identifies night hours correctly (10 PM to 6 AM)', () => {
      const night1 = new Date('2026-09-19T22:30:00+05:30');
      const night2 = new Date('2026-09-19T03:00:00+05:30');
      const day1 = new Date('2026-09-19T14:00:00+05:30');
      const day2 = new Date('2026-09-19T06:30:00+05:30');

      expect(pricingService.isNightHours(night1)).toBe(true);
      expect(pricingService.isNightHours(night2)).toBe(true);
      expect(pricingService.isNightHours(day1)).toBe(false);
      expect(pricingService.isNightHours(day2)).toBe(false);
    });
  });

  describe('calculateBill', () => {
    it('never rounds commission above a small bill or makes earnings negative', async () => {
      const bill = await pricingService.calculateBill({ baseVisitCharge: 0.6, rules: { nightSurgeRate: 0, rushSurgeRate: 1, commissionPct: 100 } });
      expect(bill.platformFee).toBe(0.6); expect(bill.workerEarnings).toBe(0);
    });
    it('uses the saved quote without querying current settings and rounds totals to paise', async () => {
      const settings = jest.spyOn(settingsService, 'getSetting').mockRejectedValue(new Error('Database unavailable'));
      const bill = await pricingService.calculateBill({ baseVisitCharge: 0.1, serviceItemsTotal: 0.2, partsTotal: 0.3, rules: { nightSurgeRate: 0, rushSurgeRate: 1, commissionPct: 0 } });
      expect(settings).not.toHaveBeenCalled();
      expect(bill.subtotal).toBe(0.6); expect(bill.totalAmount).toBe(0.6); expect(bill.workerEarnings).toBe(0.6);
    });
    it('calculates standard daytime bill with no surge', async () => {
      jest.spyOn(settingsService, 'getSetting').mockImplementation(async (key: string, def?: any) => {
        if (key === 'night_charge_pct') return 25;
        if (key === 'rush_surge_multiplier') return 1.0;
        if (key === 'rush_surge_cap') return 1.5;
        if (key === 'platform_commission_pct') return 15;
        return def;
      });

      const dayTime = new Date('2026-09-19T12:00:00+05:30');
      const bill = await pricingService.calculateBill({
        baseVisitCharge: 99,
        serviceItemsTotal: 300,
        partsTotal: 150,
        bookingTime: dayTime,
      });

      expect(bill.baseVisitCharge).toBe(99);
      expect(bill.serviceTotal).toBe(300);
      expect(bill.partsTotal).toBe(150);
      expect(bill.isNightTime).toBe(false);
      expect(bill.nightSurgeAmount).toBe(0);
      expect(bill.rushSurgeAmount).toBe(0);
      expect(bill.totalAmount).toBe(99 + 300 + 150); // 549
      // Commission 15% on labor (99 + 300 = 399 * 0.15 = 59.85 -> 60)
      expect(bill.platformFee).toBe(60);
      expect(bill.workerEarnings).toBe(549 - 60); // 489
    });

    it('calculates night surcharge (+25%) correctly', async () => {
      jest.spyOn(settingsService, 'getSetting').mockImplementation(async (key: string, def?: any) => {
        if (key === 'night_charge_pct') return 25;
        if (key === 'rush_surge_multiplier') return 1.0;
        if (key === 'rush_surge_cap') return 1.5;
        if (key === 'platform_commission_pct') return 15;
        return def;
      });

      const nightTime = new Date('2026-09-19T23:00:00+05:30');
      const bill = await pricingService.calculateBill({
        baseVisitCharge: 99,
        serviceItemsTotal: 200,
        partsTotal: 100,
        bookingTime: nightTime,
      });

      expect(bill.isNightTime).toBe(true);
      // 25% of (99 + 200) = 299 * 0.25 = 74.75 -> 75
      expect(bill.nightSurgeAmount).toBe(75);
      expect(bill.totalAmount).toBe(99 + 200 + 100 + 75); // 474
    });

    it('caps rush hour surge at 1.5x hard cap', async () => {
      jest.spyOn(settingsService, 'getSetting').mockImplementation(async (key: string, def?: any) => {
        if (key === 'night_charge_pct') return 25;
        if (key === 'rush_surge_multiplier') return 2.0; // Requested 2.0x, should cap at 1.5x
        if (key === 'rush_surge_cap') return 1.5;
        if (key === 'platform_commission_pct') return 15;
        return def;
      });

      const dayTime = new Date('2026-09-19T17:00:00+05:30');
      const bill = await pricingService.calculateBill({
        baseVisitCharge: 199, // AC
        serviceItemsTotal: 500,
        bookingTime: dayTime,
      });

      expect(bill.rushSurgeRate).toBe(1.5);
      // (199 + 500) * 0.5 = 699 * 0.5 = 349.5 -> 350
      expect(bill.rushSurgeAmount).toBe(350);
      expect(bill.totalAmount).toBe(199 + 500 + 350); // 1049
    });
  });

  describe('calculateCancellationFee', () => {
    it('is free when cancelled within 2 minutes (120 seconds)', async () => {
      jest.spyOn(settingsService, 'getSetting').mockImplementation(async (key: string, def?: any) => {
        if (key === 'cancel_grace_period_sec') return 120;
        if (key === 'cancel_fee_after_grace') return 40;
        return def;
      });

      const assignedAt = new Date('2026-09-19T12:00:00+05:30');
      const cancelledAt = new Date('2026-09-19T12:01:30+05:30'); // 90 seconds

      const result = await pricingService.calculateCancellationFee(assignedAt, false, cancelledAt);
      expect(result.fee).toBe(0);
      expect(result.goesToWorker).toBe(false);
    });

    it('charges Rs 40 fee after grace period (2 minutes)', async () => {
      jest.spyOn(settingsService, 'getSetting').mockImplementation(async (key: string, def?: any) => {
        if (key === 'cancel_grace_period_sec') return 120;
        if (key === 'cancel_fee_after_grace') return 40;
        return def;
      });

      const assignedAt = new Date('2026-09-19T12:00:00+05:30');
      const cancelledAt = new Date('2026-09-19T12:03:00+05:30'); // 180 seconds

      const result = await pricingService.calculateCancellationFee(assignedAt, false, cancelledAt);
      expect(result.fee).toBe(40);
      expect(result.goesToWorker).toBe(false);
    });

    it('gives fee to worker if customer cancels after worker arrived', async () => {
      jest.spyOn(settingsService, 'getSetting').mockImplementation(async (key: string, def?: any) => {
        if (key === 'cancel_grace_period_sec') return 120;
        if (key === 'cancel_fee_after_grace') return 40;
        return def;
      });

      const assignedAt = new Date('2026-09-19T12:00:00+05:30');
      const cancelledAt = new Date('2026-09-19T12:05:00+05:30');

      const result = await pricingService.calculateCancellationFee(assignedAt, true, cancelledAt);
      expect(result.fee).toBe(40);
      expect(result.goesToWorker).toBe(true);
    });
  });
});
