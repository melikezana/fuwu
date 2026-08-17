import { ProviderDashboardShell } from "@/components/dashboard/ProviderDashboardUI";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

export default function ProviderCalendarLoading() {
  return (
    <ProviderDashboardShell active="overview" description="Takvim ve randevular" title="Takvim">
      <section aria-busy="true" aria-label="Takvim yükleniyor" className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
        <SkeletonBlock className="h-6 w-36" />
        <SkeletonBlock className="mt-4 h-64 w-full" />
      </section>
    </ProviderDashboardShell>
  );
}
