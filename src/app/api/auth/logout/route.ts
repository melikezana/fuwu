import { type NextRequest, NextResponse } from "next/server";
import { checkApiRateLimit, getApiRateLimitHeaders } from "@/lib/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const rateLimit = await checkApiRateLimit(request, {
    action: "api.auth.logout",
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
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
  } catch (err) {
    console.error("[Auth API] Sign out failed:", err);
  }

  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL ?? "https://fuwu-nine.vercel.app"), {
    status: 303,
  });
}
