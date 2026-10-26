import { createSupabaseServerClient } from "@/lib/supabase/server";
import { serviceActiveStatuses } from "@/lib/commerce/order-state";
import { todayIstanbul } from "@/lib/commerce/display";
import { ProviderAgenda } from "./ProviderAgenda";
export async function ProviderOrderCalendar({ providerId, params }: { providerId: string; params: { day?: string; page?: string } }) {
  const db = await createSupabaseServerClient();
  const valid = params.day && /^\d{4}-\d{2}-\d{2}$/.test(params.day) && Number.isFinite(Date.parse(params.day)) && new Date(`${params.day}T12:00:00+03:00`).toISOString().slice(0,10) === params.day;
  const day = valid ? params.day! : todayIstanbul();
  const next = new Date(`${day}T12:00:00+03:00`); next.setUTCDate(next.getUTCDate() + 1);
  const page = Math.min(10000, Math.max(1, Number.parseInt(params.page || "1") || 1));
  const [orders, overdue] = db ? await Promise.all([
    db.from("orders").select("*", { count: "exact" }).eq("provider_id", providerId).in("status", serviceActiveStatuses).gte("starts_at", `${day}T00:00:00+03:00`).lt("starts_at", `${next.toISOString().slice(0,10)}T00:00:00+03:00`).order("starts_at").range((page-1)*24, page*24-1),
    db.from("orders").select("id", { head: true, count: "exact" }).eq("provider_id", providerId).in("status", serviceActiveStatuses).lt("ends_at", new Date().toISOString()),
  ]) : [null, null];
  return <ProviderAgenda day={day} page={page} orders={orders?.data ?? []} count={orders?.count ?? 0} overdueCount={overdue?.count ?? null} unavailable={!db || Boolean(orders?.error || overdue?.error)} />;
}
