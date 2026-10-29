import { withCommerceApi } from "@/lib/commerce/api";
import { type NextRequest, NextResponse } from "next/server";
import { checkApiRateLimit, getApiRateLimitHeaders, getRequestOrigin } from "@/lib/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseSessionCookie } from "@/lib/auth/session-cookies";
import { logWarn } from "@/lib/logger";

async function handlePOST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== getRequestOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rateLimit = await checkApiRateLimit(request, {
    action: "api.auth.logout",
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "rate_limit",
        message: "Çok fazla çıkış isteği gönderildi. Lütfen biraz sonra tekrar deneyin.",
      },
      {
        headers: getApiRateLimitHeaders(rateLimit),
        status: 429,
      },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (supabase) {
      await supabase.auth.signOut();
    }
  } catch {
    logWarn("Remote sign-out could not be verified; local session cleared.");
  }

  const response = NextResponse.redirect(new URL("/", getRequestOrigin(request)), {
    status: 303,
    headers: { "Cache-Control": "private, no-store", "Clear-Site-Data": '"storage"' },
  });
  // Local sign-out must work even if remote refresh-token revocation is unavailable.
  for (const { name } of request.cookies.getAll()) {
    if (isSupabaseSessionCookie(name)) response.cookies.set(name, "", { maxAge: 0, path: "/", sameSite: "lax" });
  }
  return response;
}

export const POST = withCommerceApi(handlePOST);
