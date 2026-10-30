export type ProbeName = "supabase" | "schema" | "google" | "iyzico" | "cron" | "audit";
export type ProbeResult = { name: ProbeName; passed: boolean; detail: string };
export type HealthEvidence = { name: ProbeName; passed: boolean; detail: string; checked_at: string; last_success_at: string | null };
export type OperationsHealth = { checked_at: string; contract_ok: boolean; missing_contracts: string[]; audit_last_event_at: string | null; probes: HealthEvidence[] };
export const probeLabels: Record<ProbeName, string> = { supabase: "Supabase erişimi", schema: "Migration / RLS sözleşmesi", google: "Google OAuth yapılandırması", iyzico: "iyzico sandbox erişimi", cron: "Rezervasyon temizleme cron", audit: "Audit log" };

export function evidenceState(evidence: HealthEvidence | undefined, now: number, maxAgeHours = 24) {
  if (!evidence) return "Kontrol edilmedi";
  if (!evidence.passed) return "Son kontrol başarısız";
  const checked = Date.parse(evidence.checked_at);
  if (!Number.isFinite(checked) || checked > now + 60000) return "Kontrol tarihi doğrulanamadı";
  return now - checked > maxAgeHours * 3600000 ? "Kontrol güncel değil" : "Kontrol başarılı";
}
