import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getPublicErrorMessage, handleServiceError } from "@/lib/errors";
import {
  createSupabaseServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { CurrentUserProfile } from "@/types/auth";
import { authAccessMessages } from "./constants";
import { ensureProfileForUser } from "./profiles";

type ServerAuthSupabaseClient = SupabaseClient<Database>;

export type ServerAuthContext = {
  error: string | null;
  isConfigured: boolean;
  profile: CurrentUserProfile | null;
  supabase: ServerAuthSupabaseClient | null;
  user: User | null;
};

const currentUserProfileSelect = "id, full_name, phone, role, avatar_url";

function getMetadataString(metadata: unknown, keys: readonly string[]) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const record = metadata as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

function getAuthUserPhone(user: Pick<User, "phone" | "user_metadata">) {
  return user.phone ?? getMetadataString(user.user_metadata, ["phone", "phone_number"]);
}

function warnServerAuthError(context: string, error: unknown) {
  const appError = handleServiceError(error, {
    logContext: context,
    publicMessage: authAccessMessages.profileUnavailable,
  });

  return getPublicErrorMessage(appError, authAccessMessages.profileUnavailable);
}

async function getServerUser(supabase: ServerAuthSupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    if (error.message === "Auth session missing!") {
      return {
        error: authAccessMessages.loginRequired,
        user: null,
      };
    }

    return {
      error: warnServerAuthError("Supabase server user check failed.", error),
      user: null,
    };
  }

  return {
    error: null,
    user,
  };
}

async function getServerProfile(
  supabase: ServerAuthSupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select(currentUserProfileSelect)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return {
      error: warnServerAuthError("Supabase server profile lookup failed.", error),
      profile: null,
    };
  }

  return {
    error: null,
    profile: data as CurrentUserProfile | null,
  };
}

export async function getServerAuthContext(): Promise<ServerAuthContext> {
  if (!isSupabaseServerConfigured) {
    return {
      error: authAccessMessages.loginRequired,
      isConfigured: false,
      profile: null,
      supabase: null,
      user: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      error: authAccessMessages.loginRequired,
      isConfigured: false,
      profile: null,
      supabase: null,
      user: null,
    };
  }

  const userResult = await getServerUser(supabase);

  if (!userResult.user) {
    return {
      error: userResult.error,
      isConfigured: true,
      profile: null,
      supabase,
      user: null,
    };
  }

  try {
    await ensureProfileForUser(supabase, userResult.user, {
      phone: getAuthUserPhone(userResult.user),
      preserveExistingPhone: true,
    });
  } catch (error) {
    return {
      error: warnServerAuthError("Supabase server profile ensure failed.", error),
      isConfigured: true,
      profile: null,
      supabase,
      user: userResult.user,
    };
  }

  const profileResult = await getServerProfile(supabase, userResult.user.id);

  return {
    error: profileResult.error,
    isConfigured: true,
    profile: profileResult.profile,
    supabase,
    user: userResult.user,
  };
}

export async function getCurrentServerUser() {
  const authContext = await getServerAuthContext();

  return authContext.user;
}

export async function getCurrentServerUserProfile() {
  const authContext = await getServerAuthContext();

  return authContext.profile;
}

export async function getAuthenticatedServerUserId() {
  const user = await getCurrentServerUser();

  return user?.id ?? null;
}
