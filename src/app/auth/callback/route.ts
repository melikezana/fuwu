import { type NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { appRoutes } from "@/lib/constants/navigation";
import { logWarn } from "@/lib/logger";
import { createSafeRedirectUrl, getRequestOrigin } from "@/lib/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { ensureProfileForUser } from "@/services/auth/profiles";
import { completeOAuthSignIn, type OAuthErrorCode } from "@/lib/auth/oauth";

function getSafeRedirectUrl(request: NextRequest) {
  return createSafeRedirectUrl(
    request.nextUrl.searchParams.get("next"),
    getRequestOrigin(request),
    appRoutes.account,
  );
}

async function bindLegacyProviderApplications(
  supabase: SupabaseClient<Database>,
) {
  try {
    const { error } = await supabase.rpc(
      "bind_provider_applications_to_current_user",
    );

    if (error) {
      logWarn("Auth callback provider application binding failed.", {
        code: error.code,
        message: error.message,
      });
    }
  } catch (error) {
    logWarn("Auth callback provider application binding threw.", {
      error,
    });
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const redirectUrl = getSafeRedirectUrl(request);
  let failure: OAuthErrorCode | null = request.nextUrl.searchParams.has("error") || !code ? "oauth_denied" : null;
  if (!failure && code) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) failure = "oauth_unavailable";
    else {
      let verifiedUser: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
      failure = await completeOAuthSignIn({
        exchange: async () => !(await supabase.auth.exchangeCodeForSession(code)).error,
        verifyUser: async () => {
          const { data, error } = await supabase.auth.getUser();
          verifiedUser = data.user;
          return !error && Boolean(verifiedUser);
        },
        ensureProfile: async () => {
          if (!verifiedUser) throw new Error("missing_verified_user");
          await ensureProfileForUser(supabase, verifiedUser);
          await bindLegacyProviderApplications(supabase);
        },
      });
    }
  }
  if (failure) {
    logWarn("OAuth callback did not complete.", { code: failure });
    const login = new URL("/login", getRequestOrigin(request));
    login.searchParams.set("next", redirectUrl.pathname + redirectUrl.search + redirectUrl.hash);
    login.searchParams.set("error", failure);
    return NextResponse.redirect(login, { headers: { "Cache-Control": "private, no-store" } });
  }
  return NextResponse.redirect(redirectUrl, { headers: { "Cache-Control": "private, no-store" } });
}
