import { getServerAuthContext } from "@/services/auth/server";
import { hasAdminRole } from "@/services/auth/constants";
import type { MarketplaceSummary, CeoDailySnapshot } from "@/lib/commerce/finance";
import { todayIstanbul } from "@/lib/commerce/display";

export async function getMarketplaceSummary() {
  const { supabase, profile, user } = await getServerAuthContext();
  if (!user || !supabase || !hasAdminRole(profile)) return null;
  const { data, error } = await supabase.rpc("commerce_admin_summary", {});
  const summary = data as unknown as MarketplaceSummary | null;
  return error || !summary || !Number.isFinite(summary.paid_count) || !Number.isFinite(summary.overdue_count) ? null : summary;
}

export async function getCeoDailySnapshot(): Promise<CeoDailySnapshot | null> {
  const { supabase, profile, user } = await getServerAuthContext();
  if (!user || !supabase || !hasAdminRole(profile)) return null;
  const start = new Date(`${todayIstanbul()}T00:00:00+03:00`).toISOString();
  const end = new Date(Date.parse(start) + 86400000).toISOString();
  const [created, completed, failed, pending] = await Promise.all([
    supabase.from("orders").select("id", { head: true, count: "exact" }).gte("created_at", start).lt("created_at", end),
    supabase.from("order_status_events").select("id", { head: true, count: "exact" }).eq("status", "COMPLETED").gte("created_at", start).lt("created_at", end),
    supabase.from("payment_transactions").select("id", { head: true, count: "exact" }).eq("status", "FAILED").gte("updated_at", start).lt("updated_at", end),
    supabase.from("provider_applications").select("id", { head: true, count: "exact" }).eq("status", "pending"),
  ]);
  return { newOrders: created.error ? null : created.count, completedOrders: completed.error ? null : completed.count, failedPayments: failed.error ? null : failed.count, pendingProviders: pending.error ? null : pending.count };
}
