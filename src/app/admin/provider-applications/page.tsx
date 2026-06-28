import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  AdminCardGrid,
  AdminEmptyState,
  AdminMobileCard,
  AdminPageShell,
  AdminStatusBadge,
  AdminTableWrap,
} from "@/components/admin/AdminUI";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import {
  PROVIDER_APPLICATION_STATUSES,
  isProviderApplicationStatus,
  type ProviderApplicationStatus,
} from "@/lib/constants/statuses";
import {
  approveAdminProviderApplication,
  getAdminAccess,
  getAdminProviderApplications,
  rejectAdminProviderApplication,
  type AdminProviderApplication,
} from "@/services/admin";
import { ApplicationActions as ProviderApplicationActions } from "./ApplicationActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Başvurular | Admin",
  description: "Fuwu usta başvuruları için admin görünümü.",
};

const adminProviderApplicationsPath = "/admin/provider-applications";

type SearchParams = Record<string, string | string[] | undefined>;

type AdminProviderApplicationsPageProps = {
  searchParams?: Promise<SearchParams>;
};

type ApplicationActionFeedback = {
  body: string;
  title: string;
  tone: "error" | "success";
};

const applicationActionMessages: Record<string, ApplicationActionFeedback> = {
  "admin-not-authorized": {
    body: "Bu işlemi tamamlamak için admin rolüne sahip bir Supabase oturumu gerekiyor.",
    title: "Admin yetkisi gerekli",
    tone: "error",
  },
  "application-action-failed": {
    body: "Supabase işlemi tamamlanamadı. Admin yetkisini ve bağlantı ayarlarını kontrol edip tekrar deneyin.",
    title: "İşlem tamamlanamadı",
    tone: "error",
  },
  "application-already-approved": {
    body: "Bu başvuru daha önce onaylanmış. Aynı başvurudan ikinci bir usta kaydı oluşturulmadı; ilgili profili Ustalar ekranından yönetin.",
    title: "Başvuru zaten onaylı",
    tone: "success",
  },
  "application-already-rejected": {
    body: "Bu başvuru daha önce reddedilmiş. Pending listesinde yalnızca yeni başvurular işlem alır.",
    title: "Başvuru zaten reddedildi",
    tone: "error",
  },
  "application-approved-provider-exists": {
    body: "Başvuru onaylandı; aynı telefon, kategori ve ilçe için mevcut usta kaydı bulunduğu için ikinci bir kayıt oluşturulmadı.",
    title: "Mevcut usta kaydı korundu",
    tone: "success",
  },
  "application-approved-provider-created": {
    body: "Başvuru onaylandı ve başvuru bilgileriyle yeni, aktif ve onaylı bir usta kaydı oluşturuldu.",
    title: "Başvuru onaylandı",
    tone: "success",
  },
  "application-invalid-id": {
    body: "Başvuru kimliği geçerli değil.",
    title: "Geçersiz başvuru",
    tone: "error",
  },
  "application-invalid-status": {
    body: "Başvuru durumu geçerli değil. İşlem güvenlik nedeniyle uygulanmadı.",
    title: "Geçersiz durum",
    tone: "error",
  },
  "application-missing-id": {
    body: "Başvuru kimliği alınamadı. Sayfayı yenileyip işlemi tekrar deneyin.",
    title: "İşlem yapılamadı",
    tone: "error",
  },
  "application-not-found": {
    body: "Başvuru bulunamadı.",
    title: "Başvuru bulunamadı",
    tone: "error",
  },
  "application-rejected": {
    body: "Başvuru reddedildi ve durumu Supabase üzerinde güncellendi.",
    title: "Başvuru reddedildi",
    tone: "success",
  },
  "provider-create-failed": {
    body: "Yeni usta kaydı oluşturulamadığı için başvuru onaylanmadı.",
    title: "Usta kaydı oluşturulamadı",
    tone: "error",
  },
  "supabase-not-configured": {
    body: "Supabase ortam değişkenleri tanımlı olmadığı için işlem yapılamadı.",
    title: "Supabase bağlı değil",
    tone: "error",
  },
};

