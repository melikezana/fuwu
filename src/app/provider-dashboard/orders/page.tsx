import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/services/auth/server";
import { ProviderDashboardShell } from "@/components/dashboard/ProviderDashboardUI";
import { OrderList } from "@/components/commerce/OrderList";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { money } from "@/lib/commerce/display";
import Link from "next/link";
import { historyStatuses, serviceActiveStatuses } from "@/lib/commerce/order-state";
import { todayIstanbul } from "@/lib/commerce/display";
import type { ProviderFinance } from "@/lib/commerce/finance";
export const dynamic = "force-dynamic";
export const metadata = { title: "Siparişlerim | Usta Paneli" };
export default async function ProviderOrdersPage({ searchParams }: { searchParams: Promise<{ page?: string; view?: string }> }) {
  const params = await searchParams;
  const view = ["all", "today", "active", "overdue", "history"].includes(params.view || "") ? params.view! : "active";
  const page = Math.min(10000, Math.max(1, Number.parseInt(params.page || "1") || 1));
  const { user, supabase } = await getServerAuthContext();
  if (!user || !supabase) redirect(buildLoginRedirectUrl("/provider-dashboard/orders"));
  const { data: provider } = await supabase.from("providers").select("id,name,is_approved").eq("user_id", user.id).maybeSingle();
  if (!provider?.is_approved) redirect("/provider-dashboard");
  let orderQuery = supabase.from("orders").select("*", { count: "exact" }).eq("provider_id", provider.id).order("starts_at", { ascending: view !== "history" });
  if (view === "active") orderQuery = orderQuery.in("status", serviceActiveStatuses);
  if (view === "overdue") orderQuery = orderQuery.in("status", serviceActiveStatuses).lt("ends_at", new Date().toISOString());
  if (view === "history") orderQuery = orderQuery.in("status", historyStatuses);
  if (view === "today") {
    const today = todayIstanbul();
    const tomorrow = new Date(`${today}T12:00:00+03:00`); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const nextDay = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul" }).format(tomorrow);
    orderQuery = orderQuery.gte("starts_at", `${today}T00:00:00+03:00`).lt("starts_at", `${nextDay}T00:00:00+03:00`);
  }
  const [{ data, error, count }, financeResult, upcoming] = await Promise.all([
    orderQuery.range((page - 1) * 24, page * 24 - 1),
    supabase.rpc("commerce_provider_finance", { p_provider_id: provider.id }),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("provider_id", provider.id).in("status", ["CONFIRMED", "PROVIDER_ON_THE_WAY", "IN_PROGRESS"]),
  ]);
  const finance = financeResult.data as unknown as ProviderFinance | null;
  return <ProviderDashboardShell active="orders" title="Siparişlerim" description="Satın alınan hizmetleri, randevuları ve teslim koduyla tamamlamayı yönet." providerName={provider.name}>{!error && !financeResult.error && !upcoming.error && finance && <section className="commerce-provider-stats"><div><small>Aktif randevular</small><strong>{upcoming.count ?? 0}</strong></div><div><small>Tamamlanan hizmetler</small><strong>{finance.completed_count}</strong></div><div><small>Tamamlanan brüt hak ediş · test</small><strong>{money(finance.provider_gross_minor)}</strong></div></section>}<nav className="fusion-tabs" aria-label="Sipariş görünümü">{[["active", "Aktif Randevular"], ["today", "Bugün"], ["overdue", "Geciken İşler"], ["history", "Geçmiş Hizmetler"], ["all", "Tüm Siparişler"]].map(([id, label]) => <Link key={id} aria-current={view === id ? "page" : undefined} href={`?view=${id}`}>{label}</Link>)}</nav>{(financeResult.error || upcoming.error) && <p className="commerce-notice" role="status">Özet bilgiler şu anda yüklenemiyor. Siparişlerini aşağıdan takip edebilirsin.</p>}<OrderList audience="provider" orders={data ?? []} unavailable={Boolean(error)} /><nav className="fusion-pagination" aria-label="Usta sipariş sayfaları">{page > 1 && <Link href={`?view=${view}&page=${page - 1}`}>← Önceki</Link>}{(count ?? 0) > page * 24 && <Link href={`?view=${view}&page=${page + 1}`}>Sonraki →</Link>}</nav></ProviderDashboardShell>;
}
