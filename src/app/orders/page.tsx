import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/services/auth/server";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { OrderList } from "@/components/commerce/OrderList";
export const dynamic = "force-dynamic";
export const metadata = { title: "Siparişlerim | FUWU" };
export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = Math.min(10000, Math.max(1, Number.parseInt(params.page || "1") || 1));
  const { user, supabase } = await getServerAuthContext();
  if (!user || !supabase) redirect(buildLoginRedirectUrl("/orders"));
  const { data, error, count } = await supabase.from("orders").select("*", { count: "exact" }).eq("customer_id", user.id).order("created_at", { ascending: false }).range((page - 1) * 24, page * 24 - 1);
  return <div className="commerce-page"><header className="commerce-page-header"><p className="commerce-eyebrow">HİZMETLERİN TEK YERDE</p><h1>Siparişlerim</h1><p>Randevularını ve sipariş aşamalarını buradan takip et.</p></header><OrderList orders={data ?? []} unavailable={Boolean(error)} /><nav className="fusion-pagination" aria-label="Sipariş sayfaları">{page > 1 && <Link href={`?page=${page - 1}`}>← Önceki</Link>}{(count ?? 0) > page * 24 && <Link href={`?page=${page + 1}`}>Sonraki →</Link>}</nav><Link className="commerce-text-link" href="/dashboard/requests">Önceki hizmet taleplerini görüntüle</Link></div>;
}
