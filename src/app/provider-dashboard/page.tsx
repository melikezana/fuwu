import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp,
  Star,
  Bell,
  Calendar,
} from "lucide-react";
import { appRoutes, buildLoginRedirectUrl } from "@/lib/constants/navigation";
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
import { getProviderStats } from "@/services/providers/stats";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Usta Paneli",
  description: "Fuwu onaylı ustaları için profil ve talep yönetimi temeli.",
};

function ProviderDashboardSummary({
  assignedRequestCount,
  provider,
  completedCount,
  averageRating,
}: {
  assignedRequestCount: number;
  provider: ProviderDashboardProfile;
  completedCount: number;
  averageRating: number;
}) {
  const dashboardCards = [
    {
      description:
        "Usta başvurun onaylandı ve panel erişimin aktif.",
      href: appRoutes.providerDashboardProfile,
      icon: providerDashboardIcons.shield,
      label: "Başvuru Durumu",
      value: provider.isApproved ? "Usta hesabınız aktif" : "İncelemede",
    },
    {
      description: `Profil, telefon ve hizmet bilgilerin ${getProviderAvailabilityLabel(provider.availability)} olarak görünüyor.`,
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
      description: "Tamamlanan toplam iş sayısı.",
      href: appRoutes.providerDashboardEarnings,
      icon: providerDashboardIcons.wallet,
      label: "Tamamlanan İş",
      value: String(completedCount),
    },
    {
      description: "Müşteri değerlendirmelerinden oluşan profil puanı.",
      href: appRoutes.providerDashboardReviews,
      icon: providerDashboardIcons.star,
      label: "Profil Puanı",
      value: `${formatProviderRating(averageRating)} / 5`,
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
    <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="cursor-default select-none">
          <p className="text-sm font-medium uppercase text-[var(--brand-orange-dark)]">
            Gelen talepler
          </p>
          <h2 className="mt-2 text-xl font-bold text-[var(--brand-navy)]">
            Son atanan talepler
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <ProviderStatusBadge tone={requests.length > 0 ? "green" : "orange"}>
            {requests.length} talep
          </ProviderStatusBadge>
          <Link
            href={appRoutes.providerDashboardRequests}
            className="text-xs font-semibold text-[var(--brand-orange-dark)] underline underline-offset-2 hover:text-[var(--brand-navy)]"
          >
            Tümünü gör →
          </Link>
        </div>
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
                  <p className="font-semibold text-[var(--brand-navy)]">{request.category}</p>
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
      className="rounded-lg border border-[rgba(23,116,95,0.24)] bg-[var(--trust-green-soft)] p-5 text-[var(--trust-green)] shadow-[var(--shadow-card)]"
      role="status"
    >
      <p className="text-xs font-medium uppercase">
        Onay tamamlandı
      </p>
      <h2 className="mt-2 text-2xl font-bold leading-tight">
        Usta hesabınız aktif
      </h2>
      <p className="mt-2 max-w-2xl text-sm font-bold leading-6">
        Profil, Talepler, Kazançlar, Değerlendirmeler, Bildirimler ve Takvim
        alanlarını kullanarak usta hesabını yönetebilirsin.
        {provider.isActive
          ? " Profilin onaylı ve yayına hazır."
          : " Profilin onaylı, ancak yayın durumu pasif."}
      </p>
    </section>
  );
}

// Hızlı erişim kartları
const quickAccessCards = [
  {
    href: appRoutes.providerDashboardEarnings,
    icon: TrendingUp,
    title: "Kazançlar",
    description: "Aylık gelir ve tamamlanan iş istatistikleri.",
  },
  {
    href: appRoutes.providerDashboardReviews,
    icon: Star,
    title: "Değerlendirmeler",
    description: "Müşteri yorumları ve puan geçmişi.",
  },
  {
    href: appRoutes.providerDashboardNotifications,
    icon: Bell,
    title: "Bildirimler",
    description: "Yeni eşleşme ve sistem bildirimleri.",
  },
  {
    href: appRoutes.providerDashboardCalendar,
    icon: Calendar,
    title: "Takvim",
    description: "Planlanmış işlerin tarih ve saat görünümü.",
  },
];

export default async function ProviderDashboardPage() {
  const [providerAccess, authContext] = await Promise.all([
    getProviderDashboardAccess(),
    getServerAuthContext(),
  ]);

  if (!providerAccess.ok && providerAccess.reason === "missing-session") {
    redirect(buildLoginRedirectUrl(appRoutes.providerDashboard));
  }

  const [assignedRequests, stats] = providerAccess.ok && authContext.supabase
    ? await Promise.all([
        getProviderAssignedRequests(providerAccess.profile.id, authContext.supabase),
        getProviderStats(providerAccess.profile.id, authContext.supabase),
      ])
    : [[], null];

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
            completedCount={stats?.completedRequests ?? 0}
            averageRating={stats?.averageRating ?? providerAccess.profile.rating}
          />
          <ProviderDashboardRecentRequests requests={assignedRequests} />

          {/* Hızlı erişim kartları */}
          <section>
            <div className="mb-4 cursor-default select-none">
              <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">
                Hızlı erişim
              </p>
              <h2 className="mt-2 text-xl font-bold text-[var(--brand-navy)]">
                Diğer panel bölümleri
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {quickAccessCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="group relative overflow-hidden rounded-lg border border-[rgba(255,138,0,0.24)] bg-white p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-[rgba(255,138,0,0.62)] hover:shadow-[var(--shadow-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
                  >
                    <span
                      className="absolute inset-x-0 top-0 h-1 bg-[var(--brand-orange)]"
                      aria-hidden
                    />
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)] transition group-hover:bg-[var(--brand-orange)] group-hover:text-white">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold leading-tight text-[var(--brand-navy)]">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">
                      {card.description}
                    </p>
                  </Link>
                );
              })}
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