function getFormApplicationId(formData: FormData) {
  const value = formData.get("applicationId");

  return typeof value === "string" ? value.trim() : "";
}

function revalidateProviderPublicationPaths() {
  revalidatePath("/");
  revalidatePath("/providers");
  revalidatePath("/providers/[id]", "page");
}

function getFormStatusFilter(formData: FormData) {
  const value = formData.get("returnStatus");
  const status = typeof value === "string" ? value.trim() : "";

  return isProviderApplicationStatus(status) ? status : null;
}

function redirectToActionMessage(
  code: string,
  status?: ProviderApplicationStatus | null,
): never {
  revalidatePath(adminProviderApplicationsPath);
  revalidateProviderPublicationPaths();
  const params = new URLSearchParams({
    applicationAction: code,
  });

  if (status) {
    params.set("status", status);
  }

  redirect(`${adminProviderApplicationsPath}?${params.toString()}`);
}

async function approveProviderApplicationAction(formData: FormData) {
  "use server";

  const result = await approveAdminProviderApplication(getFormApplicationId(formData));
  redirectToActionMessage(result.code, getFormStatusFilter(formData));
}

async function rejectProviderApplicationAction(formData: FormData) {
  "use server";

  const result = await rejectAdminProviderApplication(getFormApplicationId(formData));
  redirectToActionMessage(result.code, getFormStatusFilter(formData));
}

