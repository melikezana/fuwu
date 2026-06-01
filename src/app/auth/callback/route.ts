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
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  
  // if "next" is in param, use it as the redirect URL
  const nextPath = searchParams.get("next");
  const next = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : appRoutes.providers;

  if (code) {
    const supabase = await createSupabaseServerClient();

    if (supabase) {
      try {
        const { error, data } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.warn("[Auth Callback] Session exchange failed. Safely redirecting.", error.message);
          return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
        }
        
        if (data.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert(
              { 
                id: data.user.id, 
                full_name: data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Kullanıcı",
                role: "user"
              }, 
              { onConflict: "id", ignoreDuplicates: true }
            );

          if (profileError) {
            console.warn("[Auth Callback] Profile creation failed. Redirecting anyway.", profileError.message);
          }
        }
        
        const forwardedHost = request.headers.get("x-forwarded-host");
        const isLocalEnv = process.env.NODE_ENV === "development";
        
        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${next}`);
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`);
        } else {
          return NextResponse.redirect(`${origin}${next}`);
        }
      } catch (error) {
        console.warn("[Auth Callback] Unexpected error during session exchange. Safely redirecting.", error);
        return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
