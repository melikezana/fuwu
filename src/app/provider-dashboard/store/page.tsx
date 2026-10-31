import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/services/auth/server";
import { getCommerceCatalog } from "@/services/commerce";
import { ProviderCapacity } from "@/components/commerce/ProviderCapacity";
import { ProviderStore } from "@/components/commerce/ProviderStore";
import { ProviderDashboardShell } from "@/components/dashboard/ProviderDashboardUI";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
export const dynamic = "force-dynamic";
export const metadata = { title: "Hizmet Mağazam | FUWU" };
export default async function StorePage() {
  const { user, supabase } = await getServerAuthContext();
  if (!user || !supabase) redirect(buildLoginRedirectUrl("/provider-dashboard/store"));
  const { data: provider, error: providerError } = await supabase.from("providers").select("id,name,category_id,is_active").eq("user_id", user.id).maybeSingle();
  if (providerError) return <ProviderDashboardShell active="store" title="Hizmetlerim" description="Hizmetlerini seç. Fiyatını ve kapsamını belirle."><p className="commerce-error" role="alert">Usta profili okunamadı. Bağlantı ve kurulum kontrol edilmeli.</p></ProviderDashboardShell>;
  if (!provider) redirect("/provider-dashboard");
  const [catalog, offerings, hours, off, capacity] = await Promise.all([getCommerceCatalog(), supabase.from("provider_service_offerings").select("*").eq("provider_id", provider.id), supabase.from("provider_availability").select("*").eq("provider_id", provider.id), supabase.from("provider_time_off").select("*").eq("provider_id", provider.id), supabase.rpc("commerce_provider_capacity", { p_provider_id: provider.id })]);
return <ProviderDashboardShell active="store" title="Hizmetlerim" description="Hizmetlerini seç. Fiyatını ve kapsamını belirle." providerName={provider.name} statusLabel={provider.is_active ? "Mağaza hazırlığı" : "Hesap pasif"}>{catalog.unavailable || offerings.error || hours.error || off.error ? <p className="commerce-notice" role="alert">Hizmet mağazası henüz hazır değil. Veri bağlantısı ve kurulum tamamlandığında mağazanızı yönetebilirsiniz.</p> : <><ProviderStore providerId={provider.id} services={catalog.services.filter(s => s.category_id === provider.category_id)} variants={catalog.variants} offerings={offerings.data ?? []} hours={hours.data ?? []} daysOff={off.data ?? []} districts={catalog.districts} /><details className="partner-capacity-details"><summary>Günlük iş sınırı</summary>{capacity.error ? <p className="commerce-error" role="alert">Günlük iş sınırı okunamadı. Bağlantı ve kurulum kontrol edilmeli.</p> : <ProviderCapacity providerId={provider.id} initialLimit={capacity.data} />}</details></>}</ProviderDashboardShell>;
}