function getSearchParamValue(searchParams: SearchParams, key: string) {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

function getApplicationActionFeedback(searchParams: SearchParams) {
  const messageCode = getSearchParamValue(searchParams, "applicationAction");

  if (!messageCode) {
    return null;
  }

  return applicationActionMessages[messageCode] ?? null;
}

function getApplicationStatusFilter(searchParams: SearchParams) {
  const status = getSearchParamValue(searchParams, "status")?.trim() ?? "";

  return isProviderApplicationStatus(status) ? status : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getApplicationStatus(status: string) {
  const statuses: Record<
    string,
    { label: string; tone: "green" | "neutral" | "orange" | "red" }
  > = {
    [PROVIDER_APPLICATION_STATUSES.approved]: { label: "Onaylandı", tone: "green" },
    [PROVIDER_APPLICATION_STATUSES.pending]: { label: "Beklemede", tone: "orange" },
    [PROVIDER_APPLICATION_STATUSES.rejected]: { label: "Reddedildi", tone: "red" },
  };

  return statuses[status] ?? { label: status, tone: "neutral" };
}

function ApplicationStatusBadge({ status }: { status: string }) {
  const statusView = getApplicationStatus(status);

  return (
    <AdminStatusBadge tone={statusView.tone}>{statusView.label}</AdminStatusBadge>
  );
}

function VerificationDocumentLink({ url }: { url: string | null }) {
  if (!url) {
    return <span className="text-sm font-semibold text-[var(--muted)]">Belge yok</span>;
  }

  return (
    <a
      className="text-sm font-semibold text-[var(--brand-orange-dark)] underline decoration-2 underline-offset-4 hover:text-[var(--brand-navy)]"
      href={url}
      rel="noreferrer"
      target="_blank"
    >
      Belgeyi Görüntüle
    </a>
  );
}

function ApplicationStatusSummary({
  applications,
}: {
  applications: AdminProviderApplication[];
}) {
  const counts = applications.reduce(
    (summary, application) => {
      summary[application.status] = (summary[application.status] ?? 0) + 1;
      return summary;
    },
    {} as Record<string, number>,
  );
  const items = [
    {
      description: "Admin onay\u0131 bekleyen yeni ba\u015fvurular",
      label: "Bekleyen ba\u015fvurular",
      status: PROVIDER_APPLICATION_STATUSES.pending,
    },
    {
      description: "Usta hesab\u0131 aktif edilen ba\u015fvurular",
      label: "Onaylanan ba\u015fvurular",
      status: PROVIDER_APPLICATION_STATUSES.approved,
    },
    {
      description: "De\u011ferlendirme sonucu reddedilen ba\u015fvurular",
      label: "Reddedilen ba\u015fvurular",
      status: PROVIDER_APPLICATION_STATUSES.rejected,
    },
  ];

  return (
    <section className="mb-6 grid gap-3 sm:grid-cols-3" aria-label="Ba\u015fvuru durum \u00f6zeti">
      {items.map((item) => (
        <div
          className="rounded-lg border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-card)]"
          key={item.status}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase text-[var(--muted)]">
                {item.label}
              </p>
              <p className="mt-2 text-3xl font-semibold leading-none text-[var(--brand-navy)]">
                {counts[item.status] ?? 0}
              </p>
            </div>
            <ApplicationStatusBadge status={item.status} />
          </div>
          <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
            {item.description}
          </p>
        </div>
      ))}
    </section>
  );
}

function ApplicationActionNotice({
  feedback,
}: {
  feedback: ApplicationActionFeedback | null;
}) {
  if (!feedback) {
    return null;
  }

  const Icon = feedback.tone === "success" ? CheckCircle2 : AlertTriangle;
  const toneClasses =
    feedback.tone === "success"
      ? "border-[rgba(23,116,95,0.24)] bg-[var(--trust-green-soft)] text-[var(--trust-green)]"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div
      className={`mb-6 rounded-lg border p-4 shadow-[var(--shadow-card)] ${toneClasses}`}
      role={feedback.tone === "success" ? "status" : "alert"}
    >
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div>
          <p className="text-sm font-semibold">{feedback.title}</p>
          <p className="mt-1 text-sm font-semibold leading-6">{feedback.body}</p>
        </div>
      </div>
    </div>
  );
}

function ApplicationMobileCard({
  application,
  statusFilter,
}: {
  application: AdminProviderApplication;
  statusFilter?: ProviderApplicationStatus | null;
}) {
  return (
    <AdminMobileCard>
      <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[var(--brand-navy)]">
            {application.fullName}
          </h2>
          <p className="mt-1 text-sm font-bold text-[var(--muted)]">
            {application.category} · {application.district}
          </p>
        </div>
        <ApplicationStatusBadge status={application.status} />
      </div>

      <div className="mt-4 grid gap-2 text-sm font-semibold text-[var(--muted)]">
        <p>
          <span className="font-semibold text-[var(--brand-navy)]">Deneyim: </span>
          {application.experience}
        </p>
        <p>
          <span className="font-semibold text-[var(--brand-navy)]">Telefon: </span>
          {application.phone}
        </p>

        <p>
          <span className="font-semibold text-[var(--brand-navy)]">Tarih: </span>
          {formatDate(application.createdAt)}
        </p>
        <p>
          <span className="font-semibold text-[var(--brand-navy)]">Belge: </span>
          <VerificationDocumentLink url={application.verificationDocumentUrl} />
        </p>

      </div>

      <div className="mt-4">
        <ProviderApplicationActions
          applicationId={application.id}
          applicationName={application.fullName}
          approveAction={approveProviderApplicationAction}
          phone={application.phone}
          rejectAction={rejectProviderApplicationAction}
          returnStatus={statusFilter}
          status={application.status}
        />
      </div>
    </AdminMobileCard>
  );
}

export default async function AdminProviderApplicationsPage({
  searchParams,
}: AdminProviderApplicationsPageProps) {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.ok) {
    return <AdminAccessGate access={adminAccess} />;
  }

  const resolvedSearchParams = await (searchParams ?? Promise.resolve({}));
  const statusFilter = getApplicationStatusFilter(resolvedSearchParams);
  const result = await getAdminProviderApplications(statusFilter ?? undefined);
  const actionFeedback = getApplicationActionFeedback(resolvedSearchParams);

  return (
    <AdminAccessGate access={adminAccess}>
      <AdminPageShell
      active="applications"
      breadcrumbLabel="Başvurular"
      description="Usta adaylarının başvuru bilgilerini ve değerlendirme durumlarını takip et."
      error={result.error}
      isConfigured={result.isConfigured}
      title="Başvurular"
    >
      <ApplicationActionNotice feedback={actionFeedback} />
      {result.rows.length === 0 ? (
        <AdminEmptyState title="Henüz başvuru yok">
          Yeni usta başvuruları geldiğinde beklemede, onaylandı ve reddedildi
          durumlarıyla burada görünecek.
        </AdminEmptyState>
      ) : (
        <>
          <ApplicationStatusSummary applications={result.rows} />

          <AdminCardGrid>
            {result.rows.map((application) => (
              <ApplicationMobileCard
                application={application}
                key={application.id}
                statusFilter={statusFilter}
              />
            ))}
          </AdminCardGrid>

          <AdminTableWrap>
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[var(--surface-soft)] text-xs font-medium uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Ad Soyad</th>
                  <th className="px-4 py-3">Telefon</th>
                  <th className="px-4 py-3">Hizmet kategorisi</th>
                  <th className="px-4 py-3">{"\u0130l\u00e7e"}</th>
                  <th className="px-4 py-3">Deneyim</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">{"Ba\u015fvuru tarihi"}</th>
                  <th className="px-4 py-3">Belge</th>
                  <th className="px-4 py-3">{"\u0130\u015flem"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {result.rows.map((application) => (
                  <tr key={application.id} className="bg-white">
                    <td className="px-4 py-4 font-semibold text-[var(--brand-navy)]">
                      {application.fullName}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {application.phone}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {application.category}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {application.district}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {application.experience}
                    </td>
                    <td className="px-4 py-4">
                      <ApplicationStatusBadge status={application.status} />
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {formatDate(application.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <VerificationDocumentLink
                        url={application.verificationDocumentUrl}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <ProviderApplicationActions
                        applicationId={application.id}
                        applicationName={application.fullName}
                        approveAction={approveProviderApplicationAction}
                        phone={application.phone}
                        rejectAction={rejectProviderApplicationAction}
                        returnStatus={statusFilter}
                        status={application.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="hidden w-full min-w-[1180px] text-left text-sm">
              <thead className="bg-[var(--surface-soft)] text-xs font-medium uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Ad Soyad</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">İlçe</th>
                  <th className="px-4 py-3">Deneyim</th>
                  <th className="px-4 py-3">Telefon</th>
                  <th className="px-4 py-3">Açıklama</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">Belge</th>
                  <th className="px-4 py-3">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {result.rows.map((application) => (
                  <tr key={application.id} className="bg-white">
                    <td className="px-4 py-4 font-semibold text-[var(--brand-navy)]">
                      {application.fullName}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {application.category}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {application.district}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {application.experience}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {application.phone}
                    </td>
                    <td className="max-w-[20rem] px-4 py-4 font-semibold leading-6 text-[var(--muted)]">
                      {application.description || "-"}
                    </td>
                    <td className="px-4 py-4">
                      <ApplicationStatusBadge status={application.status} />
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {formatDate(application.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <VerificationDocumentLink
                        url={application.verificationDocumentUrl}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <ProviderApplicationActions
                        applicationId={application.id}
                        applicationName={application.fullName}
                        approveAction={approveProviderApplicationAction}
                        phone={application.phone}
                        rejectAction={rejectProviderApplicationAction}
                        returnStatus={statusFilter}
                        status={application.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableWrap>
        </>
      )}
      </AdminPageShell>
    </AdminAccessGate>
  );
}
