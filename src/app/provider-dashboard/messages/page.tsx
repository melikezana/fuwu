import type { Metadata } from "next";
import {
  getProviderDashboardStatusBadgeView,
  ProviderDashboardApplicationPlaceholder,
  ProviderDashboardShell,
  ProviderRequestsEmptyState,
  ProviderStatusBadge,
} from "@/components/dashboard/ProviderDashboardUI";
import { RequestChatThread } from "@/components/messaging/RequestChatThread";
import {
  SERVICE_REQUEST_STATUSES,
  SERVICE_REQUEST_STATUS_LABELS,
  normalizeServiceRequestStatus,
} from "@/lib/constants/statuses";
import { getServerAuthContext } from "@/services/auth/server";
import { getUnreadRequestMessageCounts } from "@/services/messaging";
import { getProviderDashboardAccess } from "@/services/providers/dashboard";
import { getProviderAssignedRequests } from "@/services/requests";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mesajlar | Usta Paneli",
  description: "Fuwu usta hesabı müşteri yazışmaları.",
};

type ProviderAssignedRequest = Awaited<ReturnType<typeof getProviderAssignedRequests>>[number];

function canUseProviderRequestChat(request: ProviderAssignedRequest, providerId: string) {
  const normalizedStatus = normalizeServiceRequestStatus(request.status);
  const isAssignedToProvider =
    request.assignedProviderId === providerId ||
    request.acceptedProviderId === providerId;

  return Boolean(
    isAssignedToProvider &&
      (normalizedStatus === SERVICE_REQUEST_STATUSES.assigned ||
        normalizedStatus === SERVICE_REQUEST_STATUSES.accepted ||
        normalizedStatus === SERVICE_REQUEST_STATUSES.inProgress ||
        normalizedStatus === SERVICE_REQUEST_STATUSES.completed),
  );
}

function getRequestStatusLabel(status: string) {
  const normalizedStatus = normalizeServiceRequestStatus(status);

  if (normalizedStatus === SERVICE_REQUEST_STATUSES.assigned) {
    return "Yanıt bekleniyor";
  }

  return normalizedStatus ? SERVICE_REQUEST_STATUS_LABELS[normalizedStatus] : status;
}

export default async function ProviderDashboardMessagesPage() {
  const [providerAccess, authContext] = await Promise.all([
    getProviderDashboardAccess(),
    getServerAuthContext(),
  ]);
  const assignedRequests =
    providerAccess.ok && authContext.supabase
      ? await getProviderAssignedRequests(providerAccess.profile.id, authContext.supabase)
      : [];
  const messageReadyRequests = providerAccess.ok
    ? assignedRequests.filter((request) =>
        canUseProviderRequestChat(request, providerAccess.profile.id),
      )
    : [];
  const unreadMessageCounts =
    providerAccess.ok && authContext.supabase
      ? await getUnreadRequestMessageCounts(
          messageReadyRequests.map((request) => request.id),
          "provider",
          authContext.supabase,
        )
      : {};
  const statusBadge = getProviderDashboardStatusBadgeView(
    providerAccess.ok
      ? providerAccess.application?.status
      : providerAccess.applicationStatus,
    providerAccess.ok,
  );

  return (
    <ProviderDashboardShell
      active="requests"
      description="Müşterilerle açık talep yazışmalarını tek yerden takip et."
      providerName={providerAccess.ok ? providerAccess.profile.name : undefined}
      statusLabel={statusBadge.label}
      statusTone={statusBadge.tone}
      title="Mesajlar"
    >
      {providerAccess.ok ? (
        <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="cursor-default select-none">
              <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">
                Yazışmalar
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--brand-navy)]">
                Müşteri mesajları
              </h2>
            </div>
            <ProviderStatusBadge tone={messageReadyRequests.length > 0 ? "green" : "orange"}>
              {messageReadyRequests.length} açık yazışma
            </ProviderStatusBadge>
          </div>

          {messageReadyRequests.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {messageReadyRequests.map((request) => (
                <article
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4"
                  key={request.id}
                >
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="font-bold text-[var(--brand-navy)]">{request.category}</h3>
                      <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                        {request.customerName} · {request.district}
                      </p>
                    </div>
                    <ProviderStatusBadge tone="orange">
                      {getRequestStatusLabel(request.status)}
                    </ProviderStatusBadge>
                  </div>
                  <RequestChatThread
                    buttonLabel="Mesajları aç"
                    defaultOpen={Boolean(unreadMessageCounts[request.id])}
                    initialUnreadCount={unreadMessageCounts[request.id] ?? 0}
                    isEnabled
                    requestId={request.id}
                    senderRole="provider"
                    title="Müşteriyle yaz"
                  />
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <ProviderRequestsEmptyState />
            </div>
          )}
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
