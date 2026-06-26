import type { Metadata } from "next";
import { Calendar, Clock, MapPin, Phone } from "lucide-react";
import { ProviderDashboardShell, ProviderStatusBadge } from "@/components/dashboard/ProviderDashboardUI";
import { getProviderDashboardAccess } from "@/services/providers/dashboard";
import { getServerAuthContext } from "@/services/auth/server";
import { getProviderAssignedRequests } from "@/services/requests";
import { SERVICE_REQUEST_STATUSES, normalizeServiceRequestStatus } from "@/lib/constants/statuses";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Takvim | Usta Paneli" };

type MockJob = {
  id: string; category: string; customerName: string; phone: string;
  district: string; address: string; preferredDate: string | null;
  preferredTime: string | null; status: "accepted" | "in_progress" | "assigned";
  urgencyType: "standard" | "emergency";
};

const MOCK_JOBS: MockJob[] = [
  { id: "1", category: "Elektrik Tesisatı", customerName: "Mehmet Kaya", phone: "0532 xxx xx xx", district: "Kadıköy", address: "Moda Cad. No:12", preferredDate: "2026-06-28", preferredTime: "10:00", status: "accepted", urgencyType: "standard" },
  { id: "2", category: "Su Tesisatı", customerName: "Ayşe Demir", phone: "0541 xxx xx xx", district: "Üsküdar", address: "Çamlıca Sk. No:5", preferredDate: "2026-06-28", preferredTime: "14:00", status: "in_progress", urgencyType: "emergency" },
  { id: "3", category: "Kombi Bakımı", customerName: "Ali Çelik", phone: "0555 xxx xx xx", district: "Beşiktaş", address: "Etiler Mah. No:8", preferredDate: "2026-06-29", preferredTime: "09:30", status: "accepted", urgencyType: "standard" },
  { id: "4", category: "Elektrik Tesisatı", customerName: "Fatma Arslan", phone: "0543 xxx xx xx", district: "Şişli", address: "Halaskargazi Cad.", preferredDate: "2026-06-29", preferredTime: "15:00", status: "accepted", urgencyType: "standard" },
  { id: "5", category: "Tesisat Tamiri", customerName: "Hasan Yıldız", phone: "0537 xxx xx xx", district: "Maltepe", address: "Bağlarbaşı Sk.", preferredDate: "2026-06-30", preferredTime: "11:00", status: "accepted", urgencyType: "standard" },
  { id: "6", category: "Elektrik Arıza", customerName: "Zeynep Kurt", phone: "0549 xxx xx xx", district: "Ataşehir", address: "Ataşehir Bulvarı", preferredDate: null, preferredTime: null, status: "assigned", urgencyType: "standard" },
];

const STATUS_LABELS: Record<string, { label: string; tone: "green" | "orange" }> = {
  accepted: { label: "Kabul edildi", tone: "green" },
  in_progress: { label: "Devam ediyor", tone: "orange" },
  assigned: { label: "Atandı", tone: "orange" },
};

function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date(value));
}
function getTodayStr() { return new Date().toISOString().split("T")[0]; }
function getTomorrowStr() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; }

type JobItem = { id: string; category: string; customerName: string; phone: string; district: string; address: string; preferredDate: string | null; preferredTime: string | null; status: string; urgencyType: string };

