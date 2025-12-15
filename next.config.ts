import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure server components external packages for Next.js 16
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // Webpack config
  webpack: (config) => {
    return config;
  },
  // Empty turbopack config to silence the warning
  // We use webpack for native module support
  turbopack: {},
};

export default nextConfig;
