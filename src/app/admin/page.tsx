<<<<<<< HEAD
import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  ClipboardList,
  FileText,
  UserCheck,
  Users,
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

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Paneli",
  description: "Fuwu iç operasyonları için yetkili admin paneli.",
};

function DashboardErrorState({ error }: { error: string }) {
  return (
    <section
      className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700 shadow-[0_14px_40px_rgba(13,20,36,0.05)]"
      role="alert"
    >
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div>
          <h2 className="text-base font-black">İstatistikler yüklenemedi</h2>
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
      href: "/admin/providers",
      icon: Users,
      label: "Toplam Usta",
      value: summary.totalProviders,
    },
    {
      href: "/admin/providers",
      icon: UserCheck,
      label: "Aktif Ustalar",
      value: summary.activeProviders,
    },
    {
      href: "/admin/provider-applications",
      icon: ClipboardList,
      label: "Onay Bekleyen Başvurular",
      value: summary.pendingApplications,
    },
    {
      href: "/admin/service-requests",
      icon: FileText,
      label: "Toplam Hizmet Talebi",
      value: summary.totalServiceRequests,
    },
    {
      href: "/admin/service-requests",
      icon: Clock,
      label: "Yeni Hizmet Talepleri",
      value: summary.newServiceRequests,
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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

export default async function AdminDashboardPage() {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.ok) {
    return <AdminAccessGate access={adminAccess} />;
  }

  const dashboard = await getAdminDashboardSummary();
  const { summary } = dashboard;

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
    </AdminAccessGate>
=======
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import { Users, ClipboardList } from "lucide-react";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";

export default function AdminDashboardPage() {
  return (
    <AdminProtectedRoute>
    <main className="min-h-screen bg-[#F5F6F8] flex flex-col">
      <Navbar />
      <div className="flex-1 p-6 lg:px-12 max-w-7xl mx-auto w-full py-12">
        <h1 className="text-3xl font-bold text-[#0D1424] mb-2">Admin Kontrol Paneli</h1>
        <p className="text-gray-500 mb-10">Fuwu pazar yeri yönetim sistemine hoş geldiniz.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/admin/requests" className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6 group hover:border-[#FF8A00] transition-colors">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#FF8A00] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <ClipboardList size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#0D1424] mb-1">Müşteri Talepleri</h2>
              <p className="text-gray-500 text-sm">Gelen hizmet taleplerini inceleyin ve yönetin.</p>
            </div>
          </Link>
          
          <Link href="/admin/providers" className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6 group hover:border-[#FF8A00] transition-colors">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <Users size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#0D1424] mb-1">Usta Başvuruları</h2>
              <p className="text-gray-500 text-sm">Yeni usta başvurularını onaylayın veya reddedin.</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
    </AdminProtectedRoute>
>>>>>>> 41e55ab (Full marketplace backend auth and production update)
  );
}
