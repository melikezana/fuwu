import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/types";
import { createContentSecurityPolicyHeaderValue } from "@/lib/security/securityHeaders";
import { writeAuditLog } from "@/services/audit";

const PROTECTED_PATHS = [
  "/admin",
  "/provider-dashboard",
  "/account",
  "/dashboard",
];

const APP_ROLE_VALUES = new Set(["admin", "customer", "provider"]);

type AdminClaimCheck = {
  found: boolean;
  isAdmin: boolean;
  role: string | null;
  source: string | null;
};

type RequestSecurityContext = {
  contentSecurityPolicy: string;
  nonce: string;
  requestHeaders: Headers;
};

function createNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  return btoa(String.fromCharCode(...bytes));
}

function createRequestSecurityContext(request: NextRequest): RequestSecurityContext {
  const nonce = createNonce();
  const contentSecurityPolicy = createContentSecurityPolicyHeaderValue(nonce);
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  return {
    contentSecurityPolicy,
    nonce,
    requestHeaders,
  };
}

function applySecurityHeaders<TResponse extends NextResponse>(
  response: TResponse,
  securityContext: RequestSecurityContext,
) {
  response.headers.set("Content-Security-Policy", securityContext.contentSecurityPolicy);
  response.headers.set("x-nonce", securityContext.nonce);

  return response;
}

function nextWithSecurityHeaders(securityContext: RequestSecurityContext) {
  return applySecurityHeaders(
    NextResponse.next({
      request: {
        headers: securityContext.requestHeaders,
      },
    }),
    securityContext,
  );
}

function redirectWithSecurityHeaders(
  url: string | URL,
  securityContext: RequestSecurityContext,
) {
  return applySecurityHeaders(NextResponse.redirect(url), securityContext);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  const [, payload] = accessToken.split(".");

  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(decoded) as unknown;

    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getAdminClaimFromRecord(
  record: Record<string, unknown> | null,
  source: string,
): AdminClaimCheck {
  if (!record) {
    return {
      found: false,
      isAdmin: false,
      role: null,
      source: null,
    };
  }

  if (typeof record.is_admin === "boolean") {
    return {
      found: true,
      isAdmin: record.is_admin,
      role: null,
      source: `${source}.is_admin`,
    };
  }

  for (const key of ["role", "user_role"]) {
    const value = record[key];

    if (typeof value === "string" && APP_ROLE_VALUES.has(value)) {
      return {
        found: true,
        isAdmin: value === "admin",
        role: value,
        source: `${source}.${key}`,
      };
    }
  }

  return {
    found: false,
    isAdmin: false,
    role: null,
    source: null,
  };
}

function getAdminClaimFromJwt(accessToken: string): AdminClaimCheck {
  const claims = decodeJwtPayload(accessToken);
  const appMetadata = claims && isRecord(claims.app_metadata) ? claims.app_metadata : null;
  const userMetadata = claims && isRecord(claims.user_metadata) ? claims.user_metadata : null;
  const claimSources: Array<[Record<string, unknown> | null, string]> = [
    [claims, "claims"],
    [appMetadata, "claims.app_metadata"],
    [userMetadata, "claims.user_metadata"],
  ];

  for (const [record, source] of claimSources) {
    const result = getAdminClaimFromRecord(record, source);

    if (result.found) {
      return result;
    }
  }

  return {
    found: false,
    isAdmin: false,
    role: null,
    source: null,
  };
}

async function writeUnauthorizedAdminAuditLog({
  claimSource,
  path,
  reason,
  role,
  supabase,
  user,
}: {
  claimSource?: string | null;
  path: string;
  reason: string;
  role?: string | null;
  supabase: SupabaseClient<Database>;
  user: User;
}) {
  await writeAuditLog(
    {
      action: "security.unauthorized_action",
      actorUserId: user.id,
      entityId: null,
      entityType: "security_event",
      metadata: {
        claimSource: claimSource ?? null,
        path,
        reason,
        role: role ?? null,
        scope: "admin_middleware",
      } satisfies Json,
    },
    supabase,
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const securityContext = createRequestSecurityContext(request);
  const response = nextWithSecurityHeaders(securityContext);

  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!isProtected) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("next", pathname);
    return redirectWithSecurityHeaders(loginUrl, securityContext);
  }

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (!isAdminRoute) {
    return response;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const claimCheck = session?.access_token
    ? getAdminClaimFromJwt(session.access_token)
    : {
        found: false,
        isAdmin: false,
        role: null,
        source: null,
      };

  if (claimCheck.found) {
    if (claimCheck.isAdmin) {
      return response;
    }

    await writeUnauthorizedAdminAuditLog({
      claimSource: claimCheck.source,
      path: pathname,
      reason: "admin_jwt_claim_denied",
      role: claimCheck.role,
      supabase,
      user,
    });

    return redirectWithSecurityHeaders(new URL("/dashboard", request.nextUrl.origin), securityContext);
  }

  const { data: isAdmin, error: adminRoleError } = await supabase.rpc(
    "current_user_is_admin",
  );

  if (adminRoleError || !isAdmin) {
    await writeUnauthorizedAdminAuditLog({
      path: pathname,
      reason: adminRoleError ? "admin_role_rpc_error" : "admin_role_rpc_denied",
      supabase,
      user,
    });

    return redirectWithSecurityHeaders(new URL("/dashboard", request.nextUrl.origin), securityContext);
  }

  return response;
}

export const config = {
  matcher: [
    {
      missing: [
        { key: "next-router-prefetch", type: "header" },
        { key: "purpose", type: "header", value: "prefetch" },
      ],
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
    },
  ],
};
