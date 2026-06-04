import type { SupabaseClient, User } from "@supabase/supabase-js";
import { handleServiceError } from "@/lib/errors";
import { logInfo } from "@/lib/logger";
import type { Database } from "@/lib/supabase/types";
import { sanitizeText } from "@/lib/validations";

type AuthProfileSupabaseClient = SupabaseClient<Database>;
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];

const profileEnsureErrorMessage =
  "Giriş bilgileri şu anda hazırlanamadı. Lütfen tekrar deneyin.";

function getMetadataString(metadata: unknown, keys: readonly string[]) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const record = metadata as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string") {
      const sanitizedValue = sanitizeText(value, 120);

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

export async function ensureProfileForUser(
  supabase: AuthProfileSupabaseClient,
  user: Pick<User, "id" | "user_metadata">,
) {
  const metadataName = getAuthUserMetadataName(user);
  const { data: existingProfile, error: lookupError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (lookupError) {
    throw handleServiceError(lookupError, {
      logContext: "Auth profile lookup failed.",
      publicMessage: profileEnsureErrorMessage,
    });
  }

  if (existingProfile?.id) {
    if (!sanitizeText(existingProfile.full_name ?? "", 120) && metadataName) {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: metadataName })
        .eq("id", user.id);

      if (error) {
        throw handleServiceError(error, {
          logContext: "Auth profile display name update failed.",
          publicMessage: profileEnsureErrorMessage,
        });
      }
    }

    return;
  }

  const profile: ProfileInsert = {
    full_name: metadataName,
    id: user.id,
    role: "customer",
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(profile, {
      ignoreDuplicates: true,
      onConflict: "id",
    });

  if (error) {
    throw handleServiceError(error, {
      logContext: "Auth profile creation failed.",
      publicMessage: profileEnsureErrorMessage,
    });
  }

  logInfo("Auth profile ensured.", {
    created: true,
    role: profile.role,
  });
}
