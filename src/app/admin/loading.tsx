import Link from "next/link";
import { Clock, ClipboardList, FileText, UserCheck, Users } from "lucide-react";
import {
  AdminPageShell,
  adminQuickNavItems,
} from "@/components/admin/AdminUI";

const loadingCards = [
  { icon: Users, label: "Toplam Usta" },
  { icon: UserCheck, label: "Aktif Ustalar" },
  { icon: ClipboardList, label: "Onay Bekleyen Başvurular" },
  { icon: FileText, label: "Toplam Hizmet Talebi" },
  { icon: Clock, label: "Yeni Hizmet Talepleri" },
];

export default function AdminDashboardLoading() {
  return (
    <AdminPageShell
      active="dashboard"
      description="Usta profilleri, başvurular ve hizmet talepleri için temel yönetim görünümü."
      title="Admin Paneli"
    >
      <section
        aria-label="Dashboard istatistikleri yükleniyor"
        aria-busy="true"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      >
        {loadingCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[0_14px_40px_rgba(13,20,36,0.06)]"
              key={card.label}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-[var(--muted)]">
                    {card.label}
                  </p>
                  <div className="mt-3 h-9 w-20 animate-pulse rounded-md bg-[var(--surface-soft)]" />
                </div>
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[var(--surface-soft)] text-[var(--brand-orange-dark)]">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
              </div>
            </div>
          );
        })}
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
                className="flex min-h-20 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-black text-[var(--brand-navy)]"
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
