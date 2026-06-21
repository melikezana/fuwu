import { type NextRequest, NextResponse } from "next/server";
import { checkApiRateLimit, getApiRateLimitHeaders } from "@/lib/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthUserMetadataName } from "@/services/auth/profiles";

function authJson(body: Record<string, unknown>, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export async function GET(request: NextRequest) {
  const rateLimit = await checkApiRateLimit(request, {
    action: "api.auth.user",
    limit: 60,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return authJson(
      {
        authenticated: false,
        message: "Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin.",
      },
      {
        headers: getApiRateLimitHeaders(rateLimit),
        status: 429,
      },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return authJson({ authenticated: false }, { status: 401 });
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return authJson({ authenticated: false }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, phone, role")
      .eq("id", user.id)
      .maybeSingle();

    const displayName =
      profile?.full_name?.trim() ||
      getAuthUserMetadataName(user) ||
      user.email ||
      "Hesabım";

    return authJson({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
      },
      profile: {
        id: user.id,
        full_name: displayName,
        phone: profile?.phone ?? null,
        role: profile?.role ?? "customer",
      },
    });
  } catch (err) {
    console.error("[Auth API] Session check failed:", err);
    return authJson({ authenticated: false }, { status: 500 });
  }
}
