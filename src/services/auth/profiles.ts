import type { SupabaseClient, User } from "@supabase/supabase-js";
import { handleServiceError } from "@/lib/errors";
import { logInfo } from "@/lib/logger";
import type { Database } from "@/lib/supabase/types";

type AuthProfileSupabaseClient = SupabaseClient<Database>;
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];

const profileEnsureErrorMessage =
  "Giriş bilgileri şu anda hazırlanamadı. Lütfen tekrar deneyin.";

export async function ensureProfileForUser(
  supabase: AuthProfileSupabaseClient,
  user: Pick<User, "id">,
) {
  const { data: existingProfile, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (lookupError) {
    throw handleServiceError(lookupError, {
      logContext: "Auth profile lookup failed.",
      publicMessage: profileEnsureErrorMessage,
    });
  }

  if (existingProfile?.id) {
    return;
  }

  const profile: ProfileInsert = {
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

