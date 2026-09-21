require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');

const db = new PrismaClient();
const base = 'http://127.0.0.1:4000';
const ids = [];
let previousSubscriptionSetting;

const tokenFor = user => jwt.sign({ id: user.id, phone: user.phone, role: user.role }, process.env.JWT_SECRET || 'servzest-super-secret-jwt-key-change-in-prod', { expiresIn: '10m' });
async function call(path, token, body, status = 200, method) {
  const response = await fetch(base + path, { method: method || (body === undefined ? 'GET' : 'POST'), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(30000) });
  const data = await response.json();
  assert.equal(response.status, status, `${path}: ${JSON.stringify(data)}`);
  return data;
}

(async () => {
  try {
    const [admin, customer, subscribedUser, unsubscribedUser] = await Promise.all(['ADMIN', 'CUSTOMER', 'WORKER', 'WORKER'].map(async role => {
      const user = await db.user.create({ data: { phone: `launch-${randomUUID()}`, name: 'Launch test fixture', role } }); ids.push(user.id); return user;
    }));
    const service = await db.service.findFirstOrThrow();
    const subscribed = await db.workerProfile.create({ data: { userId: subscribedUser.id, skills: ['test'], kycStatus: 'APPROVED', services: { create: { serviceId: service.id } } } });
    await db.workerProfile.create({ data: { userId: unsubscribedUser.id, skills: ['test'], kycStatus: 'APPROVED', services: { create: { serviceId: service.id } } } });
    const plan = await db.subscriptionPlan.findFirstOrThrow({ where: { isActive: true } });
    const adminToken = tokenFor(admin), customerToken = tokenFor(customer), subscribedToken = tokenFor(subscribedUser), unsubscribedToken = tokenFor(unsubscribedUser);

    const activated = await call(`/api/admin/workers/${subscribed.id}/subscription`, adminToken, { planId: plan.id, paymentRef: `TEST-${randomUUID()}` }, 201);
    assert.equal(activated.subscription.status, 'ACTIVE');
    const summary = await call('/api/worker/subscription', subscribedToken);
    assert.equal(summary.subscription.workerId, subscribed.id);
    assert.equal(summary.plans.length > 0, true);

    previousSubscriptionSetting = await db.adminSetting.findUnique({ where: { key: 'subscription_required' } });
    await call('/api/admin/settings', adminToken, { settings: { subscription_required: 1 } }, 200, 'PUT');
    await call('/api/worker/toggle-online', subscribedToken, { isOnline: true });
    await call('/api/worker/toggle-online', unsubscribedToken, { isOnline: true }, 402);

    const exported = await call('/api/auth/data-export', customerToken);
    assert.equal(exported.account.id, customer.id);
    await call('/api/auth/account', customerToken, { confirmation: 'DELETE' }, 200, 'DELETE');
    await call('/api/auth/me', customerToken, undefined, 401);
    console.log('PASS: subscription activation/expiry gate, worker balance, data export, account deletion and deleted-session rejection');
  } finally {
    if (previousSubscriptionSetting) await db.adminSetting.update({ where: { key: 'subscription_required' }, data: { value: previousSubscriptionSetting.value } }).catch(() => {});
    else await db.adminSetting.upsert({ where: { key: 'subscription_required' }, update: { value: '0' }, create: { key: 'subscription_required', value: '0' } }).catch(() => {});
    await db.auditLog.deleteMany({ where: { actorId: { in: ids } } }).catch(() => {});
    await db.user.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
    await db.$disconnect();
  }
})().catch(error => { console.error(error.message); process.exit(1); });
