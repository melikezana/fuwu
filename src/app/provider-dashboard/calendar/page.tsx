import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/services/auth/server";
import { getCommerceCatalog } from "@/services/commerce";
import { ProviderStore } from "@/components/commerce/ProviderStore";
import { ProviderOrderCalendar } from "@/components/commerce/ProviderOrderCalendar";
import { ProviderDashboardShell } from "@/components/dashboard/ProviderDashboardUI";
import { buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { sandboxCheckoutEnabled } from "@/lib/prelaunch";
export const dynamic = "force-dynamic";
export const metadata = { title: "Takvimim | FUWU Partner" };
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ day?: string; page?: string }> }) {
 const { user, supabase } = await getServerAuthContext();
 if (!user || !supabase) redirect(buildLoginRedirectUrl("/provider-dashboard/calendar"));
 const { data: provider } = await supabase.from("providers").select("id,name,category_id,is_active").eq("user_id", user.id).maybeSingle();
 if (!provider) redirect("/provider-dashboard");
 const [catalog, offerings, hours, off] = await Promise.all([getCommerceCatalog(), supabase.from("provider_service_offerings").select("*").eq("provider_id", provider.id), supabase.from("provider_availability").select("*").eq("provider_id", provider.id), supabase.from("provider_time_off").select("*").eq("provider_id", provider.id)]);
 return <ProviderDashboardShell active="calendar" title="Takvimim" description="Çalışma saatlerini ve izin günlerini belirle." providerName={provider.name} statusLabel={provider.is_active ? "Mağaza hazırlığı" : "Hesap pasif"}>
  {catalog.unavailable || offerings.error || hours.error || off.error ? <p className="commerce-error" role="alert">Takvim okunamadı. Bağlantı ve kurulum kontrol edilmeli.</p> : <ProviderStore mode="calendar" providerId={provider.id} services={catalog.services.filter(s => s.category_id === provider.category_id)} variants={catalog.variants} offerings={offerings.data ?? []} hours={hours.data ?? []} daysOff={off.data ?? []} districts={catalog.districts} />}
  {sandboxCheckoutEnabled() && <ProviderOrderCalendar providerId={provider.id} params={await searchParams} />}
 </ProviderDashboardShell>;
}
