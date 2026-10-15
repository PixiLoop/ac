const path = require('path');
const dotenv = require('dotenv');

/**
 * Load ROOT .env (monorepo single source of truth)
 * This MUST run before Next config is exported
 */
dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
});
 console.log("process.env.NEXT_PUBLIC_API_BASE_URL next", process.env.NEXT_PUBLIC_API_BASE_URL)
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,

  /**
   * Disable PWA in development (recommended)
   */
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
module.exports = withPWA({
  reactStrictMode: true,

  /**
   * Optional: expose only what Next needs at build time
   * (NEXT_PUBLIC_* is already auto-exposed)
   */
 
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_ABN_GUID: process.env.NEXT_PUBLIC_ABN_GUID,
  },
});
