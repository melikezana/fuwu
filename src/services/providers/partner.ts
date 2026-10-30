import { getServerAuthContext } from "@/services/auth/server";
import { isPartnerReadiness, type PartnerReadiness } from "@/lib/providers/readiness";
export async function getPartnerReadiness(providerId: string): Promise<PartnerReadiness | null> {
 const { supabase, user } = await getServerAuthContext();
 if (!supabase || !user) return null;
 try {
  const { data, error } = await supabase.rpc("provider_partner_readiness", { p_provider_id: providerId }).abortSignal(AbortSignal.timeout(8000));
  return error || !isPartnerReadiness(data) ? null : data;
 } catch { return null; }
}
