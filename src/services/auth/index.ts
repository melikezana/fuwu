import type { Session, User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CurrentUserProfile, ProfileRole } from "@/types/auth";

export type { CurrentUserProfile, ProfileRole } from "@/types/auth";

export const adminProfileRole: ProfileRole = "admin";

const authUnavailableMessage =
  "Giriş sistemi şu anda kullanılamıyor. Ustaları giriş yapmadan inceleyebilirsin.";

function warnAuthError(message: string, error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(message, error);
  }
}

function getAuthClient() {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error(authUnavailableMessage);
  }

  return supabase;
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

export async function getCurrentUserProfile(): Promise<CurrentUserProfile | null> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    warnAuthError("Supabase current user check failed.", userError);
    return null;
  }

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

export function hasAdminRole(
  profile: Pick<CurrentUserProfile, "role"> | null | undefined,
) {
  return profile?.role === adminProfileRole;
}

export async function signInWithEmailMagicLink(email: string, redirectTo: string) {
  const supabase = getAuthClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) {
    throw error;
  }
}

export async function signInWithGoogle(redirectTo: string) {
  const supabase = getAuthClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error) {
    throw error;
  }
}
