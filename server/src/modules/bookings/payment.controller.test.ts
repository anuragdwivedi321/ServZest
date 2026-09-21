import { upiLink, upiSchema, reportPaymentSchema } from './payment.controller';
describe('UPI checkout contracts', () => {
  it('encodes the recipient, immutable amount, currency and reference', () => {
    const uri = new URL(upiLink('test@invalid', 'Test & Only', 149.5, 'booking-123'));
    expect(uri.protocol).toBe('upi:'); expect(uri.searchParams.get('pa')).toBe('test@invalid');
    expect(uri.searchParams.get('pn')).toBe('Test & Only'); expect(uri.searchParams.get('am')).toBe('149.50');
    expect(uri.searchParams.get('cu')).toBe('INR'); expect(uri.searchParams.get('tr')).toBe('booking-123');
  });
  it('rejects invalid payees and UPI reports without a reference', () => {
    expect(upiSchema.safeParse({ upiId: 'not a upi', upiName: 'Test' }).success).toBe(false);
    expect(reportPaymentSchema.safeParse({ method: 'UPI' }).success).toBe(false);
    expect(reportPaymentSchema.safeParse({ method: 'CASH' }).success).toBe(true);
  });
});
