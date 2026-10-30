import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";
import type { QualityInput } from "@/lib/providers/quality";
import { providerControlError } from "@/lib/providers/control";
export type ProviderQualityRow = QualityInput & { id: string; record_kind?: "unclassified" | "real" | "test"; status: "pending_review" | "approved" | "changes_requested" | "hidden"; fingerprint: string; review_note: string | null; reviewed_at: string | null };
export async function getProviderQualityQueue(): Promise<{ rows: ProviderQualityRow[]; unavailable: boolean; errorCode?: string }> {
  const { supabase, user, profile } = await getServerAuthContext();
  if (!supabase || !user || !hasAdminRole(profile)) return { rows: [], unavailable: true };
  try {
    const { data, error } = await supabase.rpc("admin_provider_quality_queue", {}).abortSignal(AbortSignal.timeout(8000));
    if (error) {
      console.error("[FUWU] Provider quality queue unavailable", { code: error.code });
      return { rows: [], unavailable: true, errorCode: providerControlError(error).code };
    }
    return { rows: Array.isArray(data) ? data as unknown as ProviderQualityRow[] : [], unavailable: !Array.isArray(data) };
  } catch { return { rows: [], unavailable: true, errorCode: "connection" }; }
}
