import Link from "next/link";
import type { ReactNode } from "react";
import {
  BadgeCheck,
  ClipboardList,
  Eye,
  Inbox,
  LayoutDashboard,
  ShieldCheck,
  Star,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { appRoutes } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";

type ProviderDashboardNavKey = "overview" | "profile" | "requests";

type ProviderDashboardAccessReason =
  | "missing-session"
  | "missing-provider-profile"
  | "pending-application"
  | "pending-provider-profile"
  | "rejected-application";

type ProviderDashboardApplicationStatus = "pending" | "approved" | "rejected";
type ProviderDashboardStatusTone = "green" | "orange" | "red";

type ProviderDashboardApplicationDetails = {
  category: string;
  createdAt: string;
  district: string;
  experienceYears: number;
  fullName: string;
  phone: string;
  status: ProviderDashboardApplicationStatus;
};

type ProviderDashboardShellProps = {
  active: ProviderDashboardNavKey;
  children: ReactNode;
  description: string;
  providerName?: string;
  statusLabel?: string;
  statusTone?: ProviderDashboardStatusTone;
  title: string;
};

type SummaryCardProps = {
  description: string;
  href: string;
  icon: LucideIcon;
  label: string;
  value: string;
};

type ProfileFieldProps = {
  label: string;
  value: string;
};

type ProviderDashboardEmptyStateContent = {
  eyebrow: string;
  headline?: string;
  showApplicationCta: boolean;
  statusDescription: string;
  statusLabel: string;
};

const providerNavItems: Array<{
  href: string;
  icon: LucideIcon;
  key: ProviderDashboardNavKey;
  label: string;
}> = [
  {
    href: appRoutes.providerDashboard,
    icon: LayoutDashboard,
    key: "overview",
    label: "Genel Bakış",
  },
  {
    href: appRoutes.providerDashboardProfile,
    icon: UserRound,
    key: "profile",
    label: "Profil",
  },
  {
    href: appRoutes.providerDashboardRequests,
    icon: ClipboardList,
    key: "requests",
    label: "Talepler",
  },
];

const providerDashboardOnboardingSubtitle =
  "Başvurunu tamamladıktan sonra profilin incelenir. Onaylandığında gelen talepleri, profil görünürlüğünü ve müşteri iletişimlerini bu panelden yönetebilirsin.";

const providerDashboardFeatureCards: Array<{
  description: string;
  icon: LucideIcon;
  title: string;
}> = [
  {
    description: "Onaydan sonra profilinin listelerdeki yayın durumunu takip et.",
    icon: Eye,
    title: "Profil görünürlüğü",
  },
  {
    description: "Sana yönlendirilen işleri ve talep durumlarını tek ekranda izle.",
    icon: Inbox,
    title: "Gelen talepler",
  },
  {
    description: "Telefon, WhatsApp ve müşteri iletişim akışını düzenli tut.",
    icon: UserRound,
    title: "Müşteri iletişimi",
  },
];

const providerDashboardRequiredCards: Array<{
  description: string;
  href: string;
  icon: LucideIcon;
  title: string;
}> = [
  {
    description: "Başvurunun hangi aşamada olduğunu net şekilde takip et.",
    href: appRoutes.providerDashboard,
    icon: ShieldCheck,
    title: "Başvuru Durumu",
  },
  {
    description: "Ad, telefon, hizmet ve bölge bilgilerini tek yerde gör.",
    href: appRoutes.providerDashboardProfile,
    icon: UserRound,
    title: "Profil Bilgileri",
  },
  {
    description: "Onaydan sonra sana yönlendirilen işleri buradan izle.",
    href: appRoutes.providerDashboardRequests,
    icon: Inbox,
    title: "Gelen Talepler",
  },
  {
    description: "Yayına alındığında profilinin listelerdeki durumunu kontrol et.",
    href: appRoutes.providers,
    icon: Eye,
    title: "Görünürlük Durumu",
  },
];

export function getProviderDashboardStatusBadge(
  applicationStatus?: ProviderDashboardApplicationStatus,
  isActiveProvider = false,
): { label: string; tone: ProviderDashboardStatusTone } {
  if (isActiveProvider || applicationStatus === "approved") {
    return { label: "Aktif usta", tone: "green" };
  }

  if (applicationStatus === "pending") {
    return { label: "Başvuru alındı", tone: "green" };
  }

  if (applicationStatus === "rejected") {
    return { label: "Başvuru reddedildi", tone: "red" };
  }

  return { label: "Başvuru bekleniyor", tone: "orange" };
}

export function getProviderDashboardStatusBadgeView(
  applicationStatus?: ProviderDashboardApplicationStatus,
  isActiveProvider = false,
): { label: string; tone: ProviderDashboardStatusTone } {
  const labels = {
    active: "Aktif usta",
    pending: "Ba\u015fvuru al\u0131nd\u0131",
    rejected: "Ba\u015fvuru reddedildi",
    waiting: "Ba\u015fvuru bekleniyor",
  } as const;

  if (isActiveProvider || applicationStatus === "approved") {
    return { label: labels.active, tone: "green" };
  }

  if (applicationStatus === "pending") {
    return { label: labels.pending, tone: "green" };
  }

  if (applicationStatus === "rejected") {
    return { label: labels.rejected, tone: "red" };
  }

  return { label: labels.waiting, tone: "orange" };
}

export function formatProviderRating(rating: number) {
  return Number.isFinite(rating)
    ? rating.toLocaleString("tr-TR", {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      })
    : "0,0";
}

export function ProviderDashboardShell({
  active,
  children,
  description,
  providerName,
  statusLabel = "Başvuru bekleniyor",
  statusTone = "orange",
  title,
}: ProviderDashboardShellProps) {
  const statusToneClasses: Record<ProviderDashboardStatusTone, string> = {
    green:
      "border-[rgba(23,116,95,0.2)] bg-[var(--trust-green-soft)] text-[var(--trust-green)]",
    orange:
      "border-[rgba(255,138,0,0.28)] bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]",
    red: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <div className="min-h-full bg-[var(--surface-soft)]">
      <section className="border-b border-[var(--border)] bg-white">
        <Container className="max-w-7xl py-8 sm:py-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 cursor-default select-none">
              <p className="text-xs font-bold uppercase text-[var(--brand-orange-dark)]">
                Fuwu Usta Paneli
              </p>
              <h1 className="mt-2 text-3xl font-bold leading-tight text-[var(--brand-navy)] sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[var(--muted)] sm:text-base">
                {description}
              </p>
            </div>

            <div
              className={cn(
                "inline-flex max-w-full flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold leading-4",
                statusToneClasses[statusTone],
              )}
            >
              <ShieldCheck className="h-4 w-4" aria-hidden />
              {providerName ? `${providerName} · ${statusLabel}` : statusLabel}
            </div>
            <div className={cn("hidden max-w-full flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold leading-4", statusToneClasses[statusTone])}>
              <ShieldCheck className="h-4 w-4" aria-hidden />
              {providerName ? `${providerName} alanı` : "Başvuru alanı"}
            </div>
          </div>

          <nav className="mt-6 flex flex-wrap gap-2 pb-1" aria-label="Usta paneli menüsü">
            {providerNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;

              return (
                <Link
                  className={cn(
                    "inline-flex min-h-11 max-w-full items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold leading-5 transition-colors",
                    isActive
                      ? "border-[rgba(255,138,0,0.48)] bg-[var(--brand-orange-soft)] text-[var(--brand-navy)] shadow-[0_10px_24px_rgba(255,138,0,0.14)]"
                      : "border-[var(--border)] bg-white text-[var(--muted)] hover:bg-[var(--brand-orange-soft)] hover:text-[var(--brand-navy)]",
                  )}
                  href={item.href}
                  key={item.key}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </Container>
      </section>

      <Container className="max-w-7xl py-6 sm:py-8">{children}</Container>
    </div>
  );
}

function getProviderDashboardEmptyStateContent(
  reason: ProviderDashboardAccessReason,
  applicationStatus?: ProviderDashboardApplicationStatus,
): ProviderDashboardEmptyStateContent {
  if (applicationStatus === "approved") {
    return {
      eyebrow: "Profil hazırlığı",
      showApplicationCta: false,
      statusDescription:
        "Başvurun onaylandı. Profil bağlantısı tamamlandığında panel erişimi otomatik olarak açılır.",
      statusLabel: "Başvuru durumu: Profil hazırlanıyor",
    };
  }

  if (applicationStatus === "rejected" || reason === "rejected-application") {
    return {
      eyebrow: "Başvuru güncellemesi",
      showApplicationCta: true,
      statusDescription:
        "Bilgilerini güncelleyerek usta ağı için yeniden değerlendirme sürecine girebilirsin.",
      statusLabel: "Başvuru durumu: Güncelleme gerekli",
    };
  }

  if (
    applicationStatus === "pending" ||
    reason === "pending-application" ||
    reason === "pending-provider-profile"
  ) {
    return {
      eyebrow: "İnceleme süreci",
      showApplicationCta: false,
      statusDescription:
        "Başvurun operasyon ekibi tarafından inceleniyor. Onaylandığında bu panelden profilini ve taleplerini yönetebilirsin.",
      statusLabel: "Başvuru durumu: İncelemede",
    };
  }

  if (reason === "missing-session") {
    return {
      eyebrow: "Hesap doğrulaması",
      showApplicationCta: true,
      statusDescription:
        "Başvuru oluşturmak veya mevcut başvuru durumunu görmek için Fuwu hesabınla devam et.",
      statusLabel: "Başvuru durumu: Hesap girişi bekleniyor",
    };
  }

  return {
    eyebrow: "Başvuru bekleniyor",
    showApplicationCta: true,
    statusDescription:
      "Usta ağına katılmak için hizmet alanını, çalışma bölgeni ve iletişim bilgilerini paylaşarak başvurunu başlat.",
    statusLabel: "Başvuru durumu: Henüz başvuru bulunamadı",
  };
}

function getProviderDashboardStatusView(
  reason: ProviderDashboardAccessReason,
  applicationStatus?: ProviderDashboardApplicationStatus,
) {
  if (applicationStatus === "approved") {
    return {
      body:
        "Başvurun onaylandı. Usta profilin bağlandığında panel erişimin otomatik açılır.",
      cta: false,
      eyebrow: "Onay tamamlandı",
      headline: "Usta profilin hazırlanıyor",
      label: "Aktif usta",
    };
  }

  if (applicationStatus === "rejected" || reason === "rejected-application") {
    return {
      body:
        "Başvurun reddedildi. Bilgilerini güncelleyerek tekrar başvurabilirsin.",
      cta: true,
      eyebrow: "Başvuru reddedildi",
      headline: "Bilgilerini güncelleyerek yeniden gönder",
      label: "Başvuru reddedildi",
    };
  }

  if (
    applicationStatus === "pending" ||
    reason === "pending-application" ||
    reason === "pending-provider-profile"
  ) {
    return {
      body:
        "Başvurun incelemede. Ekibimiz bilgilerini kontrol ediyor.",
      cta: false,
      eyebrow: "Başvuru alındı",
      headline: "Başvurun güvenli şekilde sırada",
      label: "Başvuru alındı",
    };
  }

  if (reason === "missing-session") {
    return {
      body:
        "Başvuru oluşturmak veya mevcut başvuru durumunu görmek için Fuwu hesabınla devam et.",
      cta: true,
      eyebrow: "Hesap doğrulaması",
      headline: "Usta ağına katılmak için giriş yap",
      label: "Başvuru bekleniyor",
    };
  }

  return {
    body:
      "Hizmet alanını, çalışma bölgeni ve iletişim bilgilerini paylaşarak usta ağına başvur.",
    cta: true,
    eyebrow: "Başvuru bekleniyor",
    headline: "Usta ağına katılmaya hazır mısın?",
    label: "Başvuru bekleniyor",
  };
}

function getProviderDashboardStatusViewClean(
  reason: ProviderDashboardAccessReason,
  applicationStatus?: ProviderDashboardApplicationStatus,
) {
  const labels = {
    active: "Aktif usta",
    pending: "Ba\u015fvuru al\u0131nd\u0131",
    rejected: "Ba\u015fvuru reddedildi",
    waiting: "Ba\u015fvuru bekleniyor",
  } as const;

  if (applicationStatus === "approved") {
    return {
      body: "Ba\u015fvurunuz onayland\u0131",
      cta: false,
      eyebrow: "Onay tamamland\u0131",
      headline: "Ba\u015fvurunuz onayland\u0131",
      label: labels.active,
    };
  }

  if (applicationStatus === "rejected" || reason === "rejected-application") {
    return {
      body: "Ba\u015fvurunuz reddedildi",
      cta: true,
      eyebrow: labels.rejected,
      headline: "Ba\u015fvurunuz reddedildi",
      label: labels.rejected,
    };
  }

  if (
    applicationStatus === "pending" ||
    reason === "pending-application" ||
    reason === "pending-provider-profile"
  ) {
    return {
      body: "Ba\u015fvurunuz de\u011ferlendirmede",
      cta: false,
      eyebrow: labels.pending,
      headline: "Ba\u015fvurunuz de\u011ferlendirmede",
      label: labels.pending,
    };
  }

  if (reason === "missing-session") {
    return {
      body:
        "Ba\u015fvuru olu\u015fturmak veya mevcut ba\u015fvuru durumunu g\u00f6rmek i\u00e7in Fuwu hesab\u0131nla devam et.",
      cta: true,
      eyebrow: "Hesap do\u011frulamas\u0131",
      headline: "Usta a\u011f\u0131na kat\u0131lmak i\u00e7in giri\u015f yap",
      label: labels.waiting,
    };
  }

  return {
    body:
      "Hizmet alan\u0131n\u0131, \u00e7al\u0131\u015fma b\u00f6lgeni ve ileti\u015fim bilgilerini payla\u015farak usta a\u011f\u0131na ba\u015fvur.",
    cta: true,
    eyebrow: labels.waiting,
    headline: "Usta a\u011f\u0131na kat\u0131lmaya haz\u0131r m\u0131s\u0131n?",
    label: labels.waiting,
  };
}

function formatApplicationDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ProviderDashboardAccessPlaceholder({
  application,
  applicationStatus,
  reason = "missing-provider-profile",
}: {
  application?: ProviderDashboardApplicationDetails;
  applicationStatus?: ProviderDashboardApplicationStatus;
  message?: string;
  reason?: ProviderDashboardAccessReason;
}) {
  const statusView = getProviderDashboardStatusViewClean(
    reason,
    application?.status ?? applicationStatus,
  );

  return (
    <section className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="rounded-xl border border-[rgba(13,20,36,0.08)] bg-white p-5 shadow-[0_22px_70px_rgba(13,20,36,0.08)] sm:p-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)] ring-1 ring-[rgba(255,138,0,0.2)]">
            <BadgeCheck className="h-6 w-6" aria-hidden />
          </div>
          <p className="mt-5 text-xs font-bold uppercase text-[var(--brand-orange-dark)]">
            {statusView.eyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-bold leading-tight text-[var(--brand-navy)] sm:text-4xl">
            {statusView.headline}
          </h2>
          <h2 className="hidden mt-2 text-3xl font-bold leading-tight text-[var(--brand-navy)] sm:text-4xl">
            Usta hesabın henüz aktif değil
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[var(--muted)] sm:text-base sm:leading-7">
            {statusView.body}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {statusView.cta ? (
              <>
              <Button className="w-full sm:w-fit" href={appRoutes.providerApplication}>
                {"Usta a\u011f\u0131na ba\u015fvur"}
              </Button>
              <Button className="hidden w-full sm:w-fit" href={appRoutes.providerApplication}>
                Usta ağına başvur
              </Button>
              <Button className="hidden w-full sm:w-fit" href={appRoutes.providerApplication}>
                Usta ağına başvur
              </Button>
              </>
            ) : null}
            <Button className="w-full sm:w-fit" href={appRoutes.providers} variant="secondary">
              {"Ustalar\u0131 g\u00f6r\u00fcnt\u00fcle"}
            </Button>
            <Button className="hidden w-full sm:w-fit" href={appRoutes.providers} variant="secondary">
              Ustaları görüntüle
            </Button>
            <Button className="hidden w-full sm:w-fit" href={appRoutes.providers} variant="secondary">
              Ustaları görüntüle
            </Button>
          </div>
        </article>

        <aside
          className="rounded-xl border border-[rgba(255,138,0,0.24)] bg-white p-5 shadow-[0_18px_54px_rgba(13,20,36,0.07)] sm:p-6"
          role="status"
        >
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </div>
          <p className="mt-5 text-xs font-bold uppercase text-[var(--muted)]">
            Durum özeti
          </p>
          <p className="mt-2 text-lg font-bold leading-6 text-[var(--brand-navy)]">
            {statusView.label}
          </p>
          <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
            {statusView.body}
          </p>
          {application ? (
            <>
            <dl className="mt-5 grid gap-3 border-t border-[var(--border)] pt-5">
              {[
                ["Ad Soyad", application.fullName],
                ["Telefon", application.phone],
                ["Hizmet", application.category],
                ["\u0130l\u00e7e", application.district],
                ["Deneyim", `${application.experienceYears} y\u0131l`],
                ["Durum", statusView.label],
                ["Ba\u015fvuru Tarihi", formatApplicationDate(application.createdAt)],
              ].map(([label, value]) => (
                <div
                  className="rounded-md bg-[var(--surface-soft)] px-3 py-2"
                  key={label}
                >
                  <dt className="text-[0.68rem] font-bold uppercase leading-4 text-[var(--muted)]">
                    {label}
                  </dt>
                  <dd className="mt-1 break-words text-sm font-bold leading-5 text-[var(--brand-navy)]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <dl className="hidden mt-5 gap-3 border-t border-[var(--border)] pt-5">
              {[
                ["Ad Soyad", application.fullName],
                ["Telefon", application.phone],
                ["Hizmet", application.category],
                ["İlçe", application.district],
                ["Deneyim", `${application.experienceYears} yıl`],
                ["Durum", statusView.label],
                ["Başvuru Tarihi", formatApplicationDate(application.createdAt)],
              ].map(([label, value]) => (
                <div
                  className="rounded-md bg-[var(--surface-soft)] px-3 py-2"
                  key={label}
                >
                  <dt className="text-[0.68rem] font-bold uppercase leading-4 text-[var(--muted)]">
                    {label}
                  </dt>
                  <dd className="mt-1 break-words text-sm font-bold leading-5 text-[var(--brand-navy)]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            </>
          ) : null}
        </aside>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {providerDashboardRequiredCards.map((feature) => {
          const Icon = feature.icon;

          return (
            <Link
              className="group relative overflow-hidden rounded-lg border border-[rgba(255,138,0,0.24)] bg-white p-5 shadow-[0_14px_42px_rgba(13,20,36,0.06)] transition-all hover:-translate-y-0.5 hover:border-[rgba(255,138,0,0.62)] hover:shadow-[0_22px_54px_rgba(13,20,36,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
              href={feature.href}
              key={feature.title}
            >
              <span className="absolute inset-x-0 top-0 h-1 bg-[var(--brand-orange)]" aria-hidden />
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)] transition group-hover:bg-[var(--brand-orange)] group-hover:text-white">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-black leading-tight text-[var(--brand-navy)]">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">
                {feature.description}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function ProviderDashboardApplicationPlaceholder({
  application,
  applicationStatus,
  reason = "missing-provider-profile",
}: {
  application?: ProviderDashboardApplicationDetails;
  applicationStatus?: ProviderDashboardApplicationStatus;
  message?: string;
  reason?: ProviderDashboardAccessReason;
}) {
  const statusView = getProviderDashboardStatusViewClean(
    reason,
    application?.status ?? applicationStatus,
  );
  const applicationFields = application
    ? [
        ["Ad Soyad", application.fullName],
        ["Telefon", application.phone],
        ["Hizmet", application.category],
        ["\u0130l\u00e7e", application.district],
        ["Deneyim", `${application.experienceYears} y\u0131l`],
        ["Durum", statusView.label],
        ["Ba\u015fvuru Tarihi", formatApplicationDate(application.createdAt)],
      ]
    : [];

  return (
    <section className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="rounded-xl border border-[rgba(13,20,36,0.08)] bg-white p-5 shadow-[0_22px_70px_rgba(13,20,36,0.08)] sm:p-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)] ring-1 ring-[rgba(255,138,0,0.2)]">
            <BadgeCheck className="h-6 w-6" aria-hidden />
          </div>
          <p className="mt-5 text-xs font-bold uppercase text-[var(--brand-orange-dark)]">
            {statusView.eyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-bold leading-tight text-[var(--brand-navy)] sm:text-4xl">
            {statusView.headline}
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[var(--muted)] sm:text-base sm:leading-7">
            {statusView.body}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {statusView.cta ? (
              <Button className="w-full sm:w-fit" href={appRoutes.providerApplication}>
                {"Usta a\u011f\u0131na ba\u015fvur"}
              </Button>
            ) : null}
            <Button className="w-full sm:w-fit" href={appRoutes.providers} variant="secondary">
              {"Ustalar\u0131 g\u00f6r\u00fcnt\u00fcle"}
            </Button>
          </div>
        </article>

        <aside
          className="rounded-xl border border-[rgba(255,138,0,0.24)] bg-white p-5 shadow-[0_18px_54px_rgba(13,20,36,0.07)] sm:p-6"
          role="status"
        >
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </div>
          <p className="mt-5 text-xs font-bold uppercase text-[var(--muted)]">
            Durum Özeti
          </p>
          <p className="mt-2 text-lg font-bold leading-6 text-[var(--brand-navy)]">
            {statusView.label}
          </p>
          <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
            {statusView.body}
          </p>
          {application ? (
            <dl className="mt-5 grid gap-3 border-t border-[var(--border)] pt-5">
              {applicationFields.map(([label, value]) => (
                <div
                  className="rounded-md bg-[var(--surface-soft)] px-3 py-2"
                  key={label}
                >
                  <dt className="text-[0.68rem] font-bold uppercase leading-4 text-[var(--muted)]">
                    {label}
                  </dt>
                  <dd className="mt-1 break-words text-sm font-bold leading-5 text-[var(--brand-navy)]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </aside>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {providerDashboardRequiredCards.map((feature) => {
          const Icon = feature.icon;

          return (
            <Link
              className="group relative overflow-hidden rounded-lg border border-[rgba(255,138,0,0.24)] bg-white p-5 shadow-[0_14px_42px_rgba(13,20,36,0.06)] transition-all hover:-translate-y-0.5 hover:border-[rgba(255,138,0,0.62)] hover:shadow-[0_22px_54px_rgba(13,20,36,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
              href={feature.href}
              key={feature.title}
            >
              <span className="absolute inset-x-0 top-0 h-1 bg-[var(--brand-orange)]" aria-hidden />
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)] transition group-hover:bg-[var(--brand-orange)] group-hover:text-white">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-black leading-tight text-[var(--brand-navy)]">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">
                {feature.description}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function ProviderSummaryCard({
  description,
  href,
  icon: Icon,
  label,
  value,
}: SummaryCardProps) {
  return (
    <Link
      className="group relative overflow-hidden rounded-lg border border-[rgba(255,138,0,0.24)] bg-white p-5 shadow-[0_14px_40px_rgba(13,20,36,0.06)] transition-all hover:-translate-y-0.5 hover:border-[rgba(255,138,0,0.62)] hover:shadow-[0_22px_54px_rgba(13,20,36,0.1)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
      href={href}
    >
      <span className="absolute inset-x-0 top-0 h-1 bg-[var(--brand-orange)]" aria-hidden />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 cursor-default select-none">
          <p className="text-xs font-black uppercase text-[var(--brand-orange-dark)]">
            {label}
          </p>
          <p className="mt-3 text-2xl font-black leading-tight text-[var(--brand-navy)]">
            {value}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">
            {description}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)] transition group-hover:bg-[var(--brand-orange)] group-hover:text-white">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export function ProviderProfileField({ label, value }: ProfileFieldProps) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <p className="cursor-default select-none text-xs font-bold uppercase text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 cursor-default select-none break-words text-base font-bold leading-6 text-[var(--brand-navy)]">
        {value}
      </p>
    </div>
  );
}

export function ProviderStatusBadge({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: ProviderDashboardStatusTone;
}) {
  const toneClasses: Record<ProviderDashboardStatusTone, string> = {
    green:
      "border-[rgba(23,116,95,0.22)] bg-[var(--trust-green-soft)] text-[var(--trust-green)]",
    orange:
      "border-[rgba(255,138,0,0.25)] bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]",
    red: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <span
      className={cn(
        "inline-flex min-h-8 max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-bold leading-4",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}

export function ProviderRequestsEmptyState() {
  return (
    <div
      className="rounded-lg border border-dashed border-[rgba(255,138,0,0.38)] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf3_100%)] p-8 text-center"
      role="status"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
        <Inbox className="h-6 w-6" aria-hidden />
      </div>
      <h2 className="mt-5 text-xl font-bold text-[var(--brand-navy)]">
        Henüz gelen talep bulunmuyor.
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-[var(--muted)]">
        Müşteri talepleri usta hesabına bağlandığında burada sırayla görünecek. Bu sırada profil bilgilerini ve uygunluk durumunu güncel tutabilirsin.
      </p>
      <Button className="mt-5 w-full sm:w-fit" href={appRoutes.providerDashboardProfile} variant="secondary">
        Profilini kontrol et
      </Button>
    </div>
  );
}

export const providerDashboardIcons = {
  eye: Eye,
  inbox: Inbox,
  shield: ShieldCheck,
  star: Star,
  user: UserRound,
  wallet: WalletCards,
};
