import dotenv from 'dotenv';
dotenv.config();
const positiveInt = (name: string, fallback: number) => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer.`);
  return value;
};
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.includes('change-in-prod'))) {
  throw new Error('Set a private JWT_SECRET of at least 32 characters before production startup.');
}
if (process.env.NODE_ENV === 'production' && (!process.env.KYC_ENCRYPTION_KEY || process.env.KYC_ENCRYPTION_KEY.length < 32)) {
  throw new Error('Set a private KYC_ENCRYPTION_KEY of at least 32 characters before production startup.');
}
if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_URL?.startsWith('https://')) {
  throw new Error('Set CLIENT_URL to the public HTTPS web origin before production startup.');
}
if (process.env.NODE_ENV === 'production' && (process.env.OTP_PROVIDER !== 'msg91' || !process.env.MSG91_AUTH_KEY || !process.env.MSG91_TEMPLATE_ID)) {
  throw new Error('Configure OTP_PROVIDER=msg91, MSG91_AUTH_KEY and MSG91_TEMPLATE_ID before production startup.');
}
if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PHONE_ALLOWLIST) {
  throw new Error('Set ADMIN_PHONE_ALLOWLIST before production startup.');
}

export const config = {
  port: positiveInt('PORT', 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  appName: process.env.APP_NAME || 'ServZest',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/quickkaam?schema=public',
  jwt: {
    secret: process.env.JWT_SECRET || 'servzest-super-secret-jwt-key-change-in-prod',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  session: {
    cookieName: process.env.SESSION_COOKIE_NAME || 'servzest_session',
    ttlSeconds: positiveInt('SESSION_TTL_SECONDS', 604800),
  },
  trustProxy: process.env.TRUST_PROXY === '1',
  legalVersion: process.env.LEGAL_VERSION || '2026-09-21',
  otp: {
    provider: process.env.OTP_PROVIDER || 'mock',
    msg91AuthKey: process.env.MSG91_AUTH_KEY || '',
    msg91TemplateId: process.env.MSG91_TEMPLATE_ID || '',
  },
  retention: {
    bookingLocationDays: positiveInt('BOOKING_LOCATION_RETENTION_DAYS', 90),
    workerLocationHours: positiveInt('WORKER_LOCATION_RETENTION_HOURS', 24),
  },
  adminPhoneAllowlist: (process.env.ADMIN_PHONE_ALLOWLIST || '').split(',').map(value => value.trim()).filter(Boolean),
  defaultLocation: {
    city: process.env.DEFAULT_CITY || 'New Delhi',
    lat: parseFloat(process.env.DEFAULT_LAT || '28.6139'),
    lng: parseFloat(process.env.DEFAULT_LNG || '77.2090'),
  },
  mockOtp: '123456',
  kycEncryptionKey: process.env.KYC_ENCRYPTION_KEY || process.env.JWT_SECRET || 'servzest-local-kyc-encryption-key',
};
