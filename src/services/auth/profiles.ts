import type { SupabaseClient, User } from "@supabase/supabase-js";
import { handleServiceError } from "@/lib/errors";
import { logInfo } from "@/lib/logger";
import type { Database } from "@/lib/supabase/types";
import { sanitizePhone, sanitizeText } from "@/lib/validations";

type AuthProfileSupabaseClient = SupabaseClient<Database>;
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
type ProfileRecord = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "full_name" | "id" | "phone" | "avatar_url"
>;
type SupabaseErrorRecord = {
  code?: unknown;
  details?: unknown;
  hint?: unknown;
  message?: unknown;
};

export type EnsureProfileDetails = {
  fullName?: string | null;
  phone?: string | null;
  preserveExistingPhone?: boolean;
};

const profileEnsureErrorMessage =
  "Hesap bilgilerin doğrulanamadı. Lütfen tekrar giriş yap.";

function getMetadataString(metadata: unknown, keys: readonly string[], maxLength = 120) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const record = metadata as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string") {
      const sanitizedValue = sanitizeText(value, maxLength);

      if (sanitizedValue) {
        return sanitizedValue;
      }
    }
  }

  return null;
}

export function getAuthUserMetadataName(user: Pick<User, "user_metadata">) {
  return getMetadataString(user.user_metadata, ["full_name", "name"]);
}

function getSupabaseDebugValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function getSupabaseDebugPayload(error: unknown) {
  const record =
    typeof error === "object" && error !== null
      ? (error as SupabaseErrorRecord)
      : {};

  return {
    code: getSupabaseDebugValue(record.code),
    details: getSupabaseDebugValue(record.details),
    hint: getSupabaseDebugValue(record.hint),
    message: getSupabaseDebugValue(record.message),
  };
}

function hasSupabaseErrorCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as SupabaseErrorRecord).code === code
  );
}

function logProfileSupabaseError(context: string, error: unknown) {
  console.error(`[Fuwu] ${context}`, getSupabaseDebugPayload(error));
}

function getProfileDetailsPatch(
  existingProfile: ProfileRecord,
  details: EnsureProfileDetails,
  metadataName: string | null,
  metadataAvatar: string | null,
) {
  const existingFullName = sanitizeText(existingProfile.full_name ?? "", 120);
  const fullName =
    sanitizeText(details.fullName ?? "", 120) || (!existingFullName ? metadataName : null);
  const phone = details.phone ? sanitizePhone(details.phone) : null;
  const existingPhone = sanitizePhone(existingProfile.phone ?? "");
  const updatePayload: ProfileUpdate = {};

  if (fullName && fullName !== existingFullName) {
    updatePayload.full_name = fullName;
  }

  if (
    phone &&
    phone !== existingPhone &&
    (!details.preserveExistingPhone || !existingPhone)
  ) {
    updatePayload.phone = phone;
  }

  const existingAvatar = existingProfile.avatar_url?.trim();
  if (!existingAvatar && metadataAvatar) {
    updatePayload.avatar_url = metadataAvatar;
  }

  return updatePayload;
}

function hasProfileUpdate(updatePayload: ProfileUpdate) {
  return Object.keys(updatePayload).length > 0;
}

async function updateOwnProfile(
  supabase: AuthProfileSupabaseClient,
  userId: string,
  existingProfile: ProfileRecord,
  details: EnsureProfileDetails,
  metadataName: string | null,
  metadataAvatar: string | null,
) {
  const updatePayload = getProfileDetailsPatch(existingProfile, details, metadataName, metadataAvatar);

  if (!hasProfileUpdate(updatePayload)) {
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", userId);

  if (error) {
    logProfileSupabaseError("Auth profile update returned Supabase error.", error);
    throw handleServiceError(error, {
      logContext: "Auth profile update failed.",
      publicMessage: profileEnsureErrorMessage,
      tableName: "profiles",
      payloadKeys: Object.keys(updatePayload),
    });
  }

  logInfo("Auth profile updated.", {
    payloadKeys: Object.keys(updatePayload),
  });
}

export async function ensureProfileForUser(
  supabase: AuthProfileSupabaseClient,
  user: Pick<User, "id" | "user_metadata">,
  details: EnsureProfileDetails = {},
) {
  const metadataName = getAuthUserMetadataName(user);
  const metadataAvatar = getMetadataString(user.user_metadata, ["avatar_url", "picture"], 500);
  const { data: existingProfile, error: lookupError } = await supabase
    .from("profiles")
    .select("id, full_name, phone, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (lookupError) {
    logProfileSupabaseError("Auth profile lookup returned Supabase error.", lookupError);
    throw handleServiceError(lookupError, {
      logContext: "Auth profile lookup failed.",
      publicMessage: profileEnsureErrorMessage,
      tableName: "profiles",
    });
  }

  if (existingProfile?.id) {
    await updateOwnProfile(supabase, user.id, existingProfile, details, metadataName, metadataAvatar);
    return;
  }

  const fullName = sanitizeText(details.fullName ?? "", 120) || metadataName;
  const phone = details.phone ? sanitizePhone(details.phone) : null;
  const profile: ProfileInsert = {
    full_name: fullName,
    id: user.id,
    phone,
    role: "customer",
    avatar_url: metadataAvatar,
  };

  const { error } = await supabase.from("profiles").insert(profile);

  if (error) {
    logProfileSupabaseError("Auth profile insert returned Supabase error.", error);

    if (hasSupabaseErrorCode(error, "23505")) {
      const { data: racedProfile, error: racedLookupError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (racedLookupError) {
        logProfileSupabaseError(
          "Auth profile lookup after insert conflict returned Supabase error.",
          racedLookupError,
        );
        throw handleServiceError(racedLookupError, {
          logContext: "Auth profile lookup after insert conflict failed.",
          publicMessage: profileEnsureErrorMessage,
          tableName: "profiles",
        });
      }

      if (racedProfile?.id) {
        await updateOwnProfile(supabase, user.id, racedProfile, details, metadataName, metadataAvatar);
        return;
      }
    }

    throw handleServiceError(error, {
      logContext: "Auth profile creation failed.",
      publicMessage: profileEnsureErrorMessage,
      tableName: "profiles",
      payloadKeys: ["id", "full_name", "phone", "role", "avatar_url"],
    });
  }

  logInfo("Auth profile ensured.", {
    created: true,
    role: profile.role,
  });
}
