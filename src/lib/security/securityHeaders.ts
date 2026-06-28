export type SecurityHeader = {
  key: string;
  value: string;
};

const localSupabaseHttpSources =
  process.env.NODE_ENV === "production"
    ? ""
    : " http://127.0.0.1:54321 http://localhost:54321";
const localSupabaseConnectSources =
  process.env.NODE_ENV === "production"
    ? ""
    : `${localSupabaseHttpSources} ws://127.0.0.1:54321 ws://localhost:54321`;
const developmentEvalSource =
  process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";

const contentSecurityPolicyDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // SECURITY: 'unsafe-inline' Next.js inline scripts için
  // gerekli. Nonce-based CSP'ye geçiş gelecek milestone'da
  // planlanmalı. Referans: https://nextjs.org/docs/app/building-
  // your-application/configuring/content-security-policy
  `script-src 'self' 'unsafe-inline'${developmentEvalSource}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com${localSupabaseHttpSources}`,
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${localSupabaseConnectSources}`,
  "form-action 'self' https://*.supabase.co https://accounts.google.com",
  "frame-src 'self' https://*.supabase.co https://accounts.google.com",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
];

export const contentSecurityPolicyHeaderPlaceholder =
  contentSecurityPolicyDirectives.join("; ");

export const recommendedSecurityHeaders: SecurityHeader[] = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

export const recommendedContentSecurityPolicy: SecurityHeader = {
  key: "Content-Security-Policy",
  value: contentSecurityPolicyHeaderPlaceholder,
};

export const productionSecurityHeaders = [
  ...recommendedSecurityHeaders,
  recommendedContentSecurityPolicy,
];
