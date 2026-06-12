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
  getAdminAccess,
  getAdminServiceRequests,
  updateAdminServiceRequestStatus,
  type AdminServiceRequest,
  type AdminServiceRequestStatus,
} from "@/services/admin";
import {
  SERVICE_REQUEST_STATUS_DESCRIPTIONS,
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_STATUSES,
  getAllowedServiceRequestTransitions,
  isServiceRequestTransitionAllowed,
  normalizeServiceRequestStatus,
} from "@/lib/constants/statuses";
import { AssignProviderSection } from "./AssignProviderSection";
import { getPaymentPreferenceLabel } from "@/services/payments";
import { liveTrackingSoonText } from "@/services/tracking";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Talepler | Admin",
  description: "Fuwu hizmet talepleri için admin görünümü.",
};

const adminServiceRequestsPath = "/admin/service-requests";

type SearchParams = Record<string, string | string[] | undefined>;

type AdminServiceRequestsPageProps = {
  searchParams?: Promise<SearchParams>;
};

type RequestActionFeedback = {
  body: string;
  title: string;
  tone: "error" | "success";
};

const requestActionMessages: Record<string, RequestActionFeedback> = {
  "admin-not-authorized": {
    body: "Bu işlemi tamamlamak için admin rolüne sahip bir Supabase oturumu gerekiyor.",
    title: "Admin yetkisi gerekli",
    tone: "error",
  },
  "service-request-action-failed": {
    body: "Supabase işlemi tamamlanamadı. Admin yetkisini ve bağlantı ayarlarını kontrol edip tekrar deneyin.",
    title: "Durum güncellenemedi",
    tone: "error",
  },
  "service-request-invalid-status": {
    body: "Seçilen durum bu hizmet talebi için geçerli değil.",
    title: "Geçersiz durum",
    tone: "error",
  },
  "service-request-invalid-id": {
    body: "Talep kimliği geçerli bir UUID değil. Sayfayı yenileyip tekrar deneyin.",
    title: "Geçersiz talep kimliği",
    tone: "error",
  },
  "service-request-invalid-provider": {
    body: "Usta kimliği geçerli bir UUID değil. Listeden tekrar seçim yapın.",
    title: "Geçersiz usta kimliği",
    tone: "error",
  },
  "service-request-invalid-transition": {
    body: "Bu talep mevcut durumundan seçilen duruma doğrudan geçirilemez. Önce operasyon sırasındaki bir sonraki adımı seçin.",
    title: "Durum sırası korunuyor",
    tone: "error",
  },
  "service-request-missing-id": {
    body: "Talep kimliği alınamadı. Sayfayı yenileyip işlemi tekrar deneyin.",
    title: "İşlem yapılamadı",
    tone: "error",
  },
  "service-request-missing-provider": {
    body: "Atanacak usta seçilmedi. Lütfen listeden uygun bir usta seçin.",
    title: "Usta seçimi gerekli",
    tone: "error",
  },
  "service-request-not-found": {
    body: "İlgili hizmet talebi bulunamadı veya bu kayıt için admin yetkisi yok.",
    title: "Talep bulunamadı",
    tone: "error",
  },
  "service-request-updated": {
    body: "Hizmet talebinin durumu Supabase üzerinde güncellendi.",
    title: "Durum güncellendi",
    tone: "success",
  },
  "supabase-not-configured": {
    body: "Supabase ortam değişkenleri tanımlı olmadığı için işlem yapılamadı.",
    title: "Supabase bağlı değil",
    tone: "error",
  },
};