export default async function ProviderCalendarPage() {
  const [providerAccess, authContext] = await Promise.all([
    getProviderDashboardAccess(),
    getServerAuthContext(),
  ]);

  const liveRequests = providerAccess.ok && authContext.supabase
    ? await getProviderAssignedRequests(providerAccess.profile.id, authContext.supabase)
    : null;

  const activeJobs: JobItem[] = liveRequests
    ? liveRequests.filter((r) => {
        const norm = normalizeServiceRequestStatus(r.status);
        return norm === SERVICE_REQUEST_STATUSES.accepted || norm === SERVICE_REQUEST_STATUSES.inProgress || norm === SERVICE_REQUEST_STATUSES.assigned;
      }).map((r) => ({ id: r.id, category: r.category, customerName: r.customerName, phone: r.phone, district: r.district, address: r.address, preferredDate: r.preferredDate ?? null, preferredTime: r.preferredTime ?? null, status: r.status, urgencyType: r.urgencyType }))
    : MOCK_JOBS;

  const today = getTodayStr();
  const tomorrow = getTomorrowStr();
  const grouped: Record<string, JobItem[]> = {};
  for (const job of activeJobs) {
    const key = job.preferredDate ?? "esnek";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(job);
  }
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === "esnek") return 1; if (b === "esnek") return -1; return a.localeCompare(b);
  });

  const todayCount = (grouped[today] ?? []).length;
  const upcomingCount = activeJobs.filter((j) => j.preferredDate && j.preferredDate > today).length;
  const flexCount = (grouped["esnek"] ?? []).length;
  const providerName = providerAccess.ok ? providerAccess.profile.name : "Demo Usta";

  return (
    <ProviderDashboardShell
      active="calendar"
      description="Kabul ettiğin taleplerin tarih ve saat planını takip et."
      providerName={providerName}
      statusLabel={providerAccess.ok ? "Usta hesabınız aktif" : "Demo modu"}
      statusTone={providerAccess.ok ? "green" : "orange"}
      title="Takvim"
    >
      <div className="grid gap-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          📊 {liveRequests ? "Gerçek plan gösteriliyor." : "Demo veriler gösteriliyor. Usta hesabı ile giriş yapıldığında gerçek planınız görünür."}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[{ label: "Bugün", value: todayCount, sub: "planlı iş", highlight: true }, { label: "Yakında", value: upcomingCount, sub: "gelecek işler", highlight: false }, { label: "Tarihi esnek", value: flexCount, sub: "netleştirilmedi", highlight: false }].map((item) => (
            <div key={item.label} className={`relative overflow-hidden rounded-lg border p-5 shadow-[var(--shadow-card)] ${item.highlight ? "border-[rgba(255,138,0,0.4)] bg-[var(--brand-orange-soft)]" : "border-[rgba(255,138,0,0.24)] bg-white"}`}>
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
          <div className="grid gap-6">
            {sortedKeys.map((dateKey) => {
              const dayLabel = dateKey === "esnek" ? "Tarihi esnek" : dateKey === today ? `Bugün — ${formatDisplayDate(dateKey)}` : dateKey === tomorrow ? `Yarın — ${formatDisplayDate(dateKey)}` : formatDisplayDate(dateKey);
              return (
                <div key={dateKey}>
                  <div className="mb-3 flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-md ${dateKey === today ? "bg-[var(--brand-orange)] text-white" : "bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]"}`}>
                      <Calendar className="h-4 w-4" aria-hidden />
                    </div>
                    <h3 className="text-sm font-bold text-[var(--brand-navy)]">{dayLabel}</h3>
                    <span className="rounded-full bg-[var(--brand-orange-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--brand-orange-dark)]">{grouped[dateKey].length} iş</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {grouped[dateKey].map((job) => {
                      const statusInfo = STATUS_LABELS[job.status] ?? { label: job.status, tone: "orange" as const };
                      return (
                        <article key={job.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-[var(--brand-navy)]">{job.category}</p>
                              {job.urgencyType === "emergency" && <span className="mt-1 inline-block rounded-md bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">ACİL</span>}
                            </div>
                            <ProviderStatusBadge tone={statusInfo.tone}>{statusInfo.label}</ProviderStatusBadge>
                          </div>
                          <div className="mt-3 grid gap-1.5 text-sm font-semibold text-[var(--muted)]">
                            <span className="font-semibold text-[var(--brand-navy)]">{job.customerName}</span>
                            <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" aria-hidden />{job.phone}</span>
                            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" aria-hidden />{job.district} — {job.address}</span>
                            {job.preferredTime && <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" aria-hidden />{job.preferredTime}</span>}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </ProviderDashboardShell>
  );
}
