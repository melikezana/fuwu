import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/services/auth/server";
import { ProviderDashboardShell } from "@/components/dashboard/ProviderDashboardUI";
import { OrderList } from "@/components/commerce/OrderList";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { money } from "@/lib/commerce/display";
export const dynamic = "force-dynamic";
export const metadata = { title: "Siparişlerim | Usta Paneli" };
export default async function ProviderOrdersPage() {
  const { user, supabase } = await getServerAuthContext();
  if (!user || !supabase) redirect(buildLoginRedirectUrl("/provider-dashboard/orders"));
  const { data: provider } = await supabase.from("providers").select("id,name,is_approved").eq("user_id", user.id).maybeSingle();
  if (!provider?.is_approved) redirect("/provider-dashboard");
  const { data, error } = await supabase.from("orders").select("*").eq("provider_id", provider.id).order("starts_at", { ascending: false });
  const orders = data ?? []; const completed = orders.filter(o => o.status === "COMPLETED");
  return <ProviderDashboardShell active="orders" title="Siparişlerim" description="Satın alınan hizmetleri, randevuları ve teslim koduyla tamamlamayı yönet." providerName={provider.name}>{!error && <section className="commerce-provider-stats"><div><small>Yaklaşan randevular</small><strong>{orders.filter(o => ["CONFIRMED","PROVIDER_ON_THE_WAY","IN_PROGRESS"].includes(o.status)).length}</strong></div><div><small>Tamamlanan hizmetler</small><strong>{completed.length}</strong></div><div><small>Tamamlanan brüt hak ediş · test</small><strong>{money(completed.reduce((sum,o) => sum+o.provider_gross_minor,0))}</strong></div></section>}<OrderList orders={orders} unavailable={Boolean(error)} /></ProviderDashboardShell>;
}