const requestStatusActions: Array<{
  label: string;
  status: AdminServiceRequestStatus;
  tone: "approve" | "neutral" | "reject";
}> = [
  {
    label: SERVICE_REQUEST_STATUS_LABELS.pending,
    status: SERVICE_REQUEST_STATUSES.pending,
    tone: "neutral",
  },
  {
    label: SERVICE_REQUEST_STATUS_LABELS.ustaya_yonlendirildi,
    status: SERVICE_REQUEST_STATUSES.ustayaYonlendirildi,
    tone: "neutral",
  },
  {
    label: SERVICE_REQUEST_STATUS_LABELS.accepted,
    status: SERVICE_REQUEST_STATUSES.accepted,
    tone: "approve",
  },
  {
    label: SERVICE_REQUEST_STATUS_LABELS.completed,
    status: SERVICE_REQUEST_STATUSES.completed,
    tone: "approve",
  },
  {
    label: SERVICE_REQUEST_STATUS_LABELS.cancelled,
    status: SERVICE_REQUEST_STATUSES.cancelled,
    tone: "reject",
  },
];

const emergencyRequestStatusActions: Array<{
  label: string;
  status: AdminServiceRequestStatus;
  tone: "approve" | "neutral" | "reject";
}> = [
  {
    label: SERVICE_REQUEST_STATUS_LABELS.pending,
    status: SERVICE_REQUEST_STATUSES.pending,
    tone: "neutral",
  },
  {
    label: SERVICE_REQUEST_STATUS_LABELS.accepted,
    status: SERVICE_REQUEST_STATUSES.accepted,
    tone: "approve",
  },
  {
    label: SERVICE_REQUEST_STATUS_LABELS.on_the_way,
    status: SERVICE_REQUEST_STATUSES.onTheWay,
    tone: "neutral",
  },
  {
    label: SERVICE_REQUEST_STATUS_LABELS.completed,
    status: SERVICE_REQUEST_STATUSES.completed,
    tone: "approve",
  },
  {
    label: SERVICE_REQUEST_STATUS_LABELS.cancelled,
    status: SERVICE_REQUEST_STATUSES.cancelled,
    tone: "reject",
  },
];

function getFormRequestId(formData: FormData) {
  const value = formData.get("requestId");

  return typeof value === "string" ? value.trim() : "";
}

function getFormRequestStatus(formData: FormData) {
  const value = formData.get("status");

  return typeof value === "string" ? value.trim() : "";
}

function redirectToRequestActionMessage(code: string): never {
  revalidatePath(adminServiceRequestsPath);
  redirect(`${adminServiceRequestsPath}?requestAction=${encodeURIComponent(code)}`);
}

async function updateServiceRequestStatusAction(formData: FormData) {
  "use server";

  const result = await updateAdminServiceRequestStatus(
    getFormRequestId(formData),
    getFormRequestStatus(formData),
  );
  redirectToRequestActionMessage(result.code);
}

