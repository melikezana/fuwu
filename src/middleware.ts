import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import type { Database } from "@/lib/supabase/types";

function createRequestResponse(request: NextRequest) {
  return NextResponse.next({
    request,
  });
}

function createLoginRedirect(request: NextRequest) {
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const redirectUrl = new URL(buildLoginRedirectUrl(nextPath), request.url);

  return NextResponse.redirect(redirectUrl);
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return createLoginRedirect(request);
  }

  let response = createRequestResponse(request);

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = createRequestResponse(request);
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
    return createLoginRedirect(request);
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/provider-dashboard/:path*",
    "/account/:path*",
    "/dashboard/:path*",
  ],
};
