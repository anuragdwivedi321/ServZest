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

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocketServer(server);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', app: config.appName, timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/worker', workerRoutes);
app.use('/api/admin', adminRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

server.listen(config.port, () => {
  console.log(`=========================================`);
  console.log(`🚀 ${config.appName} Server running on port ${config.port}`);
  console.log(`📡 Socket.io server ready`);
  console.log(`🛠️  Environment: ${config.nodeEnv}`);
  console.log(`=========================================`);
});

export { app, server };
