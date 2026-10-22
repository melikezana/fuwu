import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";
import type { MarketplaceSummary } from "@/lib/commerce/finance";

export async function getMarketplaceSummary() {
  const { supabase, profile, user } = await getServerAuthContext();
  if (!user || !supabase || !hasAdminRole(profile)) return null;
  const { data, error } = await supabase.rpc("commerce_admin_summary", {});
  const summary = data as unknown as MarketplaceSummary | null;
  return error || !summary || !Number.isFinite(summary.paid_count) || !Number.isFinite(summary.overdue_count) ? null : summary;
}
