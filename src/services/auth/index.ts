import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { AuthError, handleServiceError, ValidationError } from "@/lib/errors";
import { appRoutes } from "@/lib/constants/navigation";
import { getSafeRedirectPath } from "@/lib/security";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { validateLoginEmailInput } from "@/lib/validations";
import type { CurrentUserProfile } from "@/types/auth";
import { authAccessMessages } from "./constants";

export type { CurrentUserProfile, ProfileRole } from "@/types/auth";
export {
  adminProfileRole,
  authAccessMessages,
  hasAdminRole,
  hasProviderRole,
  hasRole,
  profileRoles,
  providerProfileRole,
} from "./constants";

const authUnavailableMessage =
  "Giriş sistemi şu anda kullanılamıyor. Ustaları giriş yapmadan inceleyebilirsin.";

type AuthSupabaseClient = SupabaseClient<Database>;

function warnAuthError(message: string, error: unknown) {
  handleServiceError(error, {
    logContext: message,
    publicMessage: authAccessMessages.profileUnavailable,
  });
}

function getAuthClient() {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new AuthError("Supabase auth is not configured.", {
      publicMessage: authUnavailableMessage,
      statusCode: 503,
    });
  }

  return supabase;
}

async function getCurrentUserForClient(
  supabase: AuthSupabaseClient,
): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    warnAuthError("Supabase current user check failed.", error);
    return null;
  }

  return user;
}

function sanitizeAuthRedirectUrl(redirectTo: string) {
  try {
    const redirectUrl = new URL(redirectTo);
    const safeNextPath = getSafeRedirectPath(
      redirectUrl.searchParams.get("next"),
      appRoutes.providers,
    );

    redirectUrl.searchParams.set("next", safeNextPath);
    return redirectUrl.toString();
  } catch {
    return redirectTo;
  }
}

export async function getSession(): Promise<Session | null> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    warnAuthError("Supabase session check failed.", error);
    return null;
  }

  return data.session;
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  return getCurrentUserForClient(supabase);
}

export async function getCurrentUserProfile(): Promise<CurrentUserProfile | null> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const user = await getCurrentUserForClient(supabase);

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    warnAuthError("Supabase profile role check failed.", error);
    return null;
  }

  return data as CurrentUserProfile | null;
}

export async function signInWithEmailMagicLink(email: string, redirectTo: string) {
  const validationResult = validateLoginEmailInput(email);

  if (!validationResult.ok) {
    throw new ValidationError("Login email validation failed.", {
      publicMessage: validationResult.message,
    });
  }

  const supabase = getAuthClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: validationResult.data.email,
    options: {
      emailRedirectTo: sanitizeAuthRedirectUrl(redirectTo),
      shouldCreateUser: true,
    },
  });

  if (error) {
    throw handleServiceError(error, {
      logContext: "Supabase magic link sign-in failed.",
      publicMessage: "Giriş bağlantısı şu anda gönderilemedi. Lütfen tekrar dene.",
    });
  }
}

export async function signInWithGoogle(redirectTo: string) {
  const supabase = getAuthClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: sanitizeAuthRedirectUrl(redirectTo),
    },
  });

  if (error) {
    throw handleServiceError(error, {
      logContext: "Supabase Google sign-in failed.",
      publicMessage: "Google girişi şu anda açılamıyor. Lütfen tekrar dene.",
    });
  }
}
