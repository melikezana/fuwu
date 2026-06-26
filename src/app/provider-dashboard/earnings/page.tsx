import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, CheckCircle2, Clock, Wallet, Star, BarChart3 } from "lucide-react";
import { ProviderDashboardShell, ProviderStatusBadge } from "@/components/dashboard/ProviderDashboardUI";
import { getProviderDashboardAccess } from "@/services/providers/dashboard";
import { getServerAuthContext } from "@/services/auth/server";
import { getProviderStats } from "@/services/providers/stats";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Kazançlar | Usta Paneli" };

const MOCK_STATS = {
  totalRequests: 47, completedRequests: 31, pendingRequests: 8,
  rejectedRequests: 4, acceptedRequests: 4, totalEarnings: 28750,
  averageRating: 4.7, reviewCount: 23, responseRate: 89,
  thisMonthCompleted: 9, thisMonthEarnings: 8400,
};

const monthlyData = [
  { ay: "Oca", kazanc: 4200, is: 5 }, { ay: "Şub", kazanc: 3800, is: 4 },
  { ay: "Mar", kazanc: 5100, is: 6 }, { ay: "Nis", kazanc: 4600, is: 5 },
  { ay: "May", kazanc: 2650, is: 3 }, { ay: "Haz", kazanc: 8400, is: 9 },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(value);
}

function StatCard({ label, value, sub, icon: Icon, tone }: {
  label: string; value: string; sub?: string; icon: LucideIcon;
  tone?: "green" | "orange" | "blue" | "default";
}) {
  const toneMap = {
    green: "border-[rgba(23,116,95,0.2)] bg-[var(--trust-green-soft)]",
    orange: "border-[rgba(255,138,0,0.2)] bg-[var(--brand-orange-soft)]",
    blue: "border-blue-200 bg-blue-50",
    default: "border-[var(--border)] bg-white",
  };
  const iconBg = {
    green: "bg-[var(--trust-green-soft)] text-[var(--trust-green)]",
    orange: "bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]",
    blue: "bg-blue-50 text-blue-700",
    default: "bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]",
  };
  const t = tone ?? "default";
  return (
    <div className={`relative overflow-hidden rounded-lg border p-5 shadow-[var(--shadow-card)] ${toneMap[t]}`}>
      <span className="absolute inset-x-0 top-0 h-1 bg-[var(--brand-orange)]" aria-hidden />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 cursor-default select-none">
          <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">{label}</p>
          <p className="mt-3 text-2xl font-bold leading-tight text-[var(--brand-navy)]">{value}</p>
          {sub && <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{sub}</p>}
        </div>
        <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${iconBg[t]}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </div>
  );
}

