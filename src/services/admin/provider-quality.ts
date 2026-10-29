import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";
import type { QualityInput } from "@/lib/providers/quality";
export type ProviderQualityRow = QualityInput & { id: string; status: "pending_review" | "approved" | "changes_requested" | "hidden"; fingerprint: string; review_note: string | null; reviewed_at: string | null };
export async function getProviderQualityQueue(): Promise<{ rows: ProviderQualityRow[]; unavailable: boolean }> {
  const { supabase, user, profile } = await getServerAuthContext();
  if (!supabase || !user || !hasAdminRole(profile)) return { rows: [], unavailable: true };
  const { data, error } = await supabase.rpc("admin_provider_quality_queue", {});
  return { rows: error || !Array.isArray(data) ? [] : data as unknown as ProviderQualityRow[], unavailable: Boolean(error || !Array.isArray(data)) };
}
