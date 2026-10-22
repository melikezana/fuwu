import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/services/auth/server";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { OrderList } from "@/components/commerce/OrderList";
export const dynamic = "force-dynamic";
export const metadata = { title: "Siparişlerim | FUWU" };
export default async function OrdersPage() {
  const { user, supabase } = await getServerAuthContext();
  if (!user || !supabase) redirect(buildLoginRedirectUrl("/orders"));
  const { data, error } = await supabase.from("orders").select("*").eq("customer_id", user.id).order("created_at", { ascending: false });
  return <div className="commerce-page"><header className="commerce-page-header"><p className="commerce-eyebrow">HİZMETLERİN TEK YERDE</p><h1>Siparişlerim</h1><p>Randevularını ve sipariş aşamalarını buradan takip et.</p></header><OrderList orders={data ?? []} unavailable={Boolean(error)} /><Link className="commerce-text-link" href="/dashboard/requests">Önceki hizmet taleplerini görüntüle</Link></div>;
}