function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--brand-navy)]">{label}</span>
        <span className="text-sm font-bold text-[var(--muted)]">{value} / {max} <span className="text-xs">(%{pct})</span></span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-soft)]">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function ProviderEarningsPage() {
  const [providerAccess, authContext] = await Promise.all([
    getProviderDashboardAccess(),
    getServerAuthContext(),
  ]);

  const liveStats = providerAccess.ok && authContext.supabase
    ? await getProviderStats(providerAccess.profile.id, authContext.supabase)
    : null;

  const stats = liveStats ?? MOCK_STATS;
  const providerName = providerAccess.ok ? providerAccess.profile.name : "Demo Usta";

  return (
    <ProviderDashboardShell
      active="earnings"
      description="Tamamlanan iş istatistiklerini ve kazanç özetini takip et."
      providerName={providerName}
      statusLabel={providerAccess.ok ? "Usta hesabınız aktif" : "Demo modu"}
      statusTone={providerAccess.ok ? "green" : "orange"}
      title="Kazançlar"
    >
      <div className="grid gap-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          📊 {liveStats ? "Gerçek veriler gösteriliyor." : "Demo veriler gösteriliyor. Usta hesabı ile giriş yapıldığında gerçek veriler görünür."}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Wallet} label="Toplam Kazanç" tone="green" value={`${formatCurrency(stats.totalEarnings)} TL`} sub="Tamamlanan işlerden" />
          <StatCard icon={TrendingUp} label="Bu Ay Kazanç" tone="orange" value={`${formatCurrency(stats.thisMonthEarnings)} TL`} sub={`${stats.thisMonthCompleted} iş tamamlandı`} />
          <StatCard icon={CheckCircle2} label="Tamamlanan İş" tone="green" value={String(stats.completedRequests)} sub={`${stats.totalRequests} toplam talep`} />
          <StatCard icon={Star} label="Ortalama Puan" tone="orange" value={`${stats.averageRating.toFixed(1)} / 5`} sub={`${stats.reviewCount} değerlendirme`} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={Clock} label="Bekleyen Talepler" value={String(stats.pendingRequests)} sub="Yanıt bekliyor" />
          <StatCard icon={BarChart3} label="Yanıt Oranı" value={`%${stats.responseRate}`} sub="Tüm talepler" />
          <StatCard icon={CheckCircle2} label="Aktif Talepler" tone="blue" value={String(stats.acceptedRequests)} sub="Devam ediyor" />
        </div>
        <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
          <div className="mb-5 cursor-default select-none">
            <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">Aylık özet</p>
            <h2 className="mt-2 text-xl font-bold text-[var(--brand-navy)]">6 aylık kazanç geçmişi</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs font-medium uppercase text-[var(--muted)]">
                  <th className="pb-3 pr-4">Ay</th>
                  <th className="pb-3 pr-4">Tamamlanan İş</th>
                  <th className="pb-3 pr-4">Kazanç</th>
                  <th className="pb-3">Ortalama / İş</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((row) => (
                  <tr key={row.ay} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-3 pr-4 font-semibold text-[var(--brand-navy)]">{row.ay}</td>
                    <td className="py-3 pr-4 text-[var(--muted)]">{row.is} iş</td>
                    <td className="py-3 pr-4 font-bold text-[var(--trust-green)]">{formatCurrency(row.kazanc)} TL</td>
                    <td className="py-3 text-[var(--muted)]">{formatCurrency(Math.round(row.kazanc / row.is))} TL</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[var(--surface-soft)]">
                  <td className="py-3 pr-4 font-bold text-[var(--brand-navy)]">Toplam</td>
                  <td className="py-3 pr-4 font-bold text-[var(--brand-navy)]">{monthlyData.reduce((s, r) => s + r.is, 0)} iş</td>
                  <td className="py-3 pr-4 font-bold text-[var(--trust-green)]">{formatCurrency(monthlyData.reduce((s, r) => s + r.kazanc, 0))} TL</td>
                  <td className="py-3 font-bold text-[var(--muted)]">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
        <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
          <div className="mb-6 cursor-default select-none">
            <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">Performans dağılımı</p>
            <h2 className="mt-2 text-xl font-bold text-[var(--brand-navy)]">Talep durumu özeti</h2>
          </div>
          <div className="grid gap-5">
            <ProgressBar color="bg-[var(--trust-green)]" label="Tamamlanan" max={stats.totalRequests} value={stats.completedRequests} />
            <ProgressBar color="bg-[var(--brand-orange)]" label="Bekleyen / Atanan" max={stats.totalRequests} value={stats.pendingRequests} />
            <ProgressBar color="bg-blue-500" label="Devam Ediyor" max={stats.totalRequests} value={stats.acceptedRequests} />
            <ProgressBar color="bg-red-400" label="Reddedilen" max={stats.totalRequests} value={stats.rejectedRequests} />
          </div>
        </section>
        <section className="rounded-lg border border-[rgba(23,116,95,0.24)] bg-[var(--trust-green-soft)] p-5 shadow-[var(--shadow-card)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="cursor-default select-none">
              <p className="text-xs font-medium uppercase text-[var(--trust-green)]">Toplam kazanç özeti</p>
              <h2 className="mt-2 text-3xl font-bold text-[var(--brand-navy)]">{formatCurrency(stats.totalEarnings)} TL</h2>
              <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
                {stats.completedRequests} tamamlanan iş · {stats.reviewCount} değerlendirme · Yanıt oranı %{stats.responseRate}
              </p>
            </div>
            <ProviderStatusBadge tone="green">{stats.completedRequests} iş tamamlandı</ProviderStatusBadge>
          </div>
        </section>
      </div>
    </ProviderDashboardShell>
  );
}
