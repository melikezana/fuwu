import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  AdminActionButton,
  AdminCardGrid,
  AdminEmptyState,
  AdminMobileCard,
  AdminPageShell,
  AdminStatusBadge,
  AdminTableWrap,
  adminActionIcons,
} from "@/components/admin/AdminUI";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import {
  approveAdminProviderApplication,
  getAdminAccess,
  getAdminProviderApplications,
  rejectAdminProviderApplication,
  type AdminProviderApplication,
} from "@/services/admin";

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
    body: "Onaylanmış başvurular bu ekrandan reddedilmedi. Gerekirse ilgili usta kaydını Ustalar ekranından yönetin.",
    title: "Başvuru zaten onaylı",
    tone: "error",
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
  "application-missing-id": {
    body: "Başvuru kimliği alınamadı. Sayfayı yenileyip işlemi tekrar deneyin.",
    title: "İşlem yapılamadı",
    tone: "error",
  },
  "application-not-found": {
    body: "İlgili başvuru bulunamadı veya bu başvuru için admin yetkisi yok.",
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

function redirectToActionMessage(code: string): never {
  revalidatePath(adminProviderApplicationsPath);
  revalidateProviderPublicationPaths();
  redirect(`${adminProviderApplicationsPath}?applicationAction=${encodeURIComponent(code)}`);
}

async function approveProviderApplicationAction(formData: FormData) {
  "use server";

  const result = await approveAdminProviderApplication(getFormApplicationId(formData));
  redirectToActionMessage(result.code);
}

async function rejectProviderApplicationAction(formData: FormData) {
  "use server";

  const result = await rejectAdminProviderApplication(getFormApplicationId(formData));
  redirectToActionMessage(result.code);
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
    approved: { label: "Onaylandı", tone: "green" },
    pending: { label: "Beklemede", tone: "orange" },
    rejected: { label: "Reddedildi", tone: "red" },
  };

  return statuses[status] ?? { label: status, tone: "neutral" };
}

function ApplicationStatusBadge({ status }: { status: string }) {
  const statusView = getApplicationStatus(status);

  return (
    <AdminStatusBadge tone={statusView.tone}>{statusView.label}</AdminStatusBadge>
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
      className={`mb-6 rounded-lg border p-4 shadow-[0_12px_34px_rgba(13,20,36,0.05)] ${toneClasses}`}
      role={feedback.tone === "success" ? "status" : "alert"}
    >
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div>
          <p className="text-sm font-black">{feedback.title}</p>
          <p className="mt-1 text-sm font-semibold leading-6">{feedback.body}</p>
        </div>
      </div>
    </div>
  );
}

function ApplicationActions({
  application,
}: {
  application: AdminProviderApplication;
}) {
  const isPending = application.status === "pending";
  const isApproved = application.status === "approved";
  const isRejected = application.status === "rejected";

  return (
    <div className="flex max-w-full flex-wrap gap-2">
      <form action={approveProviderApplicationAction} className="min-w-0 flex-1 sm:flex-none">
        <input name="applicationId" type="hidden" value={application.id} />
        <AdminActionButton
          disabled={!isPending}
          icon={adminActionIcons.approve}
          title={isPending ? "Başvuruyu onayla" : "Yalnızca bekleyen başvurular onaylanır"}
          tone="approve"
          type="submit"
        >
          Onayla
        </AdminActionButton>
      </form>
      <form action={rejectProviderApplicationAction} className="min-w-0 flex-1 sm:flex-none">
        <input name="applicationId" type="hidden" value={application.id} />
        <AdminActionButton
          disabled={!isPending}
          icon={adminActionIcons.reject}
          title={
            isPending
              ? "Başvuruyu reddet"
              : isApproved
              ? "Onaylanmış başvuru bu ekrandan reddedilemez"
              : isRejected
                ? "Başvuru zaten reddedildi"
                : "Yalnızca bekleyen başvurular reddedilir"
          }
          tone="reject"
          type="submit"
        >
          Reddet
        </AdminActionButton>
      </form>
    </div>
  );
}

function ApplicationMobileCard({
  application,
}: {
  application: AdminProviderApplication;
}) {
  return (
    <AdminMobileCard>
      <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-black text-[var(--brand-navy)]">
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
          <span className="font-black text-[var(--brand-navy)]">Deneyim: </span>
          {application.experience}
        </p>
        <p>
          <span className="font-black text-[var(--brand-navy)]">Telefon: </span>
          {application.phone}
        </p>
        <p>
          <span className="font-black text-[var(--brand-navy)]">WhatsApp: </span>
          {application.whatsapp}
        </p>
        <p>
          <span className="font-black text-[var(--brand-navy)]">Tarih: </span>
          {formatDate(application.createdAt)}
        </p>
        <p className="break-words">
          <span className="font-black text-[var(--brand-navy)]">Açıklama: </span>
          {application.description}
        </p>
      </div>

      <div className="mt-4">
        <ApplicationActions application={application} />
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

  const [result, resolvedSearchParams] = await Promise.all([
    getAdminProviderApplications(),
    searchParams ?? Promise.resolve({}),
  ]);
  const actionFeedback = getApplicationActionFeedback(resolvedSearchParams);

  return (
    <AdminAccessGate access={adminAccess}>
      <AdminPageShell
      active="applications"
      description="Usta adaylarının başvuru bilgilerini ve değerlendirme durumlarını takip et."
      error={result.error}
      isConfigured={result.isConfigured}
      title="Başvurular"
    >
      <ApplicationActionNotice feedback={actionFeedback} />
      {result.rows.length === 0 ? (
        <AdminEmptyState title="Bekleyen başvuru yok">
          Yeni usta başvuruları geldiğinde onay ve ret aksiyonlarıyla burada
          görünecek.
        </AdminEmptyState>
      ) : (
        <>
          <AdminCardGrid>
            {result.rows.map((application) => (
              <ApplicationMobileCard
                application={application}
                key={application.id}
              />
            ))}
          </AdminCardGrid>

          <AdminTableWrap>
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="bg-[var(--surface-soft)] text-xs font-black uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Ad Soyad</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">İlçe</th>
                  <th className="px-4 py-3">Deneyim</th>
                  <th className="px-4 py-3">Telefon</th>
                  <th className="px-4 py-3">WhatsApp</th>
                  <th className="px-4 py-3">Açıklama</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {result.rows.map((application) => (
                  <tr key={application.id} className="bg-white">
                    <td className="px-4 py-4 font-black text-[var(--brand-navy)]">
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
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {application.whatsapp}
                    </td>
                    <td className="max-w-[20rem] px-4 py-4 font-semibold leading-6 text-[var(--muted)]">
                      {application.description}
                    </td>
                    <td className="px-4 py-4">
                      <ApplicationStatusBadge status={application.status} />
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {formatDate(application.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <ApplicationActions application={application} />
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
