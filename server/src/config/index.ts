import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appName: process.env.APP_NAME || 'QuickKaam',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/quickkaam?schema=public',
  jwt: {
    secret: process.env.JWT_SECRET || 'quickkaam-super-secret-jwt-key-change-in-prod',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  defaultLocation: {
    city: process.env.DEFAULT_CITY || 'New Delhi',
    lat: parseFloat(process.env.DEFAULT_LAT || '28.6139'),
    lng: parseFloat(process.env.DEFAULT_LNG || '77.2090'),
  },
  mockOtp: '123456',
};
