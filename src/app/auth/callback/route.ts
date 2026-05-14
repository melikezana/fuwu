import { type NextRequest, NextResponse } from "next/server";
import { appRoutes } from "@/lib/constants/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSafeRedirectUrl(request: NextRequest) {
  const nextPath = request.nextUrl.searchParams.get("next");

  if (!nextPath?.startsWith("/") || nextPath.startsWith("//")) {
    return new URL(appRoutes.providers, request.nextUrl.origin);
  }

  return new URL(nextPath, request.nextUrl.origin);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const redirectUrl = getSafeRedirectUrl(request);

  if (code) {
    const supabase = await createSupabaseServerClient();

    if (supabase) {
      await supabase.auth.exchangeCodeForSession(code);
    }
  }

  return NextResponse.redirect(redirectUrl);
}
