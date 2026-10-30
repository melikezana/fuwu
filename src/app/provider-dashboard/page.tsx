import { redirect } from "next/navigation";
import { appRoutes, buildLoginRedirectUrl } from "@/lib/constants/navigation";
import { getProviderDashboardAccess } from "@/services/providers/dashboard";
import { getPartnerReadiness } from "@/services/providers/partner";
import { PartnerOverview } from "@/components/dashboard/PartnerOverview";
import { ProviderDashboardApplicationPlaceholder, ProviderDashboardShell } from "@/components/dashboard/ProviderDashboardUI";
import { ProviderCommerceSummary } from "@/components/commerce/ProviderCommerceSummary";
import { sandboxCheckoutEnabled } from "@/lib/prelaunch";
export const dynamic = "force-dynamic";
export const metadata = { title: "FUWU Partner | İşin burada." };
export default async function ProviderDashboardPage() {
 const access = await getProviderDashboardAccess();
 if (!access.ok && access.reason === "missing-session") redirect(buildLoginRedirectUrl(appRoutes.providerDashboard));
 const readiness = access.ok ? await getPartnerReadiness(access.profile.id) : null;
 return <ProviderDashboardShell active="overview" title="İşin burada." description="Hizmetlerini yönet. Zamanını planla." providerName={access.ok ? access.profile.name : undefined} statusLabel={access.ok ? readiness ? readiness.active ? "Mağaza hazırlığı" : "Hesap pasif" : "Durum okunamadı" : "Başvuru takibi"}>
  {access.ok ? <><PartnerOverview readiness={readiness} />{sandboxCheckoutEnabled() && <ProviderCommerceSummary providerId={access.profile.id} />}</> : <ProviderDashboardApplicationPlaceholder application={access.application} applicationStatus={access.applicationStatus} message={access.message} reason={access.reason} />}
 </ProviderDashboardShell>;
}
