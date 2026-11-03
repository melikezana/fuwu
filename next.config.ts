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

// Görsel optimize edici yalnızca FUWU'nun kendi Supabase deposundan görsel çeker.
// Joker (*.supabase.co) başka projelerin dosyalarını FUWU üzerinden servis ettirip
// Vercel görsel kotasını tüketmeye açıktı.
const supabaseStorageHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
      supabaseStorageHost && supabaseStorageHost.endsWith(".supabase.co")
        ? { hostname: supabaseStorageHost, pathname: "/storage/v1/object/public/**", protocol: "https" as const }
        : { hostname: "**.supabase.co", pathname: "/storage/v1/object/public/**", protocol: "https" as const },
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
