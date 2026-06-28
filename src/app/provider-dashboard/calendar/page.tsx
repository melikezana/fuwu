import type { Metadata } from "next";
import { Calendar, Clock, MapPin, Phone } from "lucide-react";
import {
  getProviderDashboardStatusBadgeView,
  ProviderDashboardRestrictedAreaEmptyState,
  ProviderDashboardShell,
  ProviderStatusBadge,
} from "@/components/dashboard/ProviderDashboardUI";
import { SERVICE_REQUEST_STATUSES, normalizeServiceRequestStatus } from "@/lib/constants/statuses";
import { getServerAuthContext } from "@/services/auth/server";
import { getProviderDashboardAccess } from "@/services/providers/dashboard";
import { getProviderAssignedRequests } from "@/services/requests";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Takvim | Usta Paneli",
};

const STATUS_LABELS: Record<string, { label: string; tone: "green" | "orange" }> = {
  accepted: { label: "Kabul edildi", tone: "green" },
  in_progress: { label: "Devam ediyor", tone: "orange" },
  assigned: { label: "Atandı", tone: "orange" },
};

type JobItem = {
  address: string;
  category: string;
  customerName: string;
  district: string;
  id: string;
  phone: string;
  preferredDate: string | null;
  preferredTime: string | null;
  status: string;
  urgencyType: string;
};

function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date(value));
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getTomorrowStr() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
}

function CalendarEmptyState() {
  return (
    <div
      className="rounded-lg border border-[rgba(23,116,95,0.24)] bg-[var(--trust-green-soft)] p-6 text-center"
      role="status"
    >
      <Calendar className="mx-auto h-8 w-8 text-[var(--trust-green)]" aria-hidden />
      <p className="mt-3 text-sm font-bold text-[var(--trust-green)]">
        Bugün için planlanmış iş yok
      </p>
      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-[var(--muted)]">
        Kabul edilen ve tarihi belirlenen işler burada görünecek.
      </p>
    </div>
  );
}

function getActiveJobs(requests: Awaited<ReturnType<typeof getProviderAssignedRequests>>): JobItem[] {
  return requests
    .filter((request) => {
      const normalizedStatus = normalizeServiceRequestStatus(request.status);

      return (
        normalizedStatus === SERVICE_REQUEST_STATUSES.accepted ||
        normalizedStatus === SERVICE_REQUEST_STATUSES.inProgress ||
        normalizedStatus === SERVICE_REQUEST_STATUSES.assigned
      );
    })
    .map((request) => ({
      address: request.address,
      category: request.category,
      customerName: request.customerName,
      district: request.district,
      id: request.id,
      phone: request.phone,
      preferredDate: request.preferredDate ?? null,
      preferredTime: request.preferredTime ?? null,
      status: request.status,
      urgencyType: request.urgencyType,
    }));
}

function groupJobsByDate(activeJobs: JobItem[]) {
  const grouped: Record<string, JobItem[]> = {};

  for (const job of activeJobs) {
    const key = job.preferredDate ?? "esnek";
    grouped[key] ??= [];
    grouped[key].push(job);
  }

  return grouped;
}

