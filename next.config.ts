import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
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

export default withSentryConfig(nextConfig, {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
