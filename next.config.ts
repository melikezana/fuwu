import type { NextConfig } from "next";
import { productionSecurityHeaders } from "./src/lib/security/securityHeaders";

const localSupabaseImagePatterns: NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
> =
  process.env.NODE_ENV !== "production"
    ? [
        {
          hostname: "127.0.0.1",
          pathname: "/storage/v1/object/**",
          port: "54321",
          protocol: "http",
        },
        {
          hostname: "localhost",
          pathname: "/storage/v1/object/**",
          port: "54321",
          protocol: "http",
        },
      ]
    : [];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "**.supabase.co",
        protocol: "https",
      },
      {
        hostname: "lh3.googleusercontent.com",
        protocol: "https",
      },
      ...localSupabaseImagePatterns,
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
