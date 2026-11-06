import type { Metadata } from "next";
import { ProviderJoinIntro, ProviderJoinDetails } from "@/components/providers/ProviderJoinIntro";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { ProviderApplicationForm } from "@/components/providers/ProviderApplicationForm";
import { appRoutes } from "@/lib/constants/navigation";
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
    "FUWU Partner ile hizmetlerini sun, takvimini yönet ve kazancını takip et.",
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
      <p className="text-sm font-medium uppercase tracking-normal text-[var(--brand-orange-dark)]">
        Usta başvurusu
      </p>
      <h2 className="mt-3 text-3xl font-bold leading-tight text-[var(--brand-navy)]">
        {providerApplicationStatusMessages[application.status]}
      </h2>
      <p className="mt-4 text-base font-semibold leading-7 text-[var(--muted)]">
        Başvurun hesabına bağlı şekilde kayıtlı. Çıkış yapıp tekrar giriş yaptığında bu durumu
        görmeye devam edersin.
      </p>
      <span
        className={`mt-5 inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-medium ${statusToneClassName}`}
      >
        {providerApplicationStatusLabels[application.status]}
      </span>
      <dl className="mt-5 grid gap-3 border-t border-[var(--border)] pt-5 sm:grid-cols-2">
        {[
          ["Ad Soyad", application.fullName],
          ["Telefon", application.phone],
          ["Kategori", application.category],
          ["İlçe", application.district],
          ...(application.experienceYears > 0 ? [["Deneyim", `${application.experienceYears} yıl`]] : []),
        ].map(([label, value]) => (
          <div className="rounded-md bg-[var(--surface-soft)] px-3 py-2" key={label}>
            <dt className="text-[0.68rem] font-medium uppercase leading-4 text-[var(--muted)]">
              {label}
            </dt>
            <dd className="mt-1 break-words text-sm font-semibold leading-5 text-[var(--brand-navy)]">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {application.status === PROVIDER_APPLICATION_STATUSES.pending && !isApprovedProvider ? (
        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-4">
          <p className="text-sm font-bold text-[var(--brand-navy)]">Onay beklerken hazırla</p>
          <ul className="mt-2 grid gap-1.5 text-sm font-medium leading-6 text-[var(--muted)]">
            <li>· T.C. kimlik kartının ön ve arka yüz fotoğrafı</li>
            <li>· e-Devlet&apos;ten barkodlu adli sicil kaydı (son 3 ay)</li>
            <li>· Kendi adına açılmış banka hesabının IBAN&apos;ı</li>
            <li>· Varsa ustalık / MYK belgen ve 3–5 iş fotoğrafın</li>
          </ul>
          <p className="mt-2 text-xs font-medium leading-5 text-[var(--muted)]">Başvurun onaylandığında SMS ile haber veririz. Belgeleri Usta Paneli&apos;nden yüklersin.</p>
        </div>
      ) : null}
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
  const loginHref = `${appRoutes.login}?method=phone&next=${encodeURIComponent(appRoutes.providerApplication)}`;

  return (
    <Card className="min-w-0">
      <p className="text-sm font-medium uppercase tracking-normal text-[var(--brand-orange-dark)]">
        Giriş gerekli
      </p>
      <h2 className="mt-3 text-3xl font-bold leading-tight text-[var(--brand-navy)]">
        {authAccessMessages.loginRequired}
      </h2>
      <p className="mt-4 text-base font-semibold leading-7 text-[var(--muted)]">
        Başvurun hesabına kaydedilir. Cep telefonunla, Google veya e-posta hesabınla birkaç saniyede giriş yaparsın; şifre yok.
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
      <p className="text-sm font-medium uppercase tracking-normal text-[var(--brand-orange-dark)]">
        Usta hesabı aktif
      </p>
      <h2 className="mt-3 text-3xl font-bold leading-tight text-[var(--brand-navy)]">
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
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium leading-6 text-red-700">
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
    <div className="market-join-page">
      <ProviderJoinIntro />
      <section className="market-application-section" id="provider-application-form">
        <Container className="market-application-grid max-w-7xl">
          <div className="market-application-intro"><p className="market-eyebrow">İLK ADIMI AT</p><h2>İşini tanıyalım.</h2><p>Başvurunu tamamla, durumunu hesabından takip et.</p><ol className="market-join-steps"><li><span>01</span><div><strong>Başvurunu oluştur</strong><p>Uzmanlığını ve hizmet bölgeni paylaş.</p></div></li><li><span>02</span><div><strong>İncelemeyi takip et</strong><p>Başvurunun durumunu hesabından izle.</p></div></li><li><span>03</span><div><strong>Profilini tamamla</strong><p>Onaydan sonra hizmet paketini ve takvimini hazırla.</p></div></li></ol></div>
        {!providerAccess.ok && providerAccess.reason === "missing-session" ? (
          <div className="grid gap-5">
            <ProviderApplicationLoginRequiredCard />
            <ProviderApplicationForm
              authenticatedUserId={null}
              categories={formOptions.categories}
              districts={formOptions.districts}
              isConfigured={formOptions.isConfigured}
              lookupError={formOptions.error}
            />
          </div>
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
              authenticatedUserId={providerAccess.userId ?? null}
              categories={formOptions.categories}
              districts={formOptions.districts}
              isConfigured={formOptions.isConfigured}
              lookupError={formOptions.error}
            />
          </div>
        )}
        </Container>
      </section>
      <ProviderJoinDetails categories={formOptions.categories} />
    </div>
  );
}
