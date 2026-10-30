export const providerControlActions = ["activate", "deactivate", "approve", "unpublish", "unverify", "verify", "approve_quality", "changes_requested", "pending_review", "mark_test", "mark_real", "edit_profile"] as const;
export type ProviderControlAction = (typeof providerControlActions)[number];
export type ProviderControlInput = { providerId: string; action: string; reason: string; expectedVersion: string; requestId: string; fingerprint?: string; verificationReference?: string; recordKind?: string; details?: Record<string, string | number | boolean | null> };
export type ProviderControlResult = { ok: boolean; code: string; message: string; detail?: string; version?: string; published?: boolean; replayed?: boolean };
export const providerControlLabels: Record<ProviderControlAction, string> = {
  edit_profile: "Profil bilgilerini güncelle", activate: "Aktifleştir", deactivate: "Pasifleştir", approve: "Hesabı onayla", unpublish: "Yayından Kaldır", unverify: "Doğrulamayı kaldır", verify: "Belgeyle doğrula", approve_quality: "Yayına onayla", changes_requested: "Düzeltme iste", pending_review: "İncelemeye al", mark_test: "Test kaydı olarak işaretle", mark_real: "Gerçek kayıt olarak işaretle",
};
export function isProviderControlAction(value: string): value is ProviderControlAction {
  return providerControlActions.includes(value as ProviderControlAction);
}
// Never show raw Postgres errors, SQL or personal evidence to the browser.
export function providerControlError(error: { code?: string; message?: string }): ProviderControlResult {
  const message = error.message ?? "";
  if (["PGRST202", "42883", "42P01", "42703"].includes(error.code ?? "")) return { ok: false, code: "schema_missing", message: "Yönetim şeması güncel değil.", detail: "Gerekli veritabanı güncellemesi staging ortamında doğrulanmalı. İşlem uygulanmadı." };
  if (error.code === "42501") return { ok: false, code: "forbidden", message: "Bu işlem için admin yetkisi gerekiyor." };
  if (error.code === "40001" || /profile_changed|version_conflict/.test(message)) return { ok: false, code: "conflict", message: "Kayıt başka bir işlemle değişti.", detail: "Sayfayı yenileyip güncel bilgileri incele." };
  if (/rate_limited/.test(message)) return { ok: false, code: "rate_limited", message: "Çok fazla işlem yapıldı. Bir dakika sonra tekrar dene." };
  if (/provider_not_found/.test(message)) return { ok: false, code: "not_found", message: "Usta kaydı bulunamadı." };
  if (/verification_evidence_required/.test(message)) return { ok: false, code: "evidence_required", message: "Bu ustaya ait onaylı başvuru ve incelenmiş belge gerekiyor." };
  if (/profile_incomplete|real_provider_required/.test(message)) return { ok: false, code: "not_ready", message: "Yayın koşulları tamamlanmadı.", detail: "Profil, hizmetler, takvim ve gerçek kayıt kaynağını kontrol et." };
  if (/idempotency_conflict/.test(message)) return { ok: false, code: "request_conflict", message: "İşlem kimliği farklı bir istek için kullanılmış. Sayfayı yenile." };
  return { ok: false, code: "failed", message: "İşlem tamamlanamadı.", detail: "Yetkini ve veritabanı bağlantısını kontrol et. Sonuç belirsizse aynı isteği tekrar deneyebilirsin." };
}
