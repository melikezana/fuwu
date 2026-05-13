import type { Metadata } from "next";
import {
  getProviderDashboardProfile,
  ProviderDashboardAccessPlaceholder,
  ProviderDashboardShell,
  ProviderProfileField,
  ProviderStatusBadge,
} from "../_components/ProviderDashboardUI";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profil | Fuwu Usta Paneli",
  description: "Fuwu onaylı usta profil bilgileri görünümü.",
};

export default async function ProviderDashboardProfilePage() {
  const provider = await getProviderDashboardProfile();

  return (
    <ProviderDashboardShell
      active="profile"
      description="Yayındaki usta profilinde kullanılan temel bilgileri gözden geçir."
      providerName={provider?.name}
      title="Profil Bilgileri"
    >
      {provider ? (
        <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[0_14px_40px_rgba(13,20,36,0.05)] sm:p-6">
          <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 cursor-default select-none">
              <p className="text-sm font-black uppercase text-[var(--brand-orange-dark)]">
                Usta profili
              </p>
              <h2 className="mt-2 text-3xl font-black leading-tight text-[var(--brand-navy)]">
                {provider.name}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">
                {provider.category} hizmeti, {provider.district} bölgesi
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <ProviderStatusBadge tone={provider.isActive ? "green" : "orange"}>
                {provider.isActive ? "Aktif" : "Pasif"}
              </ProviderStatusBadge>
              <ProviderStatusBadge tone={provider.isApproved ? "green" : "orange"}>
                {provider.isApproved ? "Onaylı" : "Onay bekliyor"}
              </ProviderStatusBadge>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <ProviderProfileField label="Usta adı" value={provider.name} />
            <ProviderProfileField label="Kategori" value={provider.category} />
            <ProviderProfileField label="İlçe" value={provider.district} />
            <ProviderProfileField label="Telefon" value={provider.phone} />
            <ProviderProfileField label="WhatsApp" value={provider.whatsapp} />
            <ProviderProfileField label="Ortalama fiyat aralığı" value={provider.averagePriceRange} />
          </div>

          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <p className="cursor-default select-none text-xs font-black uppercase text-[var(--muted)]">
              Açıklama
            </p>
            <p className="mt-2 cursor-default select-none text-sm font-semibold leading-7 text-[var(--brand-navy)]">
              {provider.description}
            </p>
          </div>
        </section>
      ) : (
        <ProviderDashboardAccessPlaceholder />
      )}
    </ProviderDashboardShell>
  );
}
