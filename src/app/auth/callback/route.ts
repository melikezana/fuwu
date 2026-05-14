import { type NextRequest, NextResponse } from "next/server";
import { appRoutes } from "@/lib/constants/navigation";
import { createSafeRedirectUrl } from "@/lib/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSafeRedirectUrl(request: NextRequest) {
  return createSafeRedirectUrl(
    request.nextUrl.searchParams.get("next"),
    request.nextUrl.origin,
    appRoutes.providers,
  );
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
