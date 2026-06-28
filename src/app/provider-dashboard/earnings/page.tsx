import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import { BarChart3, CheckCircle2, Clock, Star, TrendingUp, Wallet } from "lucide-react";
import {
  getProviderDashboardStatusBadgeView,
  ProviderDashboardRestrictedAreaEmptyState,
  ProviderDashboardShell,
  ProviderStatusBadge,
} from "@/components/dashboard/ProviderDashboardUI";
import { getServerAuthContext } from "@/services/auth/server";
import { getProviderDashboardAccess } from "@/services/providers/dashboard";
import { getProviderStats, type ProviderStats } from "@/services/providers/stats";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kazançlar | Usta Paneli",
};

type ServerSupabaseClient = NonNullable<
  Awaited<ReturnType<typeof getServerAuthContext>>["supabase"]
>;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(value);
}

function StatCard({
  icon: Icon,
  label,
  sub,
  tone = "default",
  value,
}: {
  icon: LucideIcon;
  label: string;
  sub?: string;
  tone?: "green" | "orange" | "blue" | "default";
  value: string;
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

  return (
    <div className={`relative overflow-hidden rounded-lg border p-5 shadow-[var(--shadow-card)] ${toneMap[tone]}`}>
      <span className="absolute inset-x-0 top-0 h-1 bg-[var(--brand-orange)]" aria-hidden />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 cursor-default select-none">
          <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">{label}</p>
          <p className="mt-3 text-2xl font-bold leading-tight text-[var(--brand-navy)]">{value}</p>
          {sub ? <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{sub}</p> : null}
        </div>
        <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${iconBg[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </div>
  );
}

function ProgressBar({
  color,
  label,
  max,
  value,
}: {
  color: string;
  label: string;
  max: number;
  value: number;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[var(--brand-navy)]">{label}</span>
        <span className="text-sm font-bold text-[var(--muted)]">
          {value} / {max} <span className="text-xs">(%{pct})</span>
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-soft)]">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// TODO: Aylık kazanç grafiği için getProviderMonthlyStats()
// servisi tamamlandığında buraya entegre edilecek.
function MonthlyStatsPlaceholder() {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="cursor-default select-none">
        <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">Aylık özet</p>
        <h2 className="mt-2 text-xl font-bold text-[var(--brand-navy)]">Kazanç grafiği</h2>
        <p className="mt-3 rounded-md border border-dashed border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-semibold leading-6 text-[var(--muted)]">
          Henüz veri yok
        </p>
      </div>
    </section>
  );
}

function StatsLoadError() {
  return (
    <section
      className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-semibold leading-6 text-red-700 shadow-[var(--shadow-card)]"
      role="alert"
    >
      Veriler yüklenemedi. Lütfen biraz sonra tekrar dene.
    </section>
  );
}

async function loadProviderStats(providerId: string, supabase: ServerSupabaseClient) {
  try {
    return {
      error: false,
      stats: await getProviderStats(providerId, supabase),
    };
  } catch {
    return {
      error: true,
      stats: null,
    };
  }
}

function ProviderEarningsContent({ stats }: { stats: ProviderStats }) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Toplam Kazanç"
          sub="Tamamlanan işlerden"
          tone="green"
          value={`${formatCurrency(stats.totalEarnings)} TL`}
        />
        <StatCard
          icon={TrendingUp}
          label="Bu Ay Kazanç"
          sub={`${stats.thisMonthCompleted} iş tamamlandı`}
          tone="orange"
          value={`${formatCurrency(stats.thisMonthEarnings)} TL`}
        />
        <StatCard
          icon={CheckCircle2}
          label="Tamamlanan İş"
          sub={`${stats.totalRequests} toplam talep`}
          tone="green"
          value={String(stats.completedRequests)}
        />
        <StatCard
          icon={Star}
          label="Ortalama Puan"
          sub={`${stats.reviewCount} değerlendirme`}
          tone="orange"
          value={`${stats.averageRating.toFixed(1)} / 5`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Clock} label="Bekleyen Talepler" sub="Yanıt bekliyor" value={String(stats.pendingRequests)} />
        <StatCard icon={BarChart3} label="Yanıt Oranı" sub="Tüm talepler" value={`%${stats.responseRate}`} />
        <StatCard icon={CheckCircle2} label="Aktif Talepler" sub="Devam ediyor" tone="blue" value={String(stats.acceptedRequests)} />
      </div>

      <MonthlyStatsPlaceholder />

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
            <h2 className="mt-2 text-3xl font-bold text-[var(--brand-navy)]">
              {formatCurrency(stats.totalEarnings)} TL
            </h2>
            <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
              {stats.completedRequests} tamamlanan iş · {stats.reviewCount} değerlendirme · Yanıt oranı %{stats.responseRate}
            </p>
          </div>
          <ProviderStatusBadge tone="green">{stats.completedRequests} iş tamamlandı</ProviderStatusBadge>
        </div>
      </section>
    </div>
  );
}

export default async function ProviderEarningsPage() {
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
  const statsResult =
    providerAccess.ok && authContext.supabase
      ? await loadProviderStats(providerAccess.profile.id, authContext.supabase)
      : { error: providerAccess.ok, stats: null };

  return (
    <ProviderDashboardShell
      active="earnings"
      description="Tamamlanan iş istatistiklerini ve kazanç özetini takip et."
      providerName={providerAccess.ok ? providerAccess.profile.name : undefined}
      statusLabel={statusBadge.label}
      statusTone={statusBadge.tone}
      title="Kazançlar"
    >
      {providerAccess.ok ? (
        statsResult.stats ? <ProviderEarningsContent stats={statsResult.stats} /> : <StatsLoadError />
      ) : (
        <ProviderDashboardRestrictedAreaEmptyState />
      )}
    </ProviderDashboardShell>
  );
}
