import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { sendOtp, verifyOtp, getMe, sendOtpSchema, verifyOtpSchema } from './auth.controller';
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

router.post('/send-otp', otpLimiter, validateRequest({ body: sendOtpSchema }), sendOtp);
router.post('/verify-otp', validateRequest({ body: verifyOtpSchema }), verifyOtp);
router.get('/me', authenticateJwt, getMe);

export default router;
