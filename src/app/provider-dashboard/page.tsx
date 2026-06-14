import type { Metadata } from "next";
import { appRoutes } from "@/lib/constants/navigation";
import { getProviderAvailabilityLabel } from "@/lib/constants/providers";
import {
  formatProviderRating,
  getProviderDashboardStatusBadgeView,
  ProviderDashboardApplicationPlaceholder,
  providerDashboardIcons,
  ProviderDashboardShell,
  ProviderStatusBadge,
  ProviderSummaryCard,
} from "@/components/dashboard/ProviderDashboardUI";
import {
  SERVICE_REQUEST_STATUS_LABELS,
  normalizeServiceRequestStatus,
} from "@/lib/constants/statuses";
import { getServerAuthContext } from "@/services/auth/server";
import {
  getProviderDashboardAccess,
  type ProviderDashboardProfile,
} from "@/services/providers/dashboard";
import { getProviderAssignedRequests } from "@/services/requests";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Usta Paneli",
  description: "Fuwu onaylı ustaları için profil ve talep yönetimi temeli.",
};

function ProviderDashboardSummary({
  assignedRequestCount,
  provider,
}: {
  assignedRequestCount: number;
  provider: ProviderDashboardProfile;
}) {
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
      description: "Sana yönlendirilen işlerin güncel sayısı.",
      href: appRoutes.providerDashboardRequests,
      icon: providerDashboardIcons.inbox,
      label: "Gelen Talepler",
      value: String(assignedRequestCount),
    },
    {
      description: "Müşteri değerlendirmelerinden oluşan profil puanı.",
      href: appRoutes.providerDashboardProfile,
      icon: providerDashboardIcons.star,
      label: "Profil Puanı",
      value: `${formatProviderRating(provider.rating)} / 5`,
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
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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

type ProviderAssignedRequestPreview = Awaited<ReturnType<typeof getProviderAssignedRequests>>[number];

function getRequestStatusLabel(status: string) {
  const normalizedStatus = normalizeServiceRequestStatus(status);

  return normalizedStatus ? SERVICE_REQUEST_STATUS_LABELS[normalizedStatus] : status;
}

function ProviderDashboardRecentRequests({
  requests,
}: {
  requests: ProviderAssignedRequestPreview[];
}) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[0_14px_40px_rgba(13,20,36,0.05)] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="cursor-default select-none">
          <p className="text-sm font-black uppercase text-[var(--brand-orange-dark)]">
            Gelen talepler
          </p>
          <h2 className="mt-2 text-xl font-black text-[var(--brand-navy)]">
            Son atanan talepler
          </h2>
        </div>
        <ProviderStatusBadge tone={requests.length > 0 ? "green" : "orange"}>
          {requests.length} talep
        </ProviderStatusBadge>
      </div>

      {requests.length > 0 ? (
        <div className="mt-5 grid gap-3">
          {requests.slice(0, 3).map((request) => (
            <article
              className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-4"
              key={request.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-black text-[var(--brand-navy)]">{request.category}</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                    {request.district} · {request.customerName}
                  </p>
                </div>
                <ProviderStatusBadge tone={request.status === "rejected" ? "red" : "green"}>
                  {getRequestStatusLabel(request.status)}
                </ProviderStatusBadge>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-md border border-dashed border-[rgba(255,138,0,0.38)] bg-[var(--brand-orange-soft)] px-4 py-3 text-sm font-bold leading-6 text-[var(--brand-navy)]">
          Henüz atanmış talep yok. Yeni talepler atandığında durumları burada görünür.
        </p>
      )}
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
  const [providerAccess, authContext] = await Promise.all([
    getProviderDashboardAccess(),
    getServerAuthContext(),
  ]);
  const assignedRequests =
    providerAccess.ok && authContext.supabase
      ? await getProviderAssignedRequests(providerAccess.profile.id, authContext.supabase)
      : [];
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
          <ProviderDashboardSummary
            assignedRequestCount={assignedRequests.length}
            provider={providerAccess.profile}
          />
          <ProviderDashboardRecentRequests requests={assignedRequests} />

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
