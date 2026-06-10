import type { Metadata } from "next";
import { appRoutes } from "@/lib/constants/navigation";
import { getProviderAvailabilityLabel } from "@/lib/constants/providers";
import {
  formatProviderRating,
  getProviderDashboardStatusBadgeView,
  ProviderDashboardApplicationPlaceholder,
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
  const dashboardCards = [
    {
      description:
        "Usta ba\u015fvurun onayland\u0131 ve panel eri\u015fimin aktif.",
      href: appRoutes.providerDashboardProfile,
      icon: providerDashboardIcons.shield,
      label: "Ba\u015fvuru Durumu",
      value: provider.isApproved ? "Usta hesab\u0131n\u0131z aktif" : "\u0130ncelemede",
    },
    {
      description:
        `Profil, telefon ve hizmet bilgilerin ${getProviderAvailabilityLabel(provider.availability)} olarak g\u00f6r\u00fcn\u00fcyor.`,
      href: appRoutes.providerDashboardProfile,
      icon: providerDashboardIcons.user,
      label: "Profil Bilgileri",
      value: provider.name,
    },
    {
      description: "Sana y\u00f6nlendirilen i\u015fler burada takip edilecek.",
      href: appRoutes.providerDashboardRequests,
      icon: providerDashboardIcons.inbox,
      label: "Gelen Talepler",
      value: "0",
    },
    {
      description:
        provider.isActive && provider.isApproved
          ? "Profilin public usta listesinde g\u00f6r\u00fcn\u00fcr."
          : "Profil g\u00f6r\u00fcn\u00fcrl\u00fc\u011f\u00fc \u015fu anda kapal\u0131.",
      href: appRoutes.providers,
      icon: providerDashboardIcons.eye,
      label: "G\u00f6r\u00fcn\u00fcrl\u00fck Durumu",
      value: provider.isActive && provider.isApproved ? "Yay\u0131nda" : "Kapal\u0131",
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {dashboardCards.map((card) => (
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

function ProviderDashboardActiveNotice({
  provider,
}: {
  provider: ProviderDashboardProfile;
}) {
  if (!provider.isApproved) {
    return null;
  }

  return (
    <section
      className="rounded-lg border border-[rgba(23,116,95,0.24)] bg-[var(--trust-green-soft)] p-5 text-[var(--trust-green)] shadow-[0_14px_40px_rgba(13,20,36,0.05)]"
      role="status"
    >
      <p className="text-xs font-black uppercase">
        Onay tamamland\u0131
      </p>
      <h2 className="mt-2 text-2xl font-black leading-tight">
        Usta hesab\u0131n\u0131z aktif
      </h2>
      <p className="mt-2 max-w-2xl text-sm font-bold leading-6">
        Profil, Talepler ve Genel Bak\u0131\u015f alanlar\u0131n\u0131 kullanarak usta hesab\u0131n\u0131 y\u00f6netebilirsin.
        {provider.isActive
          ? " Profilin onayl\u0131 ve yay\u0131na haz\u0131r."
          : " Profilin onayl\u0131, ancak yay\u0131n durumu pasif."}
      </p>
    </section>
  );
}

export default async function ProviderDashboardPage() {
  const providerAccess = await getProviderDashboardAccess();
  const statusBadge = getProviderDashboardStatusBadgeView(
    providerAccess.ok
      ? providerAccess.application?.status
      : providerAccess.applicationStatus,
    providerAccess.ok,
  );

  return (
    <ProviderDashboardShell
      active="overview"
      description="Profil görünürlüğünü, temel durumları ve gelen talep alanını tek ekranda takip et."
      providerName={providerAccess.ok ? providerAccess.profile.name : undefined}
      statusLabel={statusBadge.label}
      statusTone={statusBadge.tone}
      title="Usta Paneli"
    >
      {providerAccess.ok ? (
        <div className="grid gap-6">
          <ProviderDashboardActiveNotice provider={providerAccess.profile} />
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
        <ProviderDashboardApplicationPlaceholder
          application={providerAccess.application}
          applicationStatus={providerAccess.applicationStatus}
          message={providerAccess.message}
          reason={providerAccess.reason}
        />
      )}
    </ProviderDashboardShell>
  );
}
