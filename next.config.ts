import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["@react-three/drei"],
  },
};

export default nextConfig;
