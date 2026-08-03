import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type VerificationCodeSupabaseClient = SupabaseClient<Database>;

const verificationCodeMinimum = 100000;
const verificationCodeRange = 900000;

export function generateCustomerVerificationCode() {
  const randomValue =
    typeof globalThis.crypto !== "undefined" && "getRandomValues" in globalThis.crypto
      ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0] % verificationCodeRange
      : Math.floor(Math.random() * verificationCodeRange);

  return String(randomValue + verificationCodeMinimum).padStart(6, "0");
}

export function normalizeCustomerVerificationCode(value: string | null | undefined) {
  return value?.replace(/\D/g, "").slice(0, 6) ?? "";
}

export async function generateUniqueCustomerVerificationCode(
  supabase: VerificationCodeSupabaseClient,
) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateCustomerVerificationCode();
    const { data, error } = await supabase
      .from("service_requests")
      .select("id")
      .eq("confirmation_code", code)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[Fuwu] Verification code uniqueness check failed.", { error });
      return code;
    }

    if (!data?.id) {
      return code;
    }
  }

  return generateCustomerVerificationCode();
}
