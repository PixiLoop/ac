const path = require('path');
const dotenv = require('dotenv');

/**
 * Load ROOT .env (monorepo single source of truth)
 * This MUST run before Next config is exported
 */
dotenv.config({
  path: path.resolve(__dirname, '.env'),
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
    NEXT_PUBLIC_ABN_GUID: process.env.NEXT_PUBLIC_ABN_GUID || '',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:4000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
