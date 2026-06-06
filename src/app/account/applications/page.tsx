import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BriefcaseBusiness, CalendarDays, CircleDollarSign, MapPin, UserRound } from "lucide-react";
import { FuwuLogo } from "@/components/brand/FuwuLogo";
import { Container } from "@/components/ui/Container";
import { appRoutes } from "@/lib/constants/navigation";
import {
  SERVICE_REQUEST_STATUS_LABELS,
  type ServiceRequestStatus,
} from "@/lib/constants/statuses";
import { getBudgetTagLabel } from "@/services/matching/budget";
import { getPaymentPreferenceLabel } from "@/services/payments";
import {
  getAccountTrackingData,
  noProviderApplicationMessage,
  providerApplicationStatusLabels,
  providerApplicationStatusMessages,
  type AccountProviderApplication,
  type AccountServiceRequest,
} from "@/services/account/tracking";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Başvurularım | Fuwu",
  description: "Fuwu usta başvurularını ve hizmet taleplerini hesabından takip et.",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatPrice(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Teklif yok";
  }

  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(value)} TL`;
}

function getRequestStatusLabel(status: string) {
  return SERVICE_REQUEST_STATUS_LABELS[status as ServiceRequestStatus] ?? status;
}

function getBudgetLabel(value: string | null) {
  return value ? getBudgetTagLabel(value) || value : "Belirtilmedi";
}

function getApplicationStatusClassName(status: AccountProviderApplication["status"]) {
  if (status === "approved") {
    return "border-[rgba(23,116,95,0.24)] bg-[var(--trust-green-soft)] text-[var(--trust-green)]";
  }

  if (status === "rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-[rgba(255,138,0,0.28)] bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]";
}

function DetailPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-[#F9FAFB] px-3 py-2 ring-1 ring-[rgba(13,20,36,0.06)]">
      <dt className="flex items-center gap-1.5 text-[0.68rem] font-black uppercase text-[var(--muted)]">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-bold leading-5 text-[var(--brand-navy)]">
        {value}
      </dd>
    </div>
  );
}

function ProviderApplicationCard({
  application,
}: {
  application: AccountProviderApplication;
}) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[0_14px_38px_rgba(13,20,36,0.06)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-black leading-tight text-[var(--brand-navy)]">
            {application.fullName}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">
            {providerApplicationStatusMessages[application.status]}
          </p>
        </div>
        <span
          className={`inline-flex w-fit shrink-0 items-center rounded-full border px-3 py-1.5 text-xs font-black ${getApplicationStatusClassName(application.status)}`}
        >
          {providerApplicationStatusLabels[application.status]}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 border-t border-[var(--border)] pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <DetailPill icon={BriefcaseBusiness} label="Kategori" value={application.category} />
        <DetailPill icon={MapPin} label="İlçe" value={application.district} />
        <DetailPill icon={UserRound} label="Telefon" value={application.phone} />
        <DetailPill icon={CalendarDays} label="Tarih" value={formatDate(application.createdAt)} />
        <DetailPill icon={BriefcaseBusiness} label="Deneyim" value={`${application.experienceYears} yıl`} />
      </dl>
    </article>
  );
}

function ServiceRequestCard({ request }: { request: AccountServiceRequest }) {
  const isEmergency = request.urgencyType === "emergency";

  return (
    <article className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[0_14px_38px_rgba(13,20,36,0.06)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black leading-tight text-[var(--brand-navy)]">
              {request.category}
            </h2>
            {isEmergency ? (
              <span className="rounded-md bg-red-50 px-2 py-1 text-[0.68rem] font-black uppercase text-red-600 ring-1 ring-red-200">
                Acil
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">
            {request.assignedProviderName
              ? `Atanan usta: ${request.assignedProviderName}`
              : "Henüz usta atanmadı."}
          </p>
        </div>
        <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-[rgba(255,138,0,0.28)] bg-[var(--brand-orange-soft)] px-3 py-1.5 text-xs font-black text-[var(--brand-orange-dark)]">
          {getRequestStatusLabel(request.status)}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 border-t border-[var(--border)] pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <DetailPill icon={MapPin} label="İlçe" value={request.district} />
        <DetailPill
          icon={CircleDollarSign}
          label="Bütçe"
          value={`${getBudgetLabel(request.budgetTag)} · ${formatPrice(request.offeredPrice)}`}
        />
        <DetailPill
          icon={CircleDollarSign}
          label="Ödeme"
          value={getPaymentPreferenceLabel(request.paymentPreference)}
        />
        <DetailPill icon={CalendarDays} label="Tarih" value={formatDate(request.createdAt)} />
      </dl>
    </article>
  );
}

export default async function AccountApplicationsPage() {
  const accountData = await getAccountTrackingData();

  if (!accountData.userId) {
    redirect(`${appRoutes.login}?next=${encodeURIComponent(appRoutes.accountApplications)}`);
  }

  const latestApplication = accountData.applications[0] ?? null;

  return (
    <main className="min-h-screen bg-[var(--surface-soft)]">
      <header className="border-b border-[var(--border)] bg-white">
        <Container className="flex min-h-16 items-center justify-between gap-4">
          <Link href={appRoutes.home} aria-label="Fuwu ana sayfasına git">
            <FuwuLogo size="sm" />
          </Link>
          <div className="flex gap-2">
            <Link
              className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-black text-[var(--brand-navy)] transition hover:bg-[var(--brand-orange-soft)]"
              href={appRoutes.accountRequests}
            >
              Taleplerim
            </Link>
            <Link
              className="rounded-md border border-[rgba(255,138,0,0.42)] bg-white px-4 py-2 text-sm font-black text-[var(--brand-navy)] transition hover:bg-[var(--brand-orange-soft)]"
              href={appRoutes.request}
            >
              Yeni Talep
            </Link>
          </div>
        </Container>
      </header>

      <Container className="max-w-5xl py-8 sm:py-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-[var(--brand-orange-dark)]">
              Hesabım
            </p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-[var(--brand-navy)]">
              Başvurularım
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--muted)]">
              Usta başvurularını ve hizmet taleplerini hesabına bağlı olarak takip edebilirsin.
            </p>
          </div>
          <span className="w-fit rounded-md bg-white px-3 py-2 text-xs font-black text-[var(--muted)] ring-1 ring-[rgba(13,20,36,0.08)]">
            {accountData.applications.length} başvuru · {accountData.requests.length} talep
          </span>
        </div>

        {accountData.error ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {accountData.error}
          </div>
        ) : null}

        <section className="grid gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-black text-[var(--brand-navy)]">
              Usta başvurularım
            </h2>
            {latestApplication ? (
              <span
                className={`w-fit rounded-full border px-3 py-1.5 text-xs font-black ${getApplicationStatusClassName(latestApplication.status)}`}
              >
                {providerApplicationStatusMessages[latestApplication.status]}
              </span>
            ) : null}
          </div>

          {accountData.applications.length > 0 ? (
            accountData.applications.map((application) => (
              <ProviderApplicationCard application={application} key={application.id} />
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-[rgba(255,138,0,0.38)] bg-white px-6 py-10 text-center">
              <h3 className="text-lg font-black text-[var(--brand-navy)]">
                {noProviderApplicationMessage}
              </h3>
              <Link
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--brand-orange)] px-5 py-2.5 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,138,0,0.24)] transition hover:bg-[var(--brand-orange-dark)]"
                href={appRoutes.providerApplication}
              >
                Usta ağına başvur
              </Link>
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-black text-[var(--brand-navy)]">
              Hizmet taleplerim
            </h2>
            <Link
              className="w-fit rounded-md border border-[rgba(255,138,0,0.42)] bg-white px-4 py-2 text-sm font-black text-[var(--brand-navy)] transition hover:bg-[var(--brand-orange-soft)]"
              href={appRoutes.request}
            >
              Yeni Talep
            </Link>
          </div>

          {accountData.requests.length > 0 ? (
            accountData.requests.map((request) => (
              <ServiceRequestCard key={request.id} request={request} />
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-[rgba(255,138,0,0.38)] bg-white px-6 py-10 text-center">
              <h3 className="text-lg font-black text-[var(--brand-navy)]">
                Henüz hizmet talebin yok.
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[var(--muted)]">
                İlk talebini oluşturduğunda kategori, ilçe, bütçe, ödeme ve atama durumu burada görünür.
              </p>
            </div>
          )}
        </section>
      </Container>
    </main>
  );
}
