import { type NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { appRoutes } from "@/lib/constants/navigation";
import { logWarn } from "@/lib/logger";
import { createSafeRedirectUrl } from "@/lib/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { ensureProfileForUser } from "@/services/auth/profiles";

function getSafeRedirectUrl(request: NextRequest) {
  return createSafeRedirectUrl(
    request.nextUrl.searchParams.get("next"),
    request.nextUrl.origin,
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
        } else {
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError) {
            const safeError = userError as { code?: string; status?: number };
            logWarn("Auth callback user lookup failed. Safely redirecting.", {
              code: safeError.code,
              status: safeError.status,
            });
          } else if (user) {
            await ensureProfileForUser(supabase, user);
            await bindLegacyProviderApplications(supabase);
          }
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
