import type { Metadata } from "next";
import {
  getProviderDashboardStatusBadgeView,
  ProviderDashboardApplicationPlaceholder,
  ProviderDashboardShell,
  ProviderStatusBadge,
  ProviderRequestsEmptyState,
} from "@/components/dashboard/ProviderDashboardUI";
import { getServerAuthContext } from "@/services/auth/server";
import { getProviderAvailabilityLabel } from "@/lib/constants/providers";
import { getProviderDashboardAccess } from "@/services/providers/dashboard";
import { getProviderAssignedRequests } from "@/services/requests";
import { providerUpdateRequestStatusAction } from "./actions";
import {
  PROVIDER_AVAILABILITY_STATUSES,
  SERVICE_REQUEST_STATUSES,
  SERVICE_REQUEST_STATUS_LABELS,
  normalizeServiceRequestStatus,
  type ServiceRequestStatus,
} from "@/lib/constants/statuses";
import { getBudgetTagLabel } from "@/services/matching/budget";
import { getPaymentPreferenceLabel } from "@/services/payments";
import { liveTrackingSoonText } from "@/services/tracking";

export const dynamic = "force-dynamic";

type ProviderAssignedRequest = Awaited<ReturnType<typeof getProviderAssignedRequests>>[number];

type ProviderRequestActionStatus =
  Exclude<
    ServiceRequestStatus,
    typeof SERVICE_REQUEST_STATUSES.pending | typeof SERVICE_REQUEST_STATUSES.assigned
  >;

type ProviderRequestsSearchParams = {
  requestAction?: string | string[];
};

type ProviderDashboardRequestsPageProps = {
  searchParams?: Promise<ProviderRequestsSearchParams>;
};

const providerRequestActionMessages: Record<
  string,
  { body: string; tone: "error" | "success"; title: string }
> = {
  "provider-not-authorized": {
    body: "Usta hesabın aktif ve onaylı değilse talep yanıtlanamaz.",
    title: "İşlem yapılamadı",
    tone: "error",
  },
  "request-accepted": {
    body: "Talep kabul edildi ve müşteri bilgilendirildi.",
    title: "Kabul edildi",
    tone: "success",
  },
  "request-action-failed": {
    body: "Kabul işlemi başarısız oldu.",
    title: "İşlem başarısız",
    tone: "error",
  },
  "request-invalid-id": {
    body: "Talep kimliği geçerli değil.",
    title: "Geçersiz talep",
    tone: "error",
  },
  "request-invalid-status": {
    body: "Bu talep şu anda yanıtlanamaz.",
    title: "Durum uygun değil",
    tone: "error",
  },
  "request-not-assigned": {
    body: "Bu talep sana atanmadı.",
    title: "Atama doğrulanamadı",
    tone: "error",
  },
  "request-rejected": {
    body: "Talep reddedildi ve müşteri bilgilendirildi.",
    title: "Reddedildi",
    tone: "success",
  },
  "request-updated": {
    body: "Talep durumu güncellendi.",
    title: "İşlem tamamlandı",
    tone: "success",
  },
  "supabase-not-configured": {
    body: "Kabul işlemi başarısız oldu.",
    title: "Sistem bağlantısı yok",
    tone: "error",
  },
};

function getSearchParamValue(
  searchParams: ProviderRequestsSearchParams | undefined,
  key: keyof ProviderRequestsSearchParams,
) {
  const value = searchParams?.[key];

  return Array.isArray(value) ? value[0] : value;
}

function ProviderRequestActionNotice({
  code,
}: {
  code?: string;
}) {
  const feedback = code ? providerRequestActionMessages[code] : null;

  if (!feedback) {
    return null;
  }

  const className =
    feedback.tone === "success"
      ? "border-[rgba(23,116,95,0.24)] bg-[var(--trust-green-soft)] text-[var(--trust-green)]"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div
      className={`mb-5 rounded-lg border p-4 ${className}`}
      role={feedback.tone === "success" ? "status" : "alert"}
    >
      <p className="text-sm font-semibold">{feedback.title}</p>
      <p className="mt-1 text-sm font-semibold leading-6">{feedback.body}</p>
    </div>
  );
}

