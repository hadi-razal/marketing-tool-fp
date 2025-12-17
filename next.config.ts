import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Webpack config
  webpack: (config) => {
    return config;
  },
  // Empty turbopack config to silence the warning
  // We use webpack for native module support
  turbopack: {},
};

export default nextConfig;