export default async function ProviderCalendarPage() {
  const [providerAccess, authContext] = await Promise.all([
    getProviderDashboardAccess(),
    getServerAuthContext(),
  ]);
  const statusBadge = getProviderDashboardStatusBadgeView(
    providerAccess.ok
      ? providerAccess.application?.status
      : providerAccess.applicationStatus,
    providerAccess.ok,
  );
  const liveRequests =
    providerAccess.ok && authContext.supabase
      ? await getProviderAssignedRequests(providerAccess.profile.id, authContext.supabase)
      : [];
  const activeJobs = getActiveJobs(liveRequests);
  const today = getTodayStr();
  const tomorrow = getTomorrowStr();
  const grouped = groupJobsByDate(activeJobs);
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === "esnek") return 1;
    if (b === "esnek") return -1;
    return a.localeCompare(b);
  });
  const todayCount = (grouped[today] ?? []).length;
  const upcomingCount = activeJobs.filter((job) => job.preferredDate && job.preferredDate > today).length;
  const flexCount = (grouped.esnek ?? []).length;

  return (
    <ProviderDashboardShell
      active="calendar"
      description="Kabul ettiğin taleplerin tarih ve saat planını takip et."
      providerName={providerAccess.ok ? providerAccess.profile.name : undefined}
      statusLabel={statusBadge.label}
      statusTone={statusBadge.tone}
      title="Takvim"
    >
      {providerAccess.ok ? (
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { highlight: true, label: "Bugün", sub: "planlı iş", value: todayCount },
              { highlight: false, label: "Yakında", sub: "gelecek işler", value: upcomingCount },
              { highlight: false, label: "Tarihi esnek", sub: "netleştirilmedi", value: flexCount },
            ].map((item) => (
              <div
                className={`relative overflow-hidden rounded-lg border p-5 shadow-[var(--shadow-card)] ${
                  item.highlight
                    ? "border-[rgba(255,138,0,0.4)] bg-[var(--brand-orange-soft)]"
                    : "border-[rgba(255,138,0,0.24)] bg-white"
                }`}
                key={item.label}
              >
                <span className="absolute inset-x-0 top-0 h-1 bg-[var(--brand-orange)]" aria-hidden />
                <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">{item.label}</p>
                <p className="mt-3 text-3xl font-bold text-[var(--brand-navy)]">{item.value}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{item.sub}</p>
              </div>
            ))}
          </div>

          <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
            <div className="mb-5 cursor-default select-none">
              <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">İş takvimi</p>
              <h2 className="mt-2 text-xl font-bold text-[var(--brand-navy)]">Planlanmış işler</h2>
            </div>

            {activeJobs.length > 0 ? (
              <div className="grid gap-6">
                {sortedKeys.map((dateKey) => {
                  const dayLabel =
                    dateKey === "esnek"
                      ? "Tarihi esnek"
                      : dateKey === today
                        ? `Bugün - ${formatDisplayDate(dateKey)}`
                        : dateKey === tomorrow
                          ? `Yarın - ${formatDisplayDate(dateKey)}`
                          : formatDisplayDate(dateKey);

                  return (
                    <div key={dateKey}>
                      <div className="mb-3 flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-md ${
                            dateKey === today
                              ? "bg-[var(--brand-orange)] text-white"
                              : "bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]"
                          }`}
                        >
                          <Calendar className="h-4 w-4" aria-hidden />
                        </div>
                        <h3 className="text-sm font-bold text-[var(--brand-navy)]">{dayLabel}</h3>
                        <span className="rounded-full bg-[var(--brand-orange-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--brand-orange-dark)]">
                          {grouped[dateKey].length} iş
                        </span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {grouped[dateKey].map((job) => {
                          const statusInfo = STATUS_LABELS[job.status] ?? {
                            label: job.status,
                            tone: "orange" as const,
                          };

                          return (
                            <article
                              className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4"
                              key={job.id}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-semibold text-[var(--brand-navy)]">{job.category}</p>
                                  {job.urgencyType === "emergency" ? (
                                    <span className="mt-1 inline-block rounded-md bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">
                                      ACİL
                                    </span>
                                  ) : null}
                                </div>
                                <ProviderStatusBadge tone={statusInfo.tone}>{statusInfo.label}</ProviderStatusBadge>
                              </div>
                              <div className="mt-3 grid gap-1.5 text-sm font-semibold text-[var(--muted)]">
                                <span className="font-semibold text-[var(--brand-navy)]">{job.customerName}</span>
                                <span className="flex items-center gap-1.5">
                                  <Phone className="h-3.5 w-3.5" aria-hidden />
                                  {job.phone}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                                  {job.district} - {job.address}
                                </span>
                                {job.preferredTime ? (
                                  <span className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" aria-hidden />
                                    {job.preferredTime}
                                  </span>
                                ) : null}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <CalendarEmptyState />
            )}
          </section>
        </div>
      ) : (
        <ProviderDashboardRestrictedAreaEmptyState />
      )}
    </ProviderDashboardShell>
  );
}
