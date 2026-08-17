import { ProviderDashboardShell } from "@/components/dashboard/ProviderDashboardUI";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

export default function ProviderEarningsLoading() {
  return (
    <ProviderDashboardShell active="earnings" description="Kazanç durumu ve ödeme bilgileri" title="Kazançlar">
      <section aria-busy="true" aria-label="Kazançlar yükleniyor" className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
        <SkeletonBlock className="h-6 w-36" />
        <SkeletonBlock className="mt-4 h-28 w-full" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <SkeletonBlock className="h-32 w-full" />
          <SkeletonBlock className="h-32 w-full" />
        </div>
      </section>
    </ProviderDashboardShell>
  );
}
