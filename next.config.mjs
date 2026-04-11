import pkg from './package.json' with { type: 'json' };

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: [
    '*.replit.dev',
    '*.replit.app',
    '*.riker.replit.dev',
    '*.picard.replit.dev',
    '*.kirk.replit.dev',
  ],
  images: {
    remotePatterns: [
      {
        hostname: 's2.googleusercontent.com',
      },
    ],
  },
  serverExternalPackages: ['pdf-parse', 'officeparser', 'better-sqlite3'],
  outputFileTracingIncludes: {
    '/api/**': [
      './node_modules/@napi-rs/canvas/**',
      './node_modules/@napi-rs/canvas-linux-x64-gnu/**',
      './node_modules/@napi-rs/canvas-linux-x64-musl/**',
    ],
  },
  outputFileTracingExcludes: {
    '/api/**': [
      './searxng/**',
      './redwood/**',
      './phoenix/**',
      './zig/**',
      './e2e/**',
      './docs/**',
      './openspec/**',
    ],
  },
  env: {
    NEXT_PUBLIC_VERSION: pkg.version,
  },
};

export default nextConfig;
