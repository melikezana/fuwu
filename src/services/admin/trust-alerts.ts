import type { SupabaseClient } from "@supabase/supabase-js";

export type ProviderAlert = { provider_id: string; name: string; count?: number; rating_avg?: number; review_count?: number };
export type TrustAlerts = { low_rated: ProviderAlert[]; frequent_cancellations: ProviderAlert[]; late_arrivals: ProviderAlert[]; stale_disputes: number; stale_documents: number; generated_at: string };

function isTrustAlerts(value: unknown): value is TrustAlerts {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return ["low_rated", "frequent_cancellations", "late_arrivals"].every(key => Array.isArray(v[key])) && typeof v.stale_disputes === "number" && typeof v.stale_documents === "number";
}

// Veri okunamazsa null döner; ekran "doğrulanamadı" der, sahte "sorun yok" göstermez.
export async function getTrustAlerts(supabase: SupabaseClient | null): Promise<TrustAlerts | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc("admin_trust_alerts").abortSignal(AbortSignal.timeout(8000));
    return error || !isTrustAlerts(data) ? null : data;
  } catch {
    return null;
  }
}
