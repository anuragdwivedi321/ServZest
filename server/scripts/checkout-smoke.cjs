// Run with the local API running: node scripts/checkout-smoke.cjs
// Creates isolated fixture customers and removes only its own fixture records.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const db = new PrismaClient();
const users = [];
const base = 'http://127.0.0.1:4000/api/bookings';
async function call(path, body, token, expected = 200) {
  const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  assert.equal(response.status, expected, JSON.stringify(result));
  return result;
}
(async () => {
  try {
    for (let i = 0; i < 2; i++) users.push(await db.user.create({ data: { phone: `checkout-test-${randomUUID()}`, name: 'Checkout test fixture', role: 'CUSTOMER' } }));
    const tokens = users.map(user => jwt.sign({ id: user.id, phone: user.phone, role: user.role }, process.env.JWT_SECRET || 'servzest-super-secret-jwt-key-change-in-prod', { expiresIn: '10m' }));
    const service = await db.service.findUniqueOrThrow({ where: { slug: 'plumber' }, include: { items: true } });
    const indiaTomorrow = new Date(Date.now() + 86400000 + 330 * 60000).toISOString().slice(0, 10);
    const scheduledAt = new Date(`${indiaTomorrow}T11:00:00+05:30`).toISOString();
    const options = { serviceId: service.id, itemIds: [service.items[0].id], couponCode: 'WELCOME50', scheduledAt };
    await call('/estimate', { ...options, couponCode: 'INVALID' }, tokens[0], 400);
    await call('/estimate', options, undefined, 401);
    const { bill } = await call('/estimate', options, tokens[0]);
    assert.equal(bill.discountAmount, 50);
    const input = { ...options, pickupLat: 0, pickupLng: 0, pickupAddress: 'Isolated automated test location', locationConfirmed: true, requestKey: randomUUID(), acceptedTotal: bill.totalAmount };
    await call('/', { ...input, acceptedTotal: bill.totalAmount + 1 }, tokens[0], 409);
    const [first, replay] = await Promise.all([call('/', input, tokens[0], 201), call('/', input, tokens[0], 201)]);
    assert.equal(first.booking.id, replay.booking.id);
    assert.equal(first.booking.status, 'SCHEDULED');
    assert.equal(first.booking.scheduledAt, scheduledAt);
    const detail = await call(`/${first.booking.id}`, undefined, tokens[0]);
    assert.equal(detail.booking.items.length, 1);
    assert.equal(detail.bill.totalAmount, bill.totalAmount);
    await call(`/${first.booking.id}`, undefined, tokens[1], 403);
    await call('/estimate', options, tokens[0], 400);
    await call(`/${first.booking.id}/cancel`, {}, tokens[0]);
    assert.equal((await call(`/${first.booking.id}`, undefined, tokens[0])).booking.status, 'CANCELLED');
    const immediate = { serviceId: service.id, itemIds: [] };
    const nowQuote = await call('/estimate', immediate, tokens[0]);
    const nowBooking = await call('/', { ...input, ...immediate, scheduledAt: undefined, couponCode: undefined, requestKey: randomUUID(), acceptedTotal: nowQuote.bill.totalAmount }, tokens[0], 201);
    for (let attempt = 0; attempt < 20; attempt++) {
      const current = await call(`/${nowBooking.booking.id}`, undefined, tokens[0]);
      if (current.booking.status === 'NO_PROVIDER') break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.equal((await call(`/${nowBooking.booking.id}`, undefined, tokens[0])).booking.status, 'NO_PROVIDER');
    const scheduledQuote = await call('/estimate', { ...immediate, scheduledAt }, tokens[0]);
    const dueBooking = await call('/', { ...input, ...immediate, couponCode: undefined, requestKey: randomUUID(), acceptedTotal: scheduledQuote.bill.totalAmount }, tokens[0], 201);
    await db.booking.update({ where: { id: dueBooking.booking.id }, data: { scheduledAt: new Date(Date.now() - 1000) } });
    for (let attempt = 0; attempt < 30; attempt++) {
      if ((await call(`/${dueBooking.booking.id}`, undefined, tokens[0])).booking.status === 'NO_PROVIDER') break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.equal((await call(`/${dueBooking.booking.id}`, undefined, tokens[0])).booking.status, 'NO_PROVIDER');
    console.log('PASS: quote, coupon, selected task, price validation, concurrent retry, persistence, ownership, schedule, cancellation, no-provider dispatch, automatic scheduled dispatch');
  } finally {
    const where = { customerId: { in: users.map(user => user.id) } };
    await db.bookingItem.deleteMany({ where: { booking: where } });
    await db.booking.deleteMany({ where });
    await db.user.deleteMany({ where: { id: { in: users.map(user => user.id) } } });
    await db.$disconnect();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
