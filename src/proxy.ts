import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { createContentSecurityPolicyHeaderValue } from "@/lib/security/securityHeaders";
import type { Database } from "@/lib/supabase/types";

const PROTECTED_PATHS = [
  "/admin",
  "/provider-dashboard",
  "/account",
  "/dashboard",
  "/order-tracking",
];

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

function createRequestResponse(securityContext: RequestSecurityContext) {
  return applySecurityHeaders(
    NextResponse.next({
      request: {
        headers: securityContext.requestHeaders,
      },
    }),
    securityContext,
  );
}

function createLoginRedirect(
  request: NextRequest,
  securityContext: RequestSecurityContext,
) {
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const redirectUrl = new URL(buildLoginRedirectUrl(nextPath), request.url);

  return applySecurityHeaders(NextResponse.redirect(redirectUrl), securityContext);
}

export async function proxy(request: NextRequest) {
  const securityContext = createRequestSecurityContext(request);
  const isProtected = PROTECTED_PATHS.some(
    (path) =>
      request.nextUrl.pathname === path ||
      request.nextUrl.pathname.startsWith(`${path}/`),
  );

  if (!isProtected) {
    return createRequestResponse(securityContext);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return createLoginRedirect(request, securityContext);
  }

  let response = createRequestResponse(securityContext);

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        securityContext.requestHeaders.set("cookie", request.cookies.toString());
        response = createRequestResponse(securityContext);
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createLoginRedirect(request, securityContext);
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
