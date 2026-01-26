import type { NextConfig } from "next";

import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingRoot: path.join(__dirname, "../../"),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all for now since sifts can come from anywhere, but we can tighten later
      }
    ],
  },
};

export default nextConfig;
