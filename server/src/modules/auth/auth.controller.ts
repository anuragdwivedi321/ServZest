import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { otpProvider } from '../../services/otp.service';
import { config } from '../../config';
import { Role } from '@prisma/client';

export const sendOtpSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'),
});

export const verifyOtpSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'),
  otp: z.string().min(4).max(6),
  name: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
});

export const sendOtp = async (req: Request, res: Response) => {
  const { phone } = req.body;
  const result = await otpProvider.sendOtp(phone);
  return res.status(200).json(result);
};

export const verifyOtp = async (req: Request, res: Response) => {
  const { phone, otp, name, role } = req.body;

  const isValid = await otpProvider.verifyOtp(phone, otp);
  if (!isValid) {
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { phone },
    include: { workerProfile: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        phone,
        name: name || `User_${phone.slice(-4)}`,
        role: role || Role.CUSTOMER,
      },
      include: { workerProfile: true },
    });

    // If registering as worker, initialize worker profile
    if (role === Role.WORKER) {
      await prisma.workerProfile.create({
        data: {
          userId: user.id,
          skills: [],
        },
      });
    }
  }

  const token = jwt.sign(
    { id: user.id, phone: user.phone, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as any }
  );

  return res.status(200).json({
    success: true,
    message: 'OTP verified successfully',
    token,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      workerProfile: user.workerProfile,
    },
  });
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

  return res.status(200).json({ success: true, user });
};
