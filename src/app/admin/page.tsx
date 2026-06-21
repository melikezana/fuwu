import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ClipboardList,
  FileText,
  UserCheck,
  XCircle,
} from "lucide-react";
import {
  AdminPageShell,
  AdminSummaryCard,
  adminQuickNavItems,
} from "@/components/admin/AdminUI";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import {
  getAdminAccess,
  getAdminDashboardSummary,
  type AdminDashboardSummary,
} from "@/services/admin";
import { 
  getAdminOverviewMetrics,
  getRequestAnalytics,
  getProviderAnalytics,
  getAssignmentMonitoring,
  getLatestAuditLogs,
  type AdminOverviewMetrics,
  type AssignmentMonitoringItem,
  type AuditLogsData,
  type ProviderAnalyticsData,
  type RequestAnalyticsData,
} from "@/services/admin/operations";
import { MetricCard } from "@/components/admin/MetricCard";
import { AdminSection } from "@/components/admin/AdminSection";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyAdminState } from "@/components/admin/EmptyAdminState";
import {
  PROVIDER_APPLICATION_STATUSES,
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_STATUSES,
  normalizeServiceRequestStatus,
} from "@/lib/constants/statuses";
import { appRoutes, buildLoginRedirectUrl } from "@/lib/constants/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Paneli",
  description: "Fuwu iç operasyonları için yetkili admin paneli.",
};

function DashboardErrorState({ error }: { error: string }) {
  return (
    <section
      className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700 shadow-[var(--shadow-card)]"
      role="alert"
    >
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div>
          <h2 className="text-base font-bold">İstatistikler yüklenemedi</h2>
          <p className="mt-1 text-sm font-semibold leading-6">
            {error} Supabase bağlantısını ve admin okuma yetkilerini kontrol
            edin.
          </p>
        </div>
      </div>
    </section>
  );
}

function DashboardSummaryCards({ summary }: { summary: AdminDashboardSummary }) {
  const cards = [
    {
      href: `/admin/provider-applications?status=${PROVIDER_APPLICATION_STATUSES.pending}`,
      icon: ClipboardList,
      label: "Bekleyen Başvurular",
      value: summary.pendingApplications,
    },
    {
      href: "/admin/provider-applications?status=approved",
      icon: UserCheck,
      label: "Onaylanan Başvurular",
      value: summary.approvedApplications,
    },
    {
      href: `/admin/provider-applications?status=${PROVIDER_APPLICATION_STATUSES.rejected}`,
      icon: XCircle,
      label: "Reddedilen Başvurular",
      value: summary.rejectedApplications,
    },
    {
      href: "/admin/service-requests",
      icon: FileText,
      label: "Talepler",
      value: summary.totalServiceRequests,
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <AdminSummaryCard
          href={card.href}
          icon={card.icon}
          key={card.label}
          label={card.label}
          value={card.value}
        />
      ))}
    </section>
  );
}

function OperationalAlerts({ overview }: { overview: AdminOverviewMetrics }) {
  const alerts = [];
  if (overview.onayBekleyenUsta > 0) alerts.push(`${overview.onayBekleyenUsta} onay bekleyen usta başvurusu var.`);
  if (overview.bekleyenTalep > 0) alerts.push(`${overview.bekleyenTalep} atanmamış/bekleyen talep var.`);
  if (overview.aktifUsta < 10) alerts.push("Aktif usta sayısı düşük, platform kapasitesi sınırlı olabilir.");
  
  if (alerts.length === 0) return null;

  return (
    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm font-semibold">
      <h3 className="flex items-center gap-2 mb-2 text-base font-semibold">
        <AlertTriangle className="h-5 w-5" /> Operasyonel Uyarılar
      </h3>
      <ul className="list-disc pl-5 space-y-1">
        {alerts.map((a, i) => <li key={i}>{a}</li>)}
      </ul>
    </div>
  );
}

function OverviewMetrics({ overview }: { overview: AdminOverviewMetrics }) {
  return (
    <AdminSection title="Operasyonel Özet">
      <div className="flex gap-4 min-w-max pb-2">
        <MetricCard label="Toplam Talep" value={overview.toplamTalep} />
        <MetricCard label="Bekleyen Talep" value={overview.bekleyenTalep} />
        <MetricCard label="İncelenen Talep" value={overview.incelenenTalep} />
        <MetricCard label="Ustaya Yönlendirilen" value={overview.ustayaYonlendirildi} />
        <MetricCard label="Tamamlanan" value={overview.tamamlananTalep} />
        <MetricCard label="İptal Edilen" value={overview.iptalEdilenTalep} />
        <MetricCard label="Aktif Usta" value={overview.aktifUsta} />
        <MetricCard label="Onay Bekleyen Usta" value={overview.onayBekleyenUsta} />
      </div>
    </AdminSection>
  );
}

