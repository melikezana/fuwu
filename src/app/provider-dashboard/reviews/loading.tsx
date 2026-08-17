import { ProviderDashboardShell } from "@/components/dashboard/ProviderDashboardUI";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

export default function ProviderReviewsLoading() {
  return (
    <ProviderDashboardShell active="overview" description="Müşteri Değerlendirmeleri" title="Değerlendirmeler">
      <section aria-busy="true" aria-label="Değerlendirmeler yükleniyor" className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
        <SkeletonBlock className="h-6 w-44" />
        <div className="mt-4 grid gap-3">
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-20 w-full" />
        </div>
      </section>
    </ProviderDashboardShell>
  );
}
