import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Role } from '@prisma/client';
import { prisma } from '../db/prisma';
import { z } from 'zod';

export interface AuthUser {
  id: string;
  phone: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionId?: string;
    }
  }
}

export const readCookie = (cookieHeader: string | undefined, name: string) => {
  if (!cookieHeader) return undefined;
  for (const entry of cookieHeader.split(';')) {
    const separator = entry.indexOf('=');
    if (separator < 0) continue;
    const key = entry.slice(0, separator).trim();
    if (key === name) return decodeURIComponent(entry.slice(separator + 1).trim());
  }
  return undefined;
};

export const authenticateJwt = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const cookieToken = readCookie(req.headers.cookie, config.session.cookieName);
  const token = bearerToken || cookieToken;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (config.nodeEnv === 'production' && cookieToken && !bearerToken && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.headers.origin;
    if (!origin || origin !== config.clientUrl) {
      return res.status(403).json({ success: false, message: 'Request origin could not be verified' });
    }
  }
  let id: string;
  let sessionId: string | undefined;
  try {
    const decoded = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
    const claims = z.object({ id: z.string().uuid(), sid: z.string().uuid().optional() }).parse(decoded);
    id = claims.id;
    sessionId = claims.sid;
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
  try {
    if (config.nodeEnv === 'production' && !sessionId) return res.status(401).json({ success: false, message: 'Session is no longer valid' });
    if (sessionId) {
      const session = await prisma.session.findFirst({ where: { id: sessionId, userId: id, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } });
      if (!session) return res.status(401).json({ success: false, message: 'Session is no longer valid' });
      req.sessionId = sessionId;
    }
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, phone: true, role: true, deletedAt: true } });
    if (!user || user.deletedAt) return res.status(401).json({ success: false, message: 'Account no longer available. Please sign in again.' });
    req.user = user;
    next();
  } catch (error) { next(error); }
};

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires one of [${allowedRoles.join(', ')}]`,
      });
    }
    next();
  };
};