function RequestAnalyticsSection({ analytics }: { analytics: RequestAnalyticsData }) {
  if (!analytics) return null;
  return (
    <AdminSection title="Talep Analitiği">
      <div className="grid md:grid-cols-3 gap-6 min-w-[600px]">
        <div>
          <h4 className="text-sm font-bold text-[var(--muted)] mb-3 uppercase">Duruma Göre</h4>
          {Object.entries(analytics.byStatus).map(([status, count]) => (
            <div key={status} className="flex justify-between text-sm py-1 border-b last:border-0">
              <span className="font-semibold text-[var(--brand-navy)]">{SERVICE_REQUEST_STATUS_LABELS[status as keyof typeof SERVICE_REQUEST_STATUS_LABELS] || status}</span>
              <span className="font-semibold text-[var(--brand-orange)]">{count}</span>
            </div>
          ))}
        </div>
        <div>
          <h4 className="text-sm font-bold text-[var(--muted)] mb-3 uppercase">Kategoriye Göre</h4>
          {Object.entries(analytics.byCategory).map(([cat, count]) => (
            <div key={cat} className="flex justify-between text-sm py-1 border-b last:border-0">
              <span className="font-semibold text-[var(--brand-navy)] truncate pr-2">{cat}</span>
              <span className="font-semibold text-[var(--brand-orange)]">{count}</span>
            </div>
          ))}
        </div>
        <div>
          <h4 className="text-sm font-bold text-[var(--muted)] mb-3 uppercase">İlçeye Göre</h4>
          {Object.entries(analytics.byDistrict).map(([dist, count]) => (
            <div key={dist} className="flex justify-between text-sm py-1 border-b last:border-0">
              <span className="font-semibold text-[var(--brand-navy)] truncate pr-2">{dist}</span>
              <span className="font-semibold text-[var(--brand-orange)]">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminSection>
  );
}

function ProviderAnalyticsSection({ analytics }: { analytics: ProviderAnalyticsData }) {
  if (!analytics) return null;
  return (
    <AdminSection title="Usta Analitiği">
      <div className="flex gap-4 mb-6 min-w-max">
        <MetricCard label="Aktif Ustalar" value={analytics.active} />
        <MetricCard label="Onaylı Ustalar" value={analytics.approved} />
        <MetricCard label="Pasif/Askıda" value={analytics.inactive} />
      </div>
      <div className="grid md:grid-cols-2 gap-6 min-w-[400px]">
        <div>
          <h4 className="text-sm font-bold text-[var(--muted)] mb-3 uppercase">Kategoriye Göre</h4>
          {Object.entries(analytics.byCategory).map(([cat, count]) => (
            <div key={cat} className="flex justify-between text-sm py-1 border-b last:border-0">
              <span className="font-semibold text-[var(--brand-navy)] truncate pr-2">{cat}</span>
              <span className="font-semibold text-[var(--brand-orange)]">{count}</span>
            </div>
          ))}
        </div>
        <div>
          <h4 className="text-sm font-bold text-[var(--muted)] mb-3 uppercase">İlçeye Göre</h4>
          {Object.entries(analytics.byDistrict).map(([dist, count]) => (
            <div key={dist} className="flex justify-between text-sm py-1 border-b last:border-0">
              <span className="font-semibold text-[var(--brand-navy)] truncate pr-2">{dist}</span>
              <span className="font-semibold text-[var(--brand-orange)]">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminSection>
  );
}

function AssignmentMonitoringSection({ assignments }: { assignments: AssignmentMonitoringItem[] }) {
  return (
    <AdminSection title="Aktif Atamalar ve Eşleşmeler" description="Ustaya yönlendirilmiş ancak henüz tamamlanmamış veya yakın zamanda atanmış son 50 talep.">
      {assignments.length === 0 ? (
        <EmptyAdminState message="Şu anda takip edilen atanmış talep bulunmuyor." />
      ) : (
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b-2 border-[var(--border)]">
              <th className="py-3 px-4 text-xs font-bold text-[var(--muted)] uppercase">Müşteri Tel</th>
              <th className="py-3 px-4 text-xs font-bold text-[var(--muted)] uppercase">Kategori & İlçe</th>
              <th className="py-3 px-4 text-xs font-bold text-[var(--muted)] uppercase">Atanan Usta</th>
              <th className="py-3 px-4 text-xs font-bold text-[var(--muted)] uppercase">Durum</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => {
              const normalizedStatus = normalizeServiceRequestStatus(a.status);
              const statusLabel = normalizedStatus
                ? SERVICE_REQUEST_STATUS_LABELS[normalizedStatus]
                : a.status;

              return (
                <tr key={a.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-soft)]">
                  <td className="py-3 px-4 text-sm font-semibold text-[var(--brand-navy)]">{a.customerPhone}</td>
                  <td className="py-3 px-4 text-sm font-semibold text-[var(--brand-navy)]">
                    {a.category}<br/>
                    <span className="text-[var(--muted)] font-normal text-xs">{a.district}</span>
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold text-[var(--brand-orange)]">{a.assignedProviderName}</td>
                  <td className="py-3 px-4">
                    <StatusBadge
                      status={statusLabel || a.status}
                      tone={
                        normalizedStatus === SERVICE_REQUEST_STATUSES.completed
                          ? "success"
                          : "info"
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </AdminSection>
  );
}

function AuditLogsSection({ logsData }: { logsData: AuditLogsData }) {
  return (
    <AdminSection title="Sistem İşlem Geçmişi (Audit Logs)">
      {logsData.error ? (
        <EmptyAdminState message="Audit log altyapısı için tablo hazırlandığında burada işlem geçmişi görünecek." />
      ) : logsData.data.length === 0 ? (
        <EmptyAdminState message="Kayıtlı işlem geçmişi bulunmuyor." />
      ) : (
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="py-2 px-4 text-xs font-bold text-[var(--muted)] uppercase">Tarih</th>
              <th className="py-2 px-4 text-xs font-bold text-[var(--muted)] uppercase">Aksiyon</th>
              <th className="py-2 px-4 text-xs font-bold text-[var(--muted)] uppercase">Varlık Türü</th>
            </tr>
          </thead>
          <tbody>
            {logsData.data.map((l) => (
              <tr key={l.id} className="border-b border-[var(--border)] last:border-0">
                <td className="py-2 px-4 text-sm text-[var(--muted)]">
                  {new Date(l.created_at).toLocaleString("tr-TR")}
                </td>
                <td className="py-2 px-4 text-sm font-bold text-[var(--brand-navy)]">{l.action}</td>
                <td className="py-2 px-4 text-sm text-[var(--brand-orange)]">{l.entity_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminSection>
  );
}

export default async function AdminDashboardPage() {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.ok && adminAccess.reason === "missing-session") {
    redirect(buildLoginRedirectUrl(appRoutes.adminDashboard));
  }

  if (!adminAccess.ok) {
    return <AdminAccessGate access={adminAccess} />;
  }

  const dashboard = await getAdminDashboardSummary();
  const { summary } = dashboard;

  const overview = await getAdminOverviewMetrics();
  const reqAnalytics = await getRequestAnalytics();
  const provAnalytics = await getProviderAnalytics();
  const assignments = await getAssignmentMonitoring();
  const auditLogs = await getLatestAuditLogs();

  return (
    <AdminAccessGate access={adminAccess}>
      <AdminPageShell
      active="dashboard"
      description="Usta profilleri, başvurular ve hizmet talepleri için temel yönetim görünümü."
      isConfigured={dashboard.isConfigured}
      title="Admin Paneli"
    >
      {dashboard.error ? (
        <DashboardErrorState error={dashboard.error} />
      ) : (
        <DashboardSummaryCards summary={summary} />
      )}

      <section className="mt-6 rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--brand-navy)]">
              Hızlı Geçiş
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-[var(--muted)]">
              Operasyon ekranlarına doğrudan ulaş.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {adminQuickNavItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                className="flex min-h-20 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-semibold text-[var(--brand-navy)] transition-colors hover:border-[rgba(255,138,0,0.42)] hover:bg-[var(--brand-orange-soft)]"
                href={item.href}
                key={item.key}
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-[var(--brand-orange-dark)]">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </section>

      {overview && <OperationalAlerts overview={overview} />}
      {overview && <OverviewMetrics overview={overview} />}
      {reqAnalytics && <RequestAnalyticsSection analytics={reqAnalytics} />}
      {provAnalytics && <ProviderAnalyticsSection analytics={provAnalytics} />}
      {assignments && <AssignmentMonitoringSection assignments={assignments} />}
      {auditLogs && <AuditLogsSection logsData={auditLogs} />}
      
      </AdminPageShell>
    </AdminAccessGate>
  );
}
