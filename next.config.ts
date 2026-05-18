import type { NextConfig } from "next";
import { productionSecurityHeaders } from "./src/lib/security/securityHeaders";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "**.supabase.co",
        protocol: "https",
      },
    ],
  },
  async headers() {
    return [
      {
        headers: productionSecurityHeaders,
        source: "/:path*",
      },
    ];
  },
};

export default nextConfig;
