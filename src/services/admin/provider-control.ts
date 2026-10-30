import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";
import { isUuid } from "@/lib/utils/validation";
import { isProviderControlAction, providerControlError, type ProviderControlInput, type ProviderControlResult } from "@/lib/providers/control";
export type ProviderDirectoryRow = {
 id: string; name: string; category: string | null; district: string | null; phone: string; whatsapp: string | null; description: string | null; average_price_min: number | null; average_price_max: number | null; working_hours: string | null; availability: string | null; response_time_minutes: number | null; profile_image_url: string | null;
 is_active: boolean; is_approved: boolean; is_verified: boolean; identity_verified: boolean; phone_verified: boolean; updated_at: string; user_id: string | null;
 status: "pending_review" | "approved" | "changes_requested" | "hidden"; record_kind: "real" | "test" | "unclassified"; fingerprint: string; version: string; review_note: string | null; reviewed_at: string | null; verification_reference: string | null; published: boolean; service_count: number; calendar_days: number; incomplete: boolean;
};
export const providerFilters = { all: "Tümü", pending: "Onay Bekleyen", published: "Yayında", hidden: "Yayından Kaldırılan", verification: "Doğrulama Bekleyen", test: "Test / Demo", incomplete: "Eksik Profil" } as const;
export type DirectoryResult = { rows: ProviderDirectoryRow[]; total: number | null; page: number; size: number; error: ProviderControlResult | null };
export type ProviderDetail = { services: { id: string; name: string; price_minor: number; duration_minutes: number; active: boolean; scope: string | null }[]; applications: { id: string; status: string; has_document: boolean }[]; history: { id: string; actor_user_id: string | null; action: string; created_at: string; metadata: Record<string, unknown> | null }[] };
export async function getProviderDirectory(search = "", filter = "all", page = 1, id?: string): Promise<DirectoryResult> {
 const empty: DirectoryResult = { rows: [], total: null, page, size: 20, error: null };
 const { supabase, user, profile } = await getServerAuthContext();
 if (!supabase || !user || !hasAdminRole(profile)) return { ...empty, error: providerControlError({ code: "42501" }) };
 try {
  const { data, error } = await supabase.rpc("admin_provider_directory", { p_search: search.slice(0, 120), p_filter: Object.hasOwn(providerFilters, filter) ? filter : "all", p_page: Math.min(100000, Math.max(1, Math.floor(page) || 1)), p_size: 20, p_provider_id: id ?? null }).abortSignal(AbortSignal.timeout(8000));
  if (error) return { ...empty, error: providerControlError(error) };
  if (!data || typeof data !== "object" || Array.isArray(data) || !Array.isArray(data.rows) || typeof data.total !== "number") return { ...empty, error: providerControlError({}) };
  return { ...empty, rows: data.rows as unknown as ProviderDirectoryRow[], total: data.total, page: Number(data.page), size: Number(data.size) };
 } catch { return { ...empty, error: providerControlError({}) }; }
}
export async function getProviderDetail(id: string): Promise<ProviderDetail | null> {
 const { supabase, user, profile } = await getServerAuthContext();
 if (!supabase || !user || !hasAdminRole(profile) || !isUuid(id)) return null;
 try {
  const { data, error } = await supabase.rpc("admin_provider_detail", { p_provider_id: id }).abortSignal(AbortSignal.timeout(8000));
  return error || !data || typeof data !== "object" || Array.isArray(data) ? null : data as unknown as ProviderDetail;
 } catch { return null; }
}
export async function runProviderControl(input: ProviderControlInput): Promise<ProviderControlResult> {
 const { supabase, user, profile } = await getServerAuthContext();
 if (!supabase || !user || !hasAdminRole(profile)) return providerControlError({ code: "42501" });
 if (!input || typeof input !== "object" || ![input.providerId, input.requestId, input.action, input.reason, input.expectedVersion].every(value => typeof value === "string") || (input.verificationReference !== undefined && typeof input.verificationReference !== "string")) return { ok: false, code: "invalid", message: "İşlem bilgileri geçersiz." };
 if (!isUuid(input.providerId) || !isUuid(input.requestId) || !isProviderControlAction(input.action) || !/^[a-f0-9]{32}$/.test(input.expectedVersion) || input.reason.trim().length < 10 || input.reason.trim().length > 1000 || (input.verificationReference?.length ?? 0) > 500) return { ok: false, code: "invalid", message: "İşlem bilgileri geçersiz. En az 10 karakterlik gerekçe yaz." };
 try {
  const { data, error } = await supabase.rpc("admin_provider_action", { p_provider_id: input.providerId, p_action: input.action, p_reason: input.reason.trim(), p_expected_version: input.expectedVersion, p_request_id: input.requestId, p_fingerprint: input.fingerprint ?? null, p_verification_reference: input.verificationReference?.trim() || null, p_record_kind: input.recordKind ?? null, p_details: input.details ?? {} }).abortSignal(AbortSignal.timeout(10000));
  if (error) {
   console.error("[FUWU] Provider control RPC failed", { providerId: input.providerId, action: input.action, requestId: input.requestId, code: error.code });
   return providerControlError(error);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return providerControlError({});
  if (data.code === "rate_limited") return providerControlError({ message: "rate_limited" });
  if (data.ok !== true || data.provider_id !== input.providerId || data.action !== input.action || typeof data.version !== "string" || typeof data.published !== "boolean") return providerControlError({});
  // A separate SELECT/RPC after the transaction must confirm the committed result.
  const verified = await supabase.rpc("admin_provider_detail", { p_provider_id: input.providerId }).abortSignal(AbortSignal.timeout(8000));
  if (verified.error) return { ok: false, code: "verification_unavailable", message: "İşlem sonucu yeniden okunamadı.", detail: "Aynı isteği tekrar deneyerek kaydedilen sonucu doğrula." };
  // Receipt replays can be older than a later admin decision; never overwrite current UI from a receipt.
  const current = verified.data && typeof verified.data === "object" && !Array.isArray(verified.data) ? verified.data.state : null;
  if (!current || typeof current !== "object" || Array.isArray(current)) return { ok: false, code: "verification_unavailable", message: "İşlem sonrası usta kaydı doğrulanamadı. Sayfayı yenile." };
  if (current.version !== data.version || current.published !== data.published) return providerControlError({ code: "40001" });
  if ((input.action === "unpublish" && (current.status !== "hidden" || current.published !== false)) || (input.action === "deactivate" && current.active !== false) || (input.action === "unverify" && current.verified !== false)) return { ok: false, code: "verification_unavailable", message: "Beklenen durum değişikliği doğrulanamadı. Sayfayı yenile." };
  return { ok: true, code: "saved", message: input.action === "unpublish" ? "Usta yayından kaldırıldı." : "İşlem kaydedildi.", detail: input.action === "unpublish" ? "Profil artık müşterilere gösterilmiyor." : "Güncel durum yeniden okunarak gösterilecek.", version: data.version, published: data.published, replayed: data.replayed === true };
 } catch {
  console.error("[FUWU] Provider control connection unavailable", { providerId: input.providerId, action: input.action, requestId: input.requestId });
  return providerControlError({});
 }
}
