import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.loca.lt",
    "*.sslip.io",
    "*.nip.io",
    "172-30-1-200.sslip.io",
  ],
};

export default nextConfig;
