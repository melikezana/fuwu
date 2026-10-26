import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/services/auth/server";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { OrderList } from "@/components/commerce/OrderList";
import { getOrderCardDetails } from "@/services/commerce/order-cards";
import { historyStatuses, serviceActiveStatuses } from "@/lib/commerce/order-state";
export const dynamic = "force-dynamic";
export const metadata = { title: "Siparişlerim | MY FUWU", robots: { index: false, follow: false } };
const views = [["all", "Tümü"], ["active", "Aktif Hizmetler"], ["overdue", "Geciken Hizmetler"], ["history", "Geçmiş Hizmetler"]];
export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string; view?: string }> }) {
  const params = await searchParams;
  const page = Math.min(10000, Math.max(1, Number.parseInt(params.page || "1") || 1));
  const view = views.some(([id]) => id === params.view) ? params.view! : "all";
  const { user, supabase } = await getServerAuthContext();
  if (!user || !supabase) redirect(buildLoginRedirectUrl(`/orders?view=${view}`));
  let query = supabase.from("orders").select("*", { count: "exact" }).eq("customer_id", user.id).order("created_at", { ascending: false });
  if (view === "active" || view === "overdue") query = query.in("status", serviceActiveStatuses);
  if (view === "overdue") query = query.lt("ends_at", new Date().toISOString());
  if (view === "history") query = query.in("status", historyStatuses);
  const { data, error, count } = await query.range((page - 1) * 24, page * 24 - 1);
  const details = error ? {} : await getOrderCardDetails(supabase, data ?? []);
  return <div className="commerce-page"><header className="commerce-page-header"><p className="commerce-eyebrow">MY FUWU · HİZMETLERİN TEK YERDE</p><h1>Siparişlerim</h1><p>Randevularını ve sipariş aşamalarını buradan takip et.</p></header><nav className="fusion-tabs" aria-label="Sipariş filtreleri">{views.map(([id,label]) => <Link key={id} href={`?view=${id}`} aria-current={view === id ? "page" : undefined}>{label}</Link>)}</nav><OrderList orders={data ?? []} details={details} unavailable={Boolean(error)} /><nav className="fusion-pagination" aria-label="Sipariş sayfaları">{page > 1 && <Link href={`?view=${view}&page=${page - 1}`}>← Önceki</Link>}{(count ?? 0) > page * 24 && <Link href={`?view=${view}&page=${page + 1}`}>Sonraki →</Link>}</nav><Link className="commerce-text-link" href="/dashboard/requests">Önceki hizmet taleplerini görüntüle</Link></div>;
}
