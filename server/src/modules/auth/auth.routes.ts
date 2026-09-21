import { asyncHandler } from '../../middlewares/async.middleware';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { sendOtp, verifyOtp, getMe, logout, exportMyData, deleteMyAccount, sendOtpSchema, verifyOtpSchema, deleteAccountSchema } from './auth.controller';
import { validateRequest } from '../../middlewares/validate.middleware';
import { authenticateJwt } from '../../middlewares/auth.middleware';

const router = Router();

// Rate limiter for OTP requests: max 5 requests per 10 minutes per IP
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many OTP requests. Please try again after 10 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const phoneSendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  keyGenerator: req => `phone:${String(req.body?.phone || 'invalid')}`,
  message: { success: false, message: 'Too many OTP requests for this number. Please wait 10 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const phoneVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  keyGenerator: req => `phone:${String(req.body?.phone || 'invalid')}`,
  message: { success: false, message: 'Too many verification attempts. Request a new OTP later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/send-otp', otpLimiter, phoneSendLimiter, validateRequest({ body: sendOtpSchema }), asyncHandler(sendOtp));
router.post('/verify-otp', rateLimit({ windowMs: 600000, limit: 30 }), phoneVerifyLimiter, validateRequest({ body: verifyOtpSchema }), asyncHandler(verifyOtp));
router.get('/me', authenticateJwt, asyncHandler(getMe));
router.post('/logout', authenticateJwt, asyncHandler(logout));
router.get('/data-export', authenticateJwt, asyncHandler(exportMyData));
router.delete('/account', authenticateJwt, validateRequest({ body: deleteAccountSchema }), asyncHandler(deleteMyAccount));

export default router;
