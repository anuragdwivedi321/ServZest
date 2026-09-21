import jwt from 'jsonwebtoken';
import { authenticateJwt, requireRole } from './auth.middleware';
import { config } from '../config';
import { prisma } from '../db/prisma';
jest.mock('../db/prisma', () => ({ prisma: { user: { findUnique: jest.fn() } } }));
const id = '55e40fe4-a66a-4d7a-8c25-68af6dafcfe2';
describe('Current account authorization', () => {
  const request = (claims: object = { id, role: 'ADMIN' }) => ({ headers: { authorization: `Bearer ${jwt.sign(claims, config.jwt.secret)}` } } as any);
  const response = () => { const res: any = { json: jest.fn(), status: jest.fn() }; res.status.mockReturnValue(res); return res; };
  beforeEach(() => jest.clearAllMocks());
  it('uses current database role rather than an old admin claim', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id, phone: 'test', role: 'CUSTOMER' });
    const req = request(), res = response(), next = jest.fn();
    await authenticateJwt(req, res, next);
    expect(req.user.role).toBe('CUSTOMER');
    requireRole('ADMIN')(req, res, jest.fn()); expect(res.status).toHaveBeenCalledWith(403);
  });
  it('rejects a deleted account even with a signed token', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const res = response(), next = jest.fn(); await authenticateJwt(request(), res, next);
    expect(res.status).toHaveBeenCalledWith(401); expect(next).not.toHaveBeenCalled();
  });
  it('rejects malformed identity claims before accessing the database', async () => {
    const res = response(); await authenticateJwt(request({ role: 'ADMIN' }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401); expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
