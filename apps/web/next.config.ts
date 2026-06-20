import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@huddle/shared'],
  serverActions: {
    allowedOrigins: ['localhost:3000', 'huddle.app', '*.vercel.app'],
  },
  async headers() {
    return [
      {
        // Allow Supabase Realtime connections
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

export default config;
