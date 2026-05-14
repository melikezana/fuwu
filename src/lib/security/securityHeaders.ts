export type SecurityHeader = {
  key: string;
  value: string;
};

export const contentSecurityPolicyHeaderPlaceholder =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none';";

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

// Add the CSP placeholder after auditing all third-party scripts, images, fonts, and Supabase domains.
export const recommendedContentSecurityPolicy: SecurityHeader = {
  key: "Content-Security-Policy",
  value: contentSecurityPolicyHeaderPlaceholder,
};

export const productionSecurityHeaders = recommendedSecurityHeaders;
