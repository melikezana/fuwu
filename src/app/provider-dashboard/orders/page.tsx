import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/services/auth/server";
import { ProviderDashboardShell } from "@/components/dashboard/ProviderDashboardUI";
import { OrderList } from "@/components/commerce/OrderList";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { money } from "@/lib/commerce/display";
import Link from "next/link";
import type { ProviderFinance } from "@/lib/commerce/finance";
export const dynamic = "force-dynamic";
export const metadata = { title: "Siparişlerim | Usta Paneli" };
export default async function ProviderOrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = Math.min(10000, Math.max(1, Number.parseInt(params.page || "1") || 1));
  const { user, supabase } = await getServerAuthContext();
  if (!user || !supabase) redirect(buildLoginRedirectUrl("/provider-dashboard/orders"));
  const { data: provider } = await supabase.from("providers").select("id,name,is_approved").eq("user_id", user.id).maybeSingle();
  if (!provider?.is_approved) redirect("/provider-dashboard");
  const [{ data, error, count }, financeResult, upcoming] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact" }).eq("provider_id", provider.id).order("starts_at", { ascending: false }).range((page - 1) * 24, page * 24 - 1),
    supabase.rpc("commerce_provider_finance", { p_provider_id: provider.id }),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("provider_id", provider.id).in("status", ["CONFIRMED", "PROVIDER_ON_THE_WAY", "IN_PROGRESS"]),
  ]);
  const finance = financeResult.data as unknown as ProviderFinance | null;
  return <ProviderDashboardShell active="orders" title="Siparişlerim" description="Satın alınan hizmetleri, randevuları ve teslim koduyla tamamlamayı yönet." providerName={provider.name}>{!error && !financeResult.error && !upcoming.error && finance && <section className="commerce-provider-stats"><div><small>Aktif randevular</small><strong>{upcoming.count ?? 0}</strong></div><div><small>Tamamlanan hizmetler</small><strong>{finance.completed_count}</strong></div><div><small>Tamamlanan brüt hak ediş · test</small><strong>{money(finance.provider_gross_minor)}</strong></div></section>}<OrderList orders={data ?? []} unavailable={Boolean(error)} /><nav className="fusion-pagination" aria-label="Usta sipariş sayfaları">{page > 1 && <Link href={`?page=${page - 1}`}>← Önceki</Link>}{(count ?? 0) > page * 24 && <Link href={`?page=${page + 1}`}>Sonraki →</Link>}</nav></ProviderDashboardShell>;
}
