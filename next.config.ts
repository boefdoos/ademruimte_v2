import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // i18n configuration will be handled at the app level with i18n provider

  // PWA and performance optimizations
  reactStrictMode: true,

  // Optimize for mobile
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Better code splitting for mobile
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