function getSearchParamValue(searchParams: SearchParams, key: string) {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

function getRequestActionFeedback(searchParams: SearchParams) {
  const messageCode = getSearchParamValue(searchParams, "requestAction");

  if (!messageCode) {
    return null;
  }

  return requestActionMessages[messageCode] ?? null;
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPreferredDate(value: string | null) {
  if (!value) {
    return "Belirtilmedi";
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(year, month - 1, day));
}

function formatPreferredTime(value: string | null) {
  if (!value) {
    return "Belirtilmedi";
  }

  return value.slice(0, 5);
}

function getUrgencyView(urgency: string) {
  const urgencies: Record<
    string,
    { label: string; tone: "green" | "neutral" | "orange" | "red" }
  > = {
    high: { label: "Bu hafta", tone: "orange" },
    low: { label: "Esnek", tone: "neutral" },
    normal: { label: "Normal", tone: "green" },
    urgent: { label: "Acil", tone: "red" },
  };

  return urgencies[urgency] ?? { label: urgency, tone: "neutral" };
}

function getRequestStatusView(status: string) {
  const normalizedStatus = normalizeServiceRequestStatus(status);
  const normalizedStatusTones: Record<
    AdminServiceRequestStatus,
    "green" | "neutral" | "orange" | "red"
  > = {
    [SERVICE_REQUEST_STATUSES.pending]: "orange",
    [SERVICE_REQUEST_STATUSES.accepted]: "green",
    [SERVICE_REQUEST_STATUSES.onTheWay]: "orange",
    [SERVICE_REQUEST_STATUSES.completed]: "green",
    [SERVICE_REQUEST_STATUSES.cancelled]: "red",
    [SERVICE_REQUEST_STATUSES.yeni]: "orange",
    [SERVICE_REQUEST_STATUSES.inceleniyor]: "orange",
    [SERVICE_REQUEST_STATUSES.ustayaYonlendirildi]: "neutral",
    [SERVICE_REQUEST_STATUSES.tamamlandi]: "green",
    [SERVICE_REQUEST_STATUSES.iptal]: "red",
  };

  if (normalizedStatus) {
    return {
      label: SERVICE_REQUEST_STATUS_LABELS[normalizedStatus],
      tone: normalizedStatusTones[normalizedStatus],
    };
  }

  const statuses: Record<
    string,
    { label: string; tone: "green" | "neutral" | "orange" | "red" }
  > = {
    cancelled: { label: "İptal", tone: "red" },
    completed: { label: "Tamamlandı", tone: "green" },
    in_progress: { label: "İnceleniyor", tone: "orange" },
    matched: { label: "Ustaya Yönlendirildi", tone: "neutral" },
    open: { label: "Yeni", tone: "orange" },
  };

  return statuses[status] ?? { label: status, tone: "neutral" };
}

function RequestStatusBadge({ status }: { status: string }) {
  const statusView = getRequestStatusView(status);

  return (
    <AdminStatusBadge tone={statusView.tone}>{statusView.label}</AdminStatusBadge>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const urgencyView = getUrgencyView(urgency);

  return (
    <AdminStatusBadge tone={urgencyView.tone}>{urgencyView.label}</AdminStatusBadge>
  );
}

function UrgencyTypeBadge({ urgencyType }: { urgencyType: string }) {
  if (urgencyType !== "emergency") {
    return <AdminStatusBadge tone="neutral">Normal akış</AdminStatusBadge>;
  }

  return <AdminStatusBadge tone="red">Acil Hizmet</AdminStatusBadge>;
}

function EmergencyRequestMeta({ request }: { request: AdminServiceRequest }) {
  if (request.urgencyType !== "emergency") {
    return null;
  }

  return (
    <div className="mt-3 grid gap-2 rounded-md border border-[rgba(255,138,0,0.22)] bg-[var(--brand-orange-soft)] p-3 text-sm font-semibold text-[var(--brand-navy)]">
      <p>
        <span className="font-black">Teklif: </span>
        {request.offeredPrice
          ? `${Number(request.offeredPrice).toLocaleString("tr-TR")} TL`
          : "Belirtilmedi"}
      </p>
      <p>
        <span className="font-black">Ödeme tercihi: </span>
        {getPaymentPreferenceLabel(request.paymentPreference)}
      </p>
      <p>
        <span className="font-black">Doğrulama kodu: </span>
        {request.confirmationCode ?? "Usta kabulünden sonra"}
      </p>
      <p>
        <span className="font-black">Tahmini varış: </span>
        {request.estimatedArrivalText ?? "Usta kabulünden sonra"}
      </p>
      <p>
        <span className="font-black">Acil durum: </span>
        {request.emergencyStatus ?? request.status}
      </p>
      <p>
        <span className="font-black">Canlı takip: </span>
        {liveTrackingSoonText}
      </p>
    </div>
  );
}

function RequestActionNotice({
  feedback,
}: {
  feedback: RequestActionFeedback | null;
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

function RequestActions({ request }: { request: AdminServiceRequest }) {
  const normalizedRequestStatus = normalizeServiceRequestStatus(request.status);
  const actions =
    request.urgencyType === "emergency"
      ? emergencyRequestStatusActions
      : requestStatusActions;
  const nextStatuses = normalizedRequestStatus
    ? getAllowedServiceRequestTransitions(normalizedRequestStatus)
    : [];
  const emergencyStatusesRequiringProvider = new Set<AdminServiceRequestStatus>([
    SERVICE_REQUEST_STATUSES.accepted,
    SERVICE_REQUEST_STATUSES.onTheWay,
    SERVICE_REQUEST_STATUSES.completed,
  ]);

  return (
    <div className="flex max-w-full flex-wrap gap-2 lg:max-w-[34rem]">
      {actions.map((action) => {
        const isCurrentStatus = normalizedRequestStatus === action.status;
        const requiresProviderBeforeTransition =
          request.urgencyType === "emergency" &&
          emergencyStatusesRequiringProvider.has(action.status) &&
          !request.assignedProviderId;
        const isAllowedTransition = normalizedRequestStatus
          ? isServiceRequestTransitionAllowed(normalizedRequestStatus, action.status)
          : true;
        const isDisabled =
          isCurrentStatus || !isAllowedTransition || requiresProviderBeforeTransition;
        const Icon =
          action.status === SERVICE_REQUEST_STATUSES.tamamlandi ||
          action.status === SERVICE_REQUEST_STATUSES.completed ||
          action.status === SERVICE_REQUEST_STATUSES.accepted
            ? adminActionIcons.approve
            : action.status === SERVICE_REQUEST_STATUSES.iptal ||
                action.status === SERVICE_REQUEST_STATUSES.cancelled
              ? adminActionIcons.reject
              : adminActionIcons.status;

        return (
          <form action={updateServiceRequestStatusAction} className="min-w-0 flex-1 sm:flex-none" key={action.status}>
            <input name="requestId" type="hidden" value={request.id} />
            <input name="status" type="hidden" value={action.status} />
            <AdminActionButton
              className="w-full min-w-0 sm:w-auto sm:min-w-[6.5rem]"
              disabled={isDisabled}
              icon={Icon}
              title={
                isCurrentStatus
                  ? `Talep zaten ${action.label.toLocaleLowerCase("tr")}`
                  : requiresProviderBeforeTransition
                    ? "Acil talebi ilerletmeden önce uygun bir usta ata"
                  : !isAllowedTransition
                    ? nextStatuses.length > 0
                      ? `Sıradaki uygun adımlar: ${nextStatuses
                          .map((status) => SERVICE_REQUEST_STATUS_LABELS[status])
                          .join(", ")}`
                      : "Tamamlanan veya iptal edilen talepler tekrar açılamaz"
                  : `Durumu ${action.label} olarak güncelle`
              }
              tone={action.tone}
              type="submit"
            >
              {action.label}
            </AdminActionButton>
          </form>
        );
      })}
    </div>
  );
}

function RequestMobileCard({ request }: { request: AdminServiceRequest }) {
  const normalizedRequestStatus = normalizeServiceRequestStatus(request.status);

  return (
    <AdminMobileCard>
      <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-black text-[var(--brand-navy)]">
            {request.customerName}
          </h2>
          <p className="mt-1 text-sm font-bold text-[var(--muted)]">
            {request.category} · {request.district}
          </p>
        </div>
        <RequestStatusBadge status={request.status} />
      </div>

      <div className="mt-4 grid gap-2 text-sm font-semibold text-[var(--muted)]">
        <p>
          <span className="font-black text-[var(--brand-navy)]">Telefon: </span>
          {request.phone}
        </p>
        <div className="flex flex-wrap gap-2">
          <UrgencyTypeBadge urgencyType={request.urgencyType} />
          <UrgencyBadge urgency={request.urgency} />
          {normalizedRequestStatus ? (
            <AdminStatusBadge tone="neutral">
              {SERVICE_REQUEST_STATUS_DESCRIPTIONS[normalizedRequestStatus]}
            </AdminStatusBadge>
          ) : null}
        </div>
        <p>
          <span className="font-black text-[var(--brand-navy)]">Tercih edilen tarih: </span>
          {formatPreferredDate(request.preferredDate)}
        </p>
        <p>
          <span className="font-black text-[var(--brand-navy)]">Tercih edilen saat: </span>
          {formatPreferredTime(request.preferredTime)}
        </p>
        <p>
          <span className="font-black text-[var(--brand-navy)]">Oluşturulma: </span>
          {formatCreatedAt(request.createdAt)}
        </p>
      </div>

      <EmergencyRequestMeta request={request} />

      <div className="mt-4">
        <RequestActions request={request} />
        <div className="mt-2">
          <AssignProviderSection 
            requestId={request.id} 
            status={request.status} 
            assignedProviderId={request.assignedProviderId}
            assignedProviderName={request.assignedProviderName}
          />
        </div>
      </div>
    </AdminMobileCard>
  );
}

export default async function AdminServiceRequestsPage({
  searchParams,
}: AdminServiceRequestsPageProps) {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.ok) {
    return <AdminAccessGate access={adminAccess} />;
  }

  const [result, resolvedSearchParams] = await Promise.all([
    getAdminServiceRequests(),
    searchParams ?? Promise.resolve({}),
  ]);
  const actionFeedback = getRequestActionFeedback(resolvedSearchParams);

  return (
    <AdminAccessGate access={adminAccess}>
      <AdminPageShell
      active="requests"
      description="Müşteri hizmet taleplerini, iletişim bilgilerini, zaman tercihlerini ve operasyon durumlarını takip et."
      error={result.error}
      isConfigured={result.isConfigured}
      title="Hizmet Talepleri"
    >
      <RequestActionNotice feedback={actionFeedback} />
      {result.rows.length === 0 ? (
        <AdminEmptyState title="Henüz hizmet talebi yok">
          Yeni müşteri talepleri Supabase üzerinde oluştuğunda ad, telefon,
          kategori, ilçe, zaman tercihi ve durum bilgileriyle burada görünecek.
        </AdminEmptyState>
      ) : (
        <>
          <AdminCardGrid>
            {result.rows.map((request) => (
              <RequestMobileCard key={request.id} request={request} />
            ))}
          </AdminCardGrid>

          <AdminTableWrap>
            <table className="w-full min-w-[1580px] text-left text-sm">
              <thead className="bg-[var(--surface-soft)] text-xs font-black uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Müşteri</th>
                  <th className="px-4 py-3">Telefon</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">İlçe</th>
                  <th className="px-4 py-3">Akış</th>
                  <th className="px-4 py-3">Aciliyet</th>
                  <th className="px-4 py-3">Ödeme</th>
                  <th className="px-4 py-3">Kod / ETA</th>
                  <th className="px-4 py-3">Tercih Tarihi</th>
                  <th className="px-4 py-3">Tercih Saati</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Oluşturulma</th>
                  <th className="px-4 py-3">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {result.rows.map((request) => (
                  <tr key={request.id} className="bg-white align-top">
                    <td className="px-4 py-4 font-black text-[var(--brand-navy)]">
                      {request.customerName}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {request.phone}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {request.category}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {request.district}
                    </td>
                    <td className="px-4 py-4">
                      <UrgencyTypeBadge urgencyType={request.urgencyType} />
                    </td>
                    <td className="px-4 py-4">
                      <UrgencyBadge urgency={request.urgency} />
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {request.urgencyType === "emergency"
                        ? `${getPaymentPreferenceLabel(request.paymentPreference)}${
                            request.offeredPrice
                              ? ` · ${Number(request.offeredPrice).toLocaleString("tr-TR")} TL`
                              : ""
                          }`
                        : "Belirtilmedi"}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {request.urgencyType === "emergency" ? (
                        <div className="max-w-[13rem]">
                          <p className="font-black text-[var(--brand-navy)]">
                            {request.confirmationCode ?? "Kod bekliyor"}
                          </p>
                          <p className="mt-1 text-xs leading-5">
                            {request.estimatedArrivalText ?? liveTrackingSoonText}
                          </p>
                        </div>
                      ) : (
                        "Belirtilmedi"
                      )}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {formatPreferredDate(request.preferredDate)}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {formatPreferredTime(request.preferredTime)}
                    </td>
                    <td className="px-4 py-4">
                      <RequestStatusBadge status={request.status} />
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--muted)]">
                      {formatCreatedAt(request.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <RequestActions request={request} />
                      <div className="mt-2">
                        <AssignProviderSection 
                          requestId={request.id} 
                          status={request.status} 
                          assignedProviderId={request.assignedProviderId}
                          assignedProviderName={request.assignedProviderName}
                        />
                      </div>
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
