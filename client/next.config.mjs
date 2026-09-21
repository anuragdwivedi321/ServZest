import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

const contentSecurityPolicy = (isDevelopment) => [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  "img-src 'self' data: https://*.tile.openstreetmap.org",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
  `connect-src 'self'${isDevelopment ? ' ws: wss:' : ''} https://nominatim.openstreetmap.org https://router.project-osrm.org`,
  "worker-src 'self'",
  "manifest-src 'self'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  productionBrowserSourceMaps: false,
  turbopack: { root: process.cwd() },
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'ServZest',
  },
  async rewrites() {
    const backend = (process.env.BACKEND_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');
    return { fallback: [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/socket.io', destination: `${backend}/socket.io/` },
      { source: '/socket.io/:path*', destination: `${backend}/socket.io/:path*` },
    ] };
  },
};

export default (phase) => {
  const isDevelopment = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    ...nextConfig,
    distDir: isDevelopment ? '.next-dev' : '.next',
    async headers() {
      return [{ source: '/:path*', headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        { key: 'Content-Security-Policy', value: contentSecurityPolicy(isDevelopment) },
      ] }];
    },
  };
};
