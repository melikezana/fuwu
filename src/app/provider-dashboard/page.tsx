import type { Metadata } from "next";
import { appRoutes } from "@/lib/constants/navigation";
import { getProviderAvailabilityLabel } from "@/lib/constants/providers";
import {
  formatProviderRating,
  ProviderDashboardAccessPlaceholder,
  providerDashboardIcons,
  ProviderDashboardShell,
  ProviderSummaryCard,
} from "@/components/dashboard/ProviderDashboardUI";
import {
  getProviderDashboardAccess,
  type ProviderDashboardProfile,
} from "@/services/providers/dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Usta Paneli",
  description: "Fuwu onaylı ustaları için profil ve talep yönetimi temeli.",
};

function ProviderDashboardSummary({
  provider,
}: {
  provider: ProviderDashboardProfile;
}) {
  const cards = [
    {
      description: provider.isApproved
        ? "Profil bilgileri yayın için hazır."
        : "Profil inceleme süreci devam ediyor.",
      href: appRoutes.providerDashboardProfile,
      icon: providerDashboardIcons.shield,
      label: "Profil Durumu",
      value: provider.isApproved ? "Onaylı" : "İncelemede",
    },
    {
      description:
        provider.isActive && provider.isApproved
          ? "Profilin public usta listesinde görünebilir."
          : "Profil görünürlüğü şu anda kapalı.",
      href: appRoutes.providers,
      icon: providerDashboardIcons.eye,
      label: "Görünürlük Durumu",
      value: provider.isActive && provider.isApproved ? "Yayında" : "Kapalı",
    },
    {
      description: "Public kartlarda gösterilen güncel çalışma kapasiten.",
      href: appRoutes.providerDashboardProfile,
      icon: providerDashboardIcons.eye,
      label: "Uygunluk Durumu",
      value: getProviderAvailabilityLabel(provider.availability),
    },
    {
      description: "Talep eşleşmesi altyapısı hazırlanıyor.",
      href: appRoutes.providerDashboardRequests,
      icon: providerDashboardIcons.inbox,
      label: "Gelen Talepler",
      value: "0",
    },
    {
      description: "Yayındaki profil ortalaması.",
      href: appRoutes.providerDashboardProfile,
      icon: providerDashboardIcons.star,
      label: "Ortalama Puan",
      value: formatProviderRating(provider.rating),
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <ProviderSummaryCard
          description={card.description}
          href={card.href}
          icon={card.icon}
          key={card.label}
          label={card.label}
          value={card.value}
        />
      ))}
    </section>
  );
}

export default async function ProviderDashboardPage() {
  const providerAccess = await getProviderDashboardAccess();

  return (
    <ProviderDashboardShell
      active="overview"
      description="Profil görünürlüğünü, temel durumları ve gelen talep alanını tek ekranda takip et."
      providerName={providerAccess.ok ? providerAccess.profile.name : undefined}
      title="Usta Paneli"
    >
      {providerAccess.ok ? (
        <div className="grid gap-6">
          <ProviderDashboardSummary provider={providerAccess.profile} />

          <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[0_14px_40px_rgba(13,20,36,0.05)] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="cursor-default select-none">
                <h2 className="text-xl font-black text-[var(--brand-navy)]">
                  Profil yönetimi yakında
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--muted)]">
                  Fiyat aralığı, açıklama ve iletişim bilgileri için düzenleme akışı sonraki
                  sürümde bu panele eklenecek.
                </p>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <ProviderDashboardAccessPlaceholder
          applicationStatus={providerAccess.applicationStatus}
          message={providerAccess.message}
          reason={providerAccess.reason}
        />
      )}
    </ProviderDashboardShell>
  );
}
