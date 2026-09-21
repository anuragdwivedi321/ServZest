import { checkoutQuote, validateSchedule } from './checkout.service';
import { settingsService } from './settings.service';
import { pricingService } from './pricing.service';

describe('Booking checkout', () => {
  beforeEach(() => jest.spyOn(settingsService, 'getSetting').mockImplementation(async (_key, fallback) => fallback));
  afterEach(() => jest.restoreAllMocks());

  it('accepts India-time slots and rejects past, arbitrary, and distant times', () => {
    const now = Date.parse('2026-09-20T08:00:00+05:30');
    expect(validateSchedule('2026-09-20T03:30:00Z', now)?.toISOString()).toBe('2026-09-20T03:30:00.000Z');
    for (const time of ['2026-09-19T03:30:00Z', '2026-09-20T03:45:00Z', '2026-09-28T03:30:00Z']) {
      expect(() => validateSchedule(time, now)).toThrow();
    }
  });

  const db = (count = 0) => ({
    service: { findUnique: jest.fn().mockResolvedValue({ visitCharge: 99, items: [{ id: 'task', nameEn: 'Repair', minPrice: 149, unit: 'Job' }] }) },
    booking: { count: jest.fn().mockResolvedValue(count) },
  } as any);

  it('rejects tasks from another service', async () => {
    await expect(checkoutQuote({ serviceId: 'service', itemIds: ['foreign-task'] }, 'customer', db())).rejects.toThrow('do not belong');
  });

  it('deduplicates tasks and applies the welcome discount once', async () => {
    const quote = await checkoutQuote({ serviceId: 'service', itemIds: ['task', 'task'], couponCode: 'WELCOME50' }, 'customer', db());
    expect(quote.selectedItems).toHaveLength(1);
    expect(quote.bill.serviceTotal).toBe(149);
    expect(quote.bill.discountAmount).toBe(50);
    await expect(checkoutQuote({ serviceId: 'service', itemIds: [], couponCode: 'WELCOME50' }, 'customer', db(1))).rejects.toThrow('first booking');
    await expect(checkoutQuote({ serviceId: 'service', itemIds: [], couponCode: 'WELCOME50' }, undefined, db())).rejects.toThrow('Sign in');
  });

  it('preserves booked pricing rules and never discounts parts below cost', async () => {
    const bill = await pricingService.calculateBill({ baseVisitCharge: 99, serviceItemsTotal: 100, partsTotal: 500, discountAmount: 1000, rules: { nightSurgeRate: 0.25, rushSurgeRate: 1.2, commissionPct: 10 } });
    expect(bill.nightSurgeAmount).toBe(50);
    expect(bill.rushSurgeAmount).toBe(40);
    expect(bill.totalAmount).toBe(500);
    expect(bill.platformFee).toBe(0);
  });
});
