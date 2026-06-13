export type SecurityHeader = {
  key: string;
  value: string;
};

const contentSecurityPolicyDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "form-action 'self' https://*.supabase.co https://accounts.google.com",
  "frame-src 'self' https://*.supabase.co https://accounts.google.com",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
];

export const contentSecurityPolicyHeaderPlaceholder =
  contentSecurityPolicyDirectives.join("; ");

export const recommendedSecurityHeaders: SecurityHeader[] = [
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
    value: "camera=(), microphone=(), geolocation=()",
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
