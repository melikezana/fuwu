import type { NextConfig } from "next";
import path from "node:path";
import { recommendedSecurityHeaders } from "./src/lib/security/securityHeaders";

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
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  // Unconfigured monitoring should not ship the SDK to every customer phone.
  // The browser condition never substitutes the server/Edge SDK.
  turbopack: process.env.NEXT_PUBLIC_SENTRY_DSN ? {} : {
    resolveAlias: { "@sentry/nextjs": { browser: "./src/lib/logger/sentry-disabled.ts" } },
  },
  webpack(config, { isServer }) {
    if (!isServer && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
      config.resolve.alias["@sentry/nextjs$"] = path.resolve("src/lib/logger/sentry-disabled.ts");
    }
    return config;
  },
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
        headers: recommendedSecurityHeaders,
        source: "/:path*",
      },
    ];
  },
};

export default nextConfig;
