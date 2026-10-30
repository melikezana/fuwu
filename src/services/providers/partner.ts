import { getServerAuthContext } from "@/services/auth/server";
import type { PartnerReadiness } from "@/lib/providers/readiness";
export async function getPartnerReadiness(providerId: string): Promise<PartnerReadiness | null> {
 const { supabase, user } = await getServerAuthContext();
 if (!supabase || !user) return null;
 try {
  const { data, error } = await supabase.rpc("provider_partner_readiness", { p_provider_id: providerId }).abortSignal(AbortSignal.timeout(8000));
  if (error || !data || typeof data !== "object" || Array.isArray(data) || typeof data.published !== "boolean" || typeof data.service_count !== "number" || !Array.isArray(data.districts)) return null;
  return data as unknown as PartnerReadiness;
 } catch { return null; }
}
