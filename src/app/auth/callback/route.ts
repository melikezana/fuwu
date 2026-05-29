import { type NextRequest, NextResponse } from "next/server";
import { appRoutes } from "@/lib/constants/navigation";
import { logWarn } from "@/lib/logger";
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
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          const safeError = error as { code?: string; status?: number };
          logWarn("Auth callback session exchange failed. Safely redirecting.", {
            code: safeError.code,
            status: safeError.status,
          });
        }
      } catch (error) {
        logWarn("Auth callback unexpected session exchange failure. Safely redirecting.", {
          error,
        });
      }
    }
  }

  return NextResponse.redirect(redirectUrl);
}
