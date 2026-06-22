import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { AuthError, handleServiceError, ValidationError } from "@/lib/errors";
import { appRoutes } from "@/lib/constants/navigation";
import { getSafeRedirectPath } from "@/lib/security";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { validateLoginEmailInput, validateLoginPhoneInput, validateLoginOtpInput } from "@/lib/validations";
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

export { hasRole as getUserRole } from "./constants";

const authUnavailableMessage =
  "Giriş sistemi şu anda kullanılamıyor. Ustaları giriş yapmadan inceleyebilirsin.";

type AuthSupabaseClient = SupabaseClient<Database>;

function warnAuthError(message: string, error: unknown) {
  handleServiceError(error, {
    logContext: message,
    publicMessage: authAccessMessages.profileUnavailable,
  });
}

function isMissingAuthSession(error: unknown) {
  const candidate = error as { code?: string; message?: string; name?: string } | null;

  return Boolean(
    candidate &&
      (candidate.name === "AuthSessionMissingError" ||
        candidate.code === "session_not_found" ||
        candidate.message?.toLocaleLowerCase("en").includes("auth session missing")),
  );
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

function createFallbackProfileFromUser(user: User): CurrentUserProfile {
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : user.email ?? "Hesabım";

  return {
    id: user.id,
    full_name: fullName,
    phone: user.phone ?? null,
    role: "customer",
  };
}

async function getCurrentUserForClient(
  supabase: AuthSupabaseClient,
): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    if (isMissingAuthSession(error)) {
      return null;
    }

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
      appRoutes.account,
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

export const getCurrentSession = getSession;

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  return getCurrentUserForClient(supabase);
}

export async function signOut(): Promise<void> {
  const supabase = getAuthClient();
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    warnAuthError("Supabase sign out failed.", error);
  }
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

  const fallbackProfile = createFallbackProfileFromUser(user);

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    warnAuthError("Supabase profile role check failed. Falling back to auth user.", error);
    return fallbackProfile;
  }

  if (!data) {
    return fallbackProfile;
  }

  return {
    id: data.id,
    full_name: data.full_name ?? fallbackProfile.full_name,
    phone: data.phone ?? fallbackProfile.phone,
    role: data.role ?? fallbackProfile.role,
  } as CurrentUserProfile;
}

export const getCurrentProfile = getCurrentUserProfile;

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

export async function signInWithPhoneOtp(phone: string) {
  const validationResult = validateLoginPhoneInput(phone);

  if (!validationResult.ok) {
    throw new ValidationError("Login phone validation failed.", {
      publicMessage: validationResult.fieldErrors.phone ?? "Geçerli bir telefon numarası girin.",
    });
  }

  const supabase = getAuthClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone: validationResult.data.phone,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    throw handleServiceError(error, {
      logContext: "Supabase phone OTP sign-in failed.",
      publicMessage: "Telefonla giriş şu anda aktif değil. Lütfen e-posta veya Google ile devam edin.",
    });
  }
}

export async function verifyPhoneOtp(phone: string, token: string) {
  const phoneValidationResult = validateLoginPhoneInput(phone);
  const otpValidationResult = validateLoginOtpInput(token);

  if (!phoneValidationResult.ok) {
    throw new ValidationError("Login phone validation failed.", {
      publicMessage: phoneValidationResult.fieldErrors.phone ?? "Geçerli bir telefon numarası girin.",
    });
  }

  if (!otpValidationResult.ok) {
    throw new ValidationError("Login OTP validation failed.", {
      publicMessage: otpValidationResult.fieldErrors.otp ?? "Lütfen 6 haneli kodu girin.",
    });
  }

  const supabase = getAuthClient();
  const { error } = await supabase.auth.verifyOtp({
    phone: phoneValidationResult.data.phone,
    token: otpValidationResult.data.otp,
    type: "sms",
  });

  if (error) {
    throw handleServiceError(error, {
      logContext: "Supabase phone OTP verification failed.",
      publicMessage: "Girdiğiniz kod hatalı veya süresi dolmuş. Lütfen tekrar deneyin.",
    });
  }
}
