import type { Metadata } from "next";
import Link from "next/link";
import { FuwuLogo, FuwuWatermark } from "@/components/brand/FuwuLogo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { ProviderApplicationForm } from "@/components/providers/ProviderApplicationForm";
import { appRoutes } from "@/lib/constants/navigation";
import { I18nText } from "@/lib/i18n";
import { authAccessMessages } from "@/services/auth/constants";
import {
  PROVIDER_APPLICATION_STATUSES,
  type ProviderApplicationStatus,
} from "@/lib/constants/statuses";
import {
  noProviderApplicationMessage,
  providerApplicationStatusLabels,
  providerApplicationStatusMessages,
} from "@/services/account/tracking";
import {
  getProviderDashboardAccess,
  type ProviderDashboardApplication,
} from "@/services/providers/dashboard";
import { getProviderApplicationFormOptions } from "@/services/providers/applications";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Usta Ağına Katıl",
  description:
    "Fuwu'da görünür olmak, doğru müşterilerden telefon ve WhatsApp ile talep almak için usta başvurusu yap.",
};

function ProviderApplicationStatusCard({
  application,
  isApprovedProvider,
}: {
  application: ProviderDashboardApplication;
  isApprovedProvider: boolean;
}) {
  const statusToneClassName =
    application.status === PROVIDER_APPLICATION_STATUSES.approved || isApprovedProvider
      ? "border-[rgba(23,116,95,0.24)] bg-[var(--trust-green-soft)] text-[var(--trust-green)]"
      : application.status === PROVIDER_APPLICATION_STATUSES.rejected
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-[rgba(255,138,0,0.28)] bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]";

  return (
    <Card className="min-w-0">
      <p className="text-sm font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
        Usta başvurusu
      </p>
      <h2 className="mt-3 text-3xl font-black leading-tight text-[var(--brand-navy)]">
        {providerApplicationStatusMessages[application.status]}
      </h2>
      <p className="mt-4 text-base font-semibold leading-7 text-[var(--muted)]">
        Başvurun hesabına bağlı şekilde kayıtlı. Çıkış yapıp tekrar giriş yaptığında bu durumu
        görmeye devam edersin.
      </p>
      <span
        className={`mt-5 inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-black ${statusToneClassName}`}
      >
        {providerApplicationStatusLabels[application.status]}
      </span>
      <dl className="mt-5 grid gap-3 border-t border-[var(--border)] pt-5 sm:grid-cols-2">
        {[
          ["Ad Soyad", application.fullName],
          ["Telefon", application.phone],
          ["Kategori", application.category],
          ["İlçe", application.district],
          ["Deneyim", `${application.experienceYears} yıl`],
        ].map(([label, value]) => (
          <div className="rounded-md bg-[var(--surface-soft)] px-3 py-2" key={label}>
            <dt className="text-[0.68rem] font-bold uppercase leading-4 text-[var(--muted)]">
              {label}
            </dt>
            <dd className="mt-1 break-words text-sm font-bold leading-5 text-[var(--brand-navy)]">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {(application.status === PROVIDER_APPLICATION_STATUSES.approved || isApprovedProvider) ? (
          <Button className="w-full sm:w-fit" href={appRoutes.providerDashboard}>
            Usta Paneline Git
          </Button>
        ) : null}
        <Button className="w-full sm:w-fit" href={appRoutes.accountApplications} variant="secondary">
          Başvurularımı Gör
        </Button>
      </div>
    </Card>
  );
}

function ProviderApplicationLoginRequiredCard() {
  const loginHref = `${appRoutes.login}?next=${encodeURIComponent(appRoutes.providerApplication)}`;

  return (
    <Card className="min-w-0">
      <p className="text-sm font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
        Giriş gerekli
      </p>
      <h2 className="mt-3 text-3xl font-black leading-tight text-[var(--brand-navy)]">
        {authAccessMessages.loginRequired}
      </h2>
      <p className="mt-4 text-base font-semibold leading-7 text-[var(--muted)]">
        Usta başvurunun kalıcı olarak hesabında görünmesi için Google veya e-posta hesabınla devam et.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button className="w-full sm:w-fit" href={loginHref}>
          Giriş Yap
        </Button>
        <Button className="w-full sm:w-fit" href={appRoutes.providers} variant="secondary">
          Ustaları Gör
        </Button>
      </div>
    </Card>
  );
}

function ActiveProviderCard() {
  return (
    <Card className="min-w-0">
      <p className="text-sm font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
        Usta hesabı aktif
      </p>
      <h2 className="mt-3 text-3xl font-black leading-tight text-[var(--brand-navy)]">
        {providerApplicationStatusMessages.approved}
      </h2>
      <p className="mt-4 text-base font-semibold leading-7 text-[var(--muted)]">
        Onaylı usta hesabınla talepleri ve profil durumunu panelden takip edebilirsin.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button className="w-full sm:w-fit" href={appRoutes.providerDashboard}>
          Usta Paneline Git
        </Button>
        <Button className="w-full sm:w-fit" href={appRoutes.accountApplications} variant="secondary">
          Başvurularımı Gör
        </Button>
      </div>
    </Card>
  );
}

function RejectedApplicationNotice({
  status,
}: {
  status: ProviderApplicationStatus;
}) {
  if (status !== PROVIDER_APPLICATION_STATUSES.rejected) {
    return null;
  }

  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
      {providerApplicationStatusMessages.rejected}
    </div>
  );
}

export default async function ProviderApplicationPage() {
  const [formOptions, providerAccess] = await Promise.all([
    getProviderApplicationFormOptions(),
    getProviderDashboardAccess(),
  ]);
  const application = providerAccess.application;
  const shouldShowExistingApplication =
    application?.status === PROVIDER_APPLICATION_STATUSES.pending ||
    application?.status === PROVIDER_APPLICATION_STATUSES.approved ||
    providerAccess.ok;

  return (
    <section className="relative overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(135deg,#ffffff_0%,#FFF7EC_44%,#F7F7F8_100%)]">
      <FuwuWatermark className="-left-20 top-10 text-[10rem] opacity-[0.04] sm:text-[13rem]" />
      <Container className="relative grid max-w-7xl gap-7 py-9 sm:py-12 lg:py-14 xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)] xl:items-start xl:gap-10">
        <div className="min-w-0 cursor-default select-none lg:max-w-[520px]">
          <Link
            aria-label="Fuwu ana sayfasına git"
            className="inline-flex cursor-pointer rounded-lg bg-white px-4 py-3 shadow-[0_18px_54px_rgba(13,20,36,0.07)] ring-1 ring-[rgba(13,20,36,0.08)] transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            href={appRoutes.home}
          >
            <FuwuLogo size="md" />
          </Link>
          <p className="mt-7 text-sm font-black uppercase tracking-normal text-[var(--brand-orange-dark)]">
            <I18nText i18nKey="providerApplication.eyebrow" />
          </p>
          <h1 className="mt-4 max-w-[640px] text-3xl font-bold leading-tight tracking-normal text-[var(--brand-navy)] sm:text-4xl lg:text-[2.5rem]">
            <I18nText i18nKey="providerApplication.title" />
          </h1>
          <p className="mt-5 max-w-[680px] text-base font-medium leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
            <I18nText i18nKey="providerApplication.subtitle" />
          </p>
          <div className="mt-6 cursor-default select-none rounded-lg border border-[rgba(255,138,0,0.28)] bg-white p-5 shadow-[0_18px_48px_rgba(13,20,36,0.07)]">
            <p className="text-sm font-black uppercase text-[var(--brand-orange-dark)]">
              <I18nText i18nKey="providerApplication.trustTitle" />
            </p>
            <p className="mt-2 text-base font-semibold leading-7 text-[var(--brand-navy)]">
              <I18nText i18nKey="providerApplication.trustDescription" />
            </p>
            <div className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4 text-sm font-bold leading-6 text-[var(--muted)]">
              <p>
                <I18nText i18nKey="providerApplication.reassurance" />
              </p>
              <p>
                <I18nText i18nKey="providerApplication.noPassword" />
              </p>
            </div>
          </div>
        </div>

        {!providerAccess.ok && providerAccess.reason === "missing-session" ? (
          <ProviderApplicationLoginRequiredCard />
        ) : shouldShowExistingApplication && application ? (
          <ProviderApplicationStatusCard
            application={application}
            isApprovedProvider={providerAccess.ok}
          />
        ) : providerAccess.ok ? (
          <ActiveProviderCard />
        ) : (
          <div>
            {application ? <RejectedApplicationNotice status={application.status} /> : null}
            {!application ? (
              <p className="sr-only">{noProviderApplicationMessage}</p>
            ) : null}
            <ProviderApplicationForm
              categories={formOptions.categories}
              districts={formOptions.districts}
              isConfigured={formOptions.isConfigured}
              lookupError={formOptions.error}
            />
          </div>
        )}
      </Container>
    </section>
  );
}
