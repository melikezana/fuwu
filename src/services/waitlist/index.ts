import { getServerAuthContext } from "@/services/auth/server";
import { LAUNCH_MARKETING_VERSION, LAUNCH_NOTICE_VERSION } from "@/lib/legal/notices";
import { isUuid } from "@/lib/utils/validation";

export type WaitlistEntry = { districtId: string; categoryId: string; marketingEmail: boolean };
export type WaitlistContext = { available: boolean; marketingEmailAvailable: boolean; email: string; authenticated: boolean; entry: WaitlistEntry | null };

async function readOwnEntry(supabase: NonNullable<Awaited<ReturnType<typeof getServerAuthContext>>["supabase"]>, userId: string): Promise<WaitlistEntry | null> {
  try {
    // RLS sahibine kendi satırını gösterir; admin hesabında başkalarının satırı gelmesin diye kullanıcıyla da süzülür.
    const { data, error } = await supabase.from("launch_interest").select("district_id,category_id,marketing_email_consent,withdrawn_at").eq("user_id", userId).abortSignal(AbortSignal.timeout(5000)).maybeSingle();
    if (error || !data || data.withdrawn_at) return null;
    return { districtId: data.district_id ?? "", categoryId: data.category_id ?? "", marketingEmail: data.marketing_email_consent === true };
  } catch {
    return null;
  }
}

export async function getWaitlistContext(): Promise<WaitlistContext> {
  const { supabase, user } = await getServerAuthContext();
  if (!supabase) return { available: false, marketingEmailAvailable: false, email: "", authenticated: false, entry: null };
  const authenticated = Boolean(user?.email_confirmed_at);
  const context: WaitlistContext = { available: false, marketingEmailAvailable: false, email: user?.email ?? "", authenticated, entry: null };
  const entryPromise = authenticated && user ? readOwnEntry(supabase, user.id) : Promise.resolve(null);
  try {
    const { data, error } = await supabase.rpc("launch_interest_health", {}).abortSignal(AbortSignal.timeout(5000));
    const health = !error && data && typeof data === "object" && !Array.isArray(data) && data.version === 1 ? data as { available?: unknown; marketing_email?: unknown } : null;
    const available = health?.available === true;
    return { ...context, available, marketingEmailAvailable: available && health?.marketing_email === true, entry: await entryPromise };
  } catch {
    return { ...context, entry: await entryPromise };
  }
}

export type WaitlistInput = { districtId: string; categoryId: string; noticeAcknowledged: boolean; noticeVersion: string; marketingEmail: boolean; marketingVersion: string; website: string };

const saveErrors: Record<string, string> = {
  rate_limited: "Çok sık denedin. Bir saat sonra yeniden dene.",
  interest_closed: "Talep kaydı şu anda kapalı. Daha sonra yeniden dene.",
  notice_required: "Aydınlatma metnini okuduğunu işaretle.",
  marketing_closed: "E-posta onayı şu anda alınamıyor. Onay kutusunu boş bırakıp talebini kaydedebilirsin.",
  verified_email_required: "Doğrulanmış e-posta hesabınla giriş yap.",
};

export async function saveWaitlistPreference(input: WaitlistInput) {
  if (input.website || input.noticeAcknowledged !== true || input.noticeVersion !== LAUNCH_NOTICE_VERSION ||
    (input.marketingEmail && input.marketingVersion !== LAUNCH_MARKETING_VERSION) ||
    (input.districtId && !isUuid(input.districtId)) || (input.categoryId && !isUuid(input.categoryId))) {
    return { ok: false, message: input.noticeAcknowledged !== true ? saveErrors.notice_required : "Tercihlerini kontrol et." };
  }
  const { supabase, user } = await getServerAuthContext();
  if (!supabase || !user?.email_confirmed_at) return { ok: false, message: saveErrors.verified_email_required };
  try {
    const { data, error } = await supabase.rpc("save_launch_interest_v2", {
      p_district_id: input.districtId || null,
      p_category_id: input.categoryId || null,
      p_notice_version: LAUNCH_NOTICE_VERSION,
      p_notice_acknowledged: true,
      p_marketing_email: input.marketingEmail === true,
      p_marketing_version: input.marketingEmail ? LAUNCH_MARKETING_VERSION : "",
    }).abortSignal(AbortSignal.timeout(8000));
    if (error || typeof data !== "string" || !isUuid(data)) {
      const known = error?.message && Object.hasOwn(saveErrors, error.message) ? saveErrors[error.message] : null;
      return { ok: false, message: known ?? "Kayıt doğrulanamadı. Lütfen yeniden dene." };
    }
    return { ok: true, message: input.marketingEmail ? "Talebin ve e-posta onayın kaydedildi." : "Talebin kaydedildi." };
  } catch {
    return { ok: false, message: "Kayıt sonucu doğrulanamadı. Bağlantını kontrol edip yeniden dene." };
  }
}

export async function withdrawWaitlistPreference() {
  const { supabase, user } = await getServerAuthContext();
  if (!supabase || !user) return { ok: false, message: "Talebini yönetmek için giriş yap." };
  try {
    const { data, error } = await supabase.rpc("withdraw_launch_interest", {}).abortSignal(AbortSignal.timeout(8000));
    return error || data !== true ? { ok: false, message: "Talep kaldırılamadı. Lütfen yeniden dene." } : { ok: true, message: "Talebin kaldırıldı; varsa e-posta onayın da sona erdi." };
  } catch {
    return { ok: false, message: "Talep kaldırma sonucu doğrulanamadı. Lütfen yeniden dene." };
  }
}

export async function withdrawWaitlistMarketingConsent() {
  const { supabase, user } = await getServerAuthContext();
  if (!supabase || !user) return { ok: false, message: "Onayını yönetmek için giriş yap." };
  try {
    const { data, error } = await supabase.rpc("withdraw_launch_marketing_consent", {}).abortSignal(AbortSignal.timeout(8000));
    return error || data !== true ? { ok: false, message: "E-posta onayı geri çekilemedi. Lütfen yeniden dene." } : { ok: true, message: "E-posta onayın geri çekildi. Talebin kayıtlı kalmaya devam ediyor." };
  } catch {
    return { ok: false, message: "Geri çekme sonucu doğrulanamadı. Lütfen yeniden dene." };
  }
}
