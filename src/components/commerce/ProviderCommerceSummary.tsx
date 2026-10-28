import { createSupabaseServerClient } from "@/lib/supabase/server";
import { serviceActiveStatuses } from "@/lib/commerce/order-state";
import type { ProviderFinance } from "@/lib/commerce/finance";
import { ProviderWorkOverview, type ProviderOperations } from "./ProviderWorkOverview";
import { ProviderEarnings } from "./ProviderEarnings";
export async function ProviderCommerceSummary({ providerId, earnings = false }: { providerId: string; earnings?: boolean }) {
  const db = await createSupabaseServerClient();
  if (earnings) {
    const { data, error } = db ? await db.rpc("commerce_provider_finance", { p_provider_id: providerId }) : { data: null, error: true };
    const finance = data as unknown as ProviderFinance | null;
    return <ProviderEarnings finance={error ? null : finance} />;
  }
  const [result, operations, financeResult, nearest] = await Promise.all([
    db ? db.from("orders").select("*").eq("provider_id", providerId).in("status", serviceActiveStatuses).order("starts_at").limit(30) : null,
    db ? db.rpc("commerce_provider_operations", { p_provider_id: providerId }) : null,
    db ? db.rpc("commerce_provider_finance", { p_provider_id: providerId }) : null,
    db ? db.from("orders").select("*").eq("provider_id", providerId).in("status", serviceActiveStatuses).gt("ends_at", new Date().toISOString()).order("starts_at").limit(1).maybeSingle() : null,
  ]);
  const orders = result?.data ?? [];
  const finance = financeResult?.data as unknown as ProviderFinance | null;
  const stats = operations?.data as ProviderOperations | null;
  return <ProviderWorkOverview orders={orders} nextOrder={nearest?.data ?? null} stats={stats} finance={financeResult?.error ? null : finance} unavailable={Boolean(result?.error || operations?.error || nearest?.error || !db)} now={new Date().getTime()} />;
}
