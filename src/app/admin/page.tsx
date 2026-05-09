import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, FileText, UserCheck, Users } from "lucide-react";
import {
  AdminPageShell,
  AdminSummaryCard,
  adminQuickNavItems,
} from "@/app/admin/_components/AdminUI";
import { getAdminDashboardSummary } from "@/services/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Paneli | Fuwu",
  description: "Fuwu iç operasyonları için demo admin paneli.",
};

export default async function AdminDashboardPage() {
  const dashboard = await getAdminDashboardSummary();
  const { summary } = dashboard;

  return (
    <AdminPageShell
      active="dashboard"
      description="Usta profilleri, başvurular ve hizmet talepleri için temel yönetim görünümü."
      error={dashboard.error}
      isConfigured={dashboard.isConfigured}
      title="Admin Paneli"
    >
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminSummaryCard
          href="/admin/providers"
          icon={Users}
          label="Toplam Usta"
          value={summary.totalProviders}
        />
        <AdminSummaryCard
          href="/admin/providers"
          icon={UserCheck}
          label="Aktif Ustalar"
          value={summary.activeProviders}
        />
        <AdminSummaryCard
          href="/admin/provider-applications"
          icon={ClipboardList}
          label="Bekleyen Başvurular"
          value={summary.pendingApplications}
        />
        <AdminSummaryCard
          href="/admin/service-requests"
          icon={FileText}
          label="Hizmet Talepleri"
          value={summary.serviceRequests}
        />
      </section>

      <section className="mt-6 rounded-lg border border-[var(--border)] bg-white p-5 shadow-[0_14px_40px_rgba(13,20,36,0.05)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-[var(--brand-navy)]">
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
                className="flex min-h-20 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-black text-[var(--brand-navy)] transition-colors hover:border-[rgba(255,138,0,0.42)] hover:bg-[var(--brand-orange-soft)]"
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
    </AdminPageShell>
  );
}