function ProviderRequestActionButton({
  label,
  requestId,
  status,
  tone,
}: {
  label: string;
  requestId: string;
  status: ProviderRequestActionStatus;
  tone: "green" | "neutral" | "red";
}) {
  const toneClassName =
    tone === "green"
      ? "border-[rgba(23,116,95,0.24)] bg-[var(--trust-green-soft)] text-[var(--trust-green)] hover:bg-[rgba(23,116,95,0.15)]"
      : tone === "red"
        ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        : "border-[var(--border)] bg-white text-[var(--brand-navy)] hover:bg-[var(--surface-soft)]";

  return (
    <form action={providerUpdateRequestStatusAction}>
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors active:scale-[0.98] ${toneClassName}`}
      >
        {label}
      </button>
    </form>
  );
}

function ProviderEmergencyActions({ request }: { request: ProviderAssignedRequest }) {
  if (request.urgencyType !== "emergency") {
    return null;
  }

  const isWaitingForAcceptance =
    normalizeServiceRequestStatus(request.status) === SERVICE_REQUEST_STATUSES.assigned;

  if (isWaitingForAcceptance) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        <ProviderRequestActionButton label="Kabul Et" requestId={request.id} status={SERVICE_REQUEST_STATUSES.accepted} tone="green" />
        <ProviderRequestActionButton label="Reddet" requestId={request.id} status={SERVICE_REQUEST_STATUSES.rejected} tone="red" />
      </div>
    );
  }

  if (request.status === SERVICE_REQUEST_STATUSES.accepted) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        <ProviderRequestActionButton label="Yola çıktım" requestId={request.id} status={SERVICE_REQUEST_STATUSES.inProgress} tone="neutral" />
        <ProviderRequestActionButton label="Tamamla" requestId={request.id} status={SERVICE_REQUEST_STATUSES.completed} tone="green" />
      </div>
    );
  }

  if (normalizeServiceRequestStatus(request.status) === SERVICE_REQUEST_STATUSES.inProgress) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        <ProviderRequestActionButton label="Tamamla" requestId={request.id} status={SERVICE_REQUEST_STATUSES.completed} tone="green" />
        <ProviderRequestActionButton label="İptal" requestId={request.id} status={SERVICE_REQUEST_STATUSES.cancelled} tone="red" />
      </div>
    );
  }

  return null;
}

function ProviderStandardActions({ request }: { request: ProviderAssignedRequest }) {
  if (request.urgencyType === "emergency") {
    return null;
  }

  const isWaitingForAcceptance =
    normalizeServiceRequestStatus(request.status) === SERVICE_REQUEST_STATUSES.assigned;

  if (isWaitingForAcceptance) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        <ProviderRequestActionButton label="Kabul Et" requestId={request.id} status={SERVICE_REQUEST_STATUSES.accepted} tone="green" />
        <ProviderRequestActionButton label="Reddet" requestId={request.id} status={SERVICE_REQUEST_STATUSES.rejected} tone="red" />
      </div>
    );
  }

  if (request.status === SERVICE_REQUEST_STATUSES.accepted) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        <ProviderRequestActionButton label="Tamamla" requestId={request.id} status={SERVICE_REQUEST_STATUSES.completed} tone="green" />
        <ProviderRequestActionButton label="İptal" requestId={request.id} status={SERVICE_REQUEST_STATUSES.cancelled} tone="red" />
      </div>
    );
  }

  return null;
}

function ProviderRequestActions({ request }: { request: ProviderAssignedRequest }) {
  return request.urgencyType === "emergency" ? (
    <ProviderEmergencyActions request={request} />
  ) : (
    <ProviderStandardActions request={request} />
  );
}

function ProviderRequestStatusText({ status }: { status: string }) {
  const normalizedStatus = normalizeServiceRequestStatus(status);

  if (normalizedStatus === SERVICE_REQUEST_STATUSES.assigned) {
    return "Usta atandı. Yanıt bekleniyor.";
  }

  return normalizedStatus
    ? SERVICE_REQUEST_STATUS_LABELS[normalizedStatus]
    : status;
}

function formatRequestCreatedAt(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getProviderRequestLocation(request: ProviderAssignedRequest) {
  return request.address || request.approximateLocation || "Konum belirtilmedi";
}

function getProviderBudgetOfferText(request: ProviderAssignedRequest) {
  const parts = [
    request.budgetTag ? getBudgetTagLabel(request.budgetTag) || request.budgetTag : null,
    request.budget,
    request.offeredPrice
      ? `${Number(request.offeredPrice).toLocaleString("tr-TR")} TL`
      : null,
  ].filter((part): part is string => Boolean(part));

  return Array.from(new Set(parts)).join(" / ") || "Belirtilmedi";
}

export const metadata: Metadata = {
  title: "Talepler | Usta Paneli",
  description: "Fuwu onaylı ustaları için gelen talep görünümü.",
};

export default async function ProviderDashboardRequestsPage({
  searchParams,
}: ProviderDashboardRequestsPageProps) {
  const resolvedSearchParams = await searchParams;
  const [providerAccess, authContext] = await Promise.all([
    getProviderDashboardAccess(),
    getServerAuthContext(),
  ]);
  const actionCode = getSearchParamValue(resolvedSearchParams, "requestAction");
  
  const assignedRequests = providerAccess.ok && authContext.supabase
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
      active="requests"
      description="Usta hesabına bağlanacak gelen talepler için hazırlanan sade takip alanı."
      providerName={providerAccess.ok ? providerAccess.profile.name : undefined}
      statusLabel={statusBadge.label}
      statusTone={statusBadge.tone}
      title="Gelen Talepler"
    >
      {providerAccess.ok ? (
        <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
          <ProviderRequestActionNotice code={actionCode} />
          <div className="flex flex-col gap-2 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="cursor-default select-none">
              <p className="text-sm font-medium uppercase text-[var(--brand-orange-dark)]">
                Talep listesi
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--brand-navy)]">
                Yeni müşteri talepleri
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <ProviderStatusBadge tone={providerAccess.profile.isApproved ? "green" : "orange"}>
                {providerAccess.profile.isApproved ? "Profil onaylı" : "Profil incelemede"}
              </ProviderStatusBadge>
              <ProviderStatusBadge tone={providerAccess.profile.availability === PROVIDER_AVAILABILITY_STATUSES.musait ? "green" : "orange"}>
                {getProviderAvailabilityLabel(providerAccess.profile.availability)}
              </ProviderStatusBadge>
              <ProviderStatusBadge tone="orange">
                {assignedRequests.length} talep
              </ProviderStatusBadge>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:hidden">
            {assignedRequests.map((request) => (
              <article
                className="rounded-lg border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-subtle)]"
                key={request.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[var(--brand-navy)]">{request.category}</h3>
                    <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                      {request.customerName} - {request.phone}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--brand-orange-soft)] px-2.5 py-1 text-xs font-medium text-[var(--brand-orange-dark)]">
                    <ProviderRequestStatusText status={request.status} />
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm font-semibold text-[var(--muted)]">
                  <p>
                    <span className="font-semibold text-[var(--brand-navy)]">Talep ID: </span>
                    {request.id}
                  </p>
                  <p>
                    <span className="font-semibold text-[var(--brand-navy)]">İlçe: </span>
                    {request.district}
                  </p>
                  <p>
                    <span className="font-semibold text-[var(--brand-navy)]">Adres: </span>
                    {getProviderRequestLocation(request)}
                  </p>
                  <p>
                    <span className="font-semibold text-[var(--brand-navy)]">Detay: </span>
                    {request.description || "Açıklama yok"}
                  </p>
                  <p>
                    <span className="font-semibold text-[var(--brand-navy)]">Bütçe / teklif: </span>
                    {getProviderBudgetOfferText(request)}
                  </p>
                  <p>
                    <span className="font-semibold text-[var(--brand-navy)]">Ödeme tercihi: </span>
                    {getPaymentPreferenceLabel(request.paymentPreference)}
                  </p>
                  <p>
                    <span className="font-semibold text-[var(--brand-navy)]">Durum: </span>
                    <ProviderRequestStatusText status={request.status} />
                  </p>
                  <p>
                    <span className="font-semibold text-[var(--brand-navy)]">Oluşturulma: </span>
                    {formatRequestCreatedAt(request.createdAt)}
                  </p>
                  <p>
                    <span className="font-semibold text-[var(--brand-navy)]">Zaman: </span>
                    {request.preferredDate || "Tarih esnek"} / {request.preferredTime || "Saat esnek"}
                  </p>
                </div>
                <ProviderRequestActions request={request} />
              </article>
            ))}
          </div>

          <div className="mt-5 hidden overflow-x-auto rounded-lg border border-[var(--border)] md:block">
            <div className="grid min-w-[1480px] grid-cols-[11rem_1fr_0.85fr_1.35fr_0.85fr_0.9fr_1fr_1.05fr] bg-[var(--surface-soft)] px-4 py-3 text-xs font-medium uppercase text-[var(--muted)]">
              <span>Talep ID</span>
              <span>Hizmet</span>
              <span>İlçe</span>
              <span>Açıklama</span>
              <span>Bütçe / Ödeme</span>
              <span>Ödeme yöntemi</span>
              <span>Oluşturulma tarihi</span>
              <span>Durum</span>
            </div>
            {assignedRequests.map((request) => (
              <article
                className="flex min-w-[1480px] flex-col gap-3 border-t border-[var(--border)] px-4 py-4 md:grid md:grid-cols-[11rem_1fr_0.85fr_1.35fr_0.85fr_0.9fr_1fr_1.05fr]"
                key={request.id}
              >
                <div className="flex items-center">
                  <span className="break-all font-mono text-xs font-bold text-[var(--muted)]">
                    {request.id}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-[var(--brand-navy)]">{request.category}</span>
                  <span className="mt-1 text-sm text-[var(--muted)]">{request.customerName} - {request.phone}</span>
                  <span className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{request.description || "Açıklama yok"}</span>
                  {request.urgencyType === "emergency" ? (
                    <span className="mt-2 rounded-md bg-[var(--brand-orange-soft)] px-2 py-1 text-xs font-semibold text-[var(--brand-orange-dark)]">
                      Acil Hizmet · {getPaymentPreferenceLabel(request.paymentPreference)}
                      {request.offeredPrice
                        ? ` · ${Number(request.offeredPrice).toLocaleString("tr-TR")} TL`
                        : ""}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col justify-center text-sm font-bold text-[var(--brand-navy)]">
                  <span>{request.district}</span>
                  <span className="mt-1 line-clamp-2 text-xs font-semibold text-[var(--muted)]">
                    {getProviderRequestLocation(request)}
                  </span>
                </div>
                <div className="flex flex-col justify-center text-sm font-semibold leading-6 text-[var(--muted)]">
                  <span className="line-clamp-4">{request.description || "Açıklama yok"}</span>
                </div>
                <div className="flex flex-col justify-center text-sm">
                  <span className="font-bold text-[var(--brand-navy)]">
                    {getProviderBudgetOfferText(request)}
                  </span>
                  <span className="hidden">
                    {getPaymentPreferenceLabel(request.paymentPreference)}
                  </span>
                </div>
                <div className="flex flex-col justify-center text-sm font-bold text-[var(--brand-navy)]">
                  {getPaymentPreferenceLabel(request.paymentPreference)}
                </div>
                <div className="flex flex-col justify-center text-sm">
                  <span className="font-bold text-[var(--brand-navy)]">{formatRequestCreatedAt(request.createdAt)}</span>
                  <span className="text-xs font-semibold text-[var(--muted)]">{request.preferredDate || "Tarih esnek"} / {request.preferredTime || "Saat esnek"}</span>
                  <span className="hidden">
                    Oluşturulma: {formatRequestCreatedAt(request.createdAt)}
                  </span>
                  {request.urgencyType === "emergency" ? (
                    <span className="mt-1 text-xs font-bold text-[var(--brand-orange-dark)]">
                      {request.estimatedArrivalText ?? liveTrackingSoonText}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 justify-center">
                  <span className="text-sm font-bold text-[var(--brand-navy)]">
                    <ProviderRequestStatusText status={request.status} />
                  </span>
                  {request.urgencyType === "emergency" ? (
                    <>
                      <span className="text-xs font-bold text-[var(--muted)]">
                        Kod: {normalizeServiceRequestStatus(request.status) === SERVICE_REQUEST_STATUSES.pending
                          ? "Kabul sonrası"
                          : request.confirmationCode ?? "Kabul sonrası"}
                      </span>
                      <ProviderRequestActions request={request} />
                    </>
                  ) : null}
                  {request.urgencyType !== "emergency" ? (
                    <ProviderRequestActions request={request} />
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-5">
            {assignedRequests.length > 0 ? null : <ProviderRequestsEmptyState />}
          </div>
        </section>
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
