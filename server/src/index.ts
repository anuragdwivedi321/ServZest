import { apiErrorHandler } from './middlewares/api-error.middleware';
import { startBookingScheduler, stopBookingScheduler } from './services/booking-dispatch.service';
import supportRoutes from './modules/support/support.routes';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { initSocketServer } from './sockets/socket.server';
import authRoutes from './modules/auth/auth.routes';
import servicesRoutes from './modules/services/services.routes';
import bookingsRoutes from './modules/bookings/bookings.routes';
import workerRoutes from './modules/worker/worker.routes';
import adminRoutes from './modules/admin/admin.routes';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import { prisma } from './db/prisma';
import { startPrivacyRetention, stopPrivacyRetention } from './services/privacy-retention.service';

const app = express();
const server = http.createServer(app);
if (config.trustProxy) app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  const requestId = typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'].slice(0, 100) : randomUUID();
  res.setHeader('X-Request-Id', requestId);
  const started = Date.now();
  res.on('finish', () => console.log(JSON.stringify({ level: 'info', event: 'http_request', requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - started })));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  if (config.nodeEnv === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Initialize Socket.io
initSocketServer(server);

// Robust CORS Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  config.clientUrl,
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman) or any allowed origin
      if (!origin || allowedOrigins.includes(origin) || config.nodeEnv === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
    ],
    optionsSuccessStatus: 200,
  })
);

app.use(express.json({ limit: '256kb' }));
app.use('/api', rateLimit({ windowMs: 60000, limit: 300, standardHeaders: true, legacyHeaders: false }));

// Healthcheck
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', app: config.appName, timestamp: new Date() });
});
app.get('/ready', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.status(200).json({ status: 'ready', timestamp: new Date() }); }
  catch { res.status(503).json({ status: 'not_ready' }); }
});

// API Routes
app.use('/api/support', supportRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/worker', workerRoutes);
app.use('/api/admin', adminRoutes);

app.use(apiErrorHandler);
// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Explicitly bind to '0.0.0.0' to ensure IPv4 accessibility on localhost and 127.0.0.1
server.listen(config.port, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`🚀 ${config.appName} Server running on http://0.0.0.0:${config.port}`);
  console.log(`📡 Local URLs: http://localhost:${config.port} and http://127.0.0.1:${config.port}`);
  console.log(`📡 Socket.io server ready`);
  void startBookingScheduler().catch(error => console.error('Scheduler startup failed:', error));
  startPrivacyRetention();
  console.log(`🛠️  Environment: ${config.nodeEnv}`);
  console.log(`=========================================`);
});

let shuttingDown = false;
const shutdown = (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(JSON.stringify({ level: 'info', event: 'shutdown_started', signal }));
  stopBookingScheduler();
  stopPrivacyRetention();
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
  setTimeout(() => process.exit(1), 15000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app, server };
