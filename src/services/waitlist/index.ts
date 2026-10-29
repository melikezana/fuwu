import { getServerAuthContext } from "@/services/auth/server";
import { INTEREST_CONSENT_VERSION } from "@/lib/prelaunch";
import { isUuid } from "@/lib/utils/validation";

export async function getWaitlistContext() {
  const { supabase, user } = await getServerAuthContext();
  if (!supabase) return { available: false, email: "", authenticated: false };
  const { data, error } = await supabase.rpc("launch_interest_health", {}).abortSignal(AbortSignal.timeout(5000));
  const available = !error && Boolean(data && typeof data === "object" && !Array.isArray(data) && data.available === true && data.version === 1);
  return { available, email: user?.email ?? "", authenticated: Boolean(user && user.email_confirmed_at) };
}

export async function saveWaitlistPreference(input: { districtId: string; categoryId: string; consent: boolean; version: string; website: string }) {
  if (input.website || input.consent !== true || input.version !== INTEREST_CONSENT_VERSION ||
    (input.districtId && !isUuid(input.districtId)) || (input.categoryId && !isUuid(input.categoryId))) {
    return { ok: false, message: "Tercihlerini ve iletişim iznini kontrol et." };
  }
  const { supabase, user } = await getServerAuthContext();
  if (!supabase || !user?.email_confirmed_at) return { ok: false, message: "Doğrulanmış e-posta hesabınla giriş yap." };
  const { data, error } = await supabase.rpc("save_launch_interest", { p_district_id: input.districtId || null, p_category_id: input.categoryId || null, p_consent: true, p_version: INTEREST_CONSENT_VERSION }).abortSignal(AbortSignal.timeout(8000));
  if (error || !isUuid(data ?? "")) return { ok: false, message: error?.message === "rate_limited" ? "Çok sık denedin. Bir saat sonra yeniden dene." : "Kayıt doğrulanamadı. Lütfen yeniden dene." };
  return { ok: true, message: "Açılış bilgilendirme tercihin kaydedildi." };
}

export async function withdrawWaitlistPreference() {
  const { supabase, user } = await getServerAuthContext();
  if (!supabase || !user) return { ok: false, message: "İznini yönetmek için giriş yap." };
  const { data, error } = await supabase.rpc("withdraw_launch_interest", {}).abortSignal(AbortSignal.timeout(8000));
  return error || data !== true ? { ok: false, message: "İzin geri çekilemedi. Lütfen yeniden dene." } : { ok: true, message: "Açılış bilgilendirme iznin geri çekildi." };
}
