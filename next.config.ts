import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
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

export default withSentryConfig(nextConfig, {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
