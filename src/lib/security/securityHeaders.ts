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
const wasmEvalSource = " 'wasm-unsafe-eval'";

function compactContentSecurityPolicy(directives: string[]) {
  return directives.join("; ").replace(/\s{2,}/g, " ").trim();
}

export function createContentSecurityPolicyHeaderValue(nonce: string) {
  const nonceSource = `'nonce-${nonce}'`;
  const contentSecurityPolicyDirectives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    `script-src 'self' ${nonceSource} 'strict-dynamic'${wasmEvalSource}${developmentEvalSource}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    `img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com${localSupabaseHttpSources}`,
    `connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co${localSupabaseConnectSources}`,
    "form-action 'self' https://*.supabase.co https://accounts.google.com",
    "frame-src 'self' https://*.supabase.co https://accounts.google.com",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];

  return compactContentSecurityPolicy(contentSecurityPolicyDirectives);
}

export const contentSecurityPolicyHeaderPlaceholder =
  createContentSecurityPolicyHeaderValue("{{nonce}}");

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
    value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

export const recommendedContentSecurityPolicy: SecurityHeader = {
  key: "Content-Security-Policy",
  value: contentSecurityPolicyHeaderPlaceholder,
};

export const productionSecurityHeaders = [
  ...recommendedSecurityHeaders,
];
