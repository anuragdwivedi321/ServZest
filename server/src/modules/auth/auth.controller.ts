import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { otpProvider } from '../../services/otp.service';
import { config } from '../../config';
import { Role } from '@prisma/client';
import { safeWorkerProfile } from '../../services/worker-profile.service';
import { withoutOtp } from '../../services/booking-lock.service';

export const sendOtpSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'),
});

export const verifyOtpSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'),
  otp: z.string().min(4).max(6),
  name: z.string().trim().min(2).max(80).optional(),
  role: z.enum(['CUSTOMER', 'WORKER']).optional(),
  consentAccepted: z.boolean().optional(),
});
export const deleteAccountSchema = z.object({ confirmation: z.literal('DELETE') });

const sessionCookie = (token: string, maxAge = config.session.ttlSeconds) => {
  const secure = config.nodeEnv === 'production' ? '; Secure' : '';
  return `${config.session.cookieName}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
};

export const sendOtp = async (req: Request, res: Response) => {
  const { phone } = req.body;
  const result = await otpProvider.sendOtp(phone);
  return res.status(200).json(result);
};

export const verifyOtp = async (req: Request, res: Response) => {
  const { phone, otp, name, role, consentAccepted } = req.body;

  let user = await prisma.user.findUnique({ where: { phone }, include: { workerProfile: true } });
  if (!user && consentAccepted !== true) {
    return res.status(400).json({ success: false, message: 'Accept the Terms and Privacy Policy to create an account.' });
  }
  if (user?.role === Role.ADMIN && config.nodeEnv === 'production' && !config.adminPhoneAllowlist.includes(phone)) {
    return res.status(403).json({ success: false, message: 'Administrator access is not enabled for this account.' });
  }

  const isValid = await otpProvider.verifyOtp(phone, otp);
  if (!isValid) {
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        phone,
        name: name || `User_${phone.slice(-4)}`,
        role: role || Role.CUSTOMER,
        consentedAt: new Date(),
        consentVersion: config.legalVersion,
        ...(role === Role.WORKER ? { workerProfile: { create: { skills: [] } } } : {}),
      },
      include: { workerProfile: true },
    });
  } else if (consentAccepted === true && user.consentVersion !== config.legalVersion) {
    user = await prisma.user.update({ where: { id: user.id }, data: { consentedAt: new Date(), consentVersion: config.legalVersion }, include: { workerProfile: true } });
  }

  const session = await prisma.session.create({ data: { userId: user.id, expiresAt: new Date(Date.now() + config.session.ttlSeconds * 1000), ipAddress: req.ip, userAgent: req.get('user-agent')?.slice(0, 500) } });
  const token = jwt.sign(
    { id: user.id, phone: user.phone, role: user.role, sid: session.id },
    config.jwt.secret,
    { expiresIn: config.session.ttlSeconds }
  );

  res.setHeader('Set-Cookie', sessionCookie(token));

  return res.status(200).json({
    success: true,
    message: 'OTP verified successfully',
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      workerProfile: safeWorkerProfile(user.workerProfile),
    },
  });
};

export const logout = async (req: Request, res: Response) => {
  if (req.sessionId) await prisma.session.updateMany({ where: { id: req.sessionId, userId: req.user!.id }, data: { revokedAt: new Date() } });
  res.setHeader('Set-Cookie', sessionCookie('', 0));
  return res.status(200).json({ success: true, message: 'Signed out securely' });
};

export const getMe = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      workerProfile: {
        include: {
          services: {
            include: { service: true },
          },
        },
      },
    },
  });

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  return res.status(200).json({
    success: true,
    user: { ...user, workerProfile: safeWorkerProfile(user.workerProfile) },
  });
};

export const exportMyData = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      workerProfile: { include: { services: { include: { service: { select: { id: true, slug: true, nameEn: true } } } } } },
      bookings: { include: { service: { select: { slug: true, nameEn: true } }, items: true, payment: true, rating: true, complaints: true }, orderBy: { createdAt: 'desc' } },
      ratingsGiven: true,
      complaints: true,
    },
  });
  if (!user) return res.status(404).json({ success: false, message: 'Account not found' });
  const { workerProfile, bookings, ...account } = user;
  res.setHeader('Content-Disposition', `attachment; filename="servzest-data-${user.id}.json"`);
  return res.status(200).json({ exportedAt: new Date().toISOString(), account, workerProfile: safeWorkerProfile(workerProfile), bookings: bookings.map(withoutOtp) });
};

export const deleteMyAccount = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const active = await prisma.booking.count({ where: { OR: [{ customerId: userId }, { worker: { userId } }], status: { in: ['SCHEDULED', 'SEARCHING', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'] } } });
  if (active) return res.status(409).json({ success: false, message: 'Cancel or finish active bookings before deleting your account.' });
  await prisma.$transaction(async tx => {
    const profile = await tx.workerProfile.findUnique({ where: { userId }, select: { id: true } });
    if (profile) {
      await tx.workerService.deleteMany({ where: { workerId: profile.id } });
      await tx.workerProfile.update({ where: { id: profile.id }, data: { aadhaarNumber: null, aadhaarDocUrl: null, identityLast4: null, upiId: null, upiName: null, photoUrl: null, skills: [], isOnline: false, isBusy: false } });
      await tx.$executeRaw`UPDATE worker_profiles SET current_location = NULL, last_location_at = NULL WHERE id = ${profile.id}`;
    }
    await tx.user.update({ where: { id: userId }, data: { phone: `deleted-${userId}@removed.invalid`, name: 'Deleted user', deletedAt: new Date() } });
    await tx.session.updateMany({ where: { userId }, data: { revokedAt: new Date() } });
    await tx.auditLog.create({ data: { actorId: userId, action: 'ACCOUNT_DELETED', entityType: 'User', entityId: userId, ipAddress: req.ip } });
  });
  res.setHeader('Set-Cookie', sessionCookie('', 0));
  return res.status(200).json({ success: true, message: 'Account access and personal profile data have been removed.' });
};
