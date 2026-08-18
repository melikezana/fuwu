import { ProviderDashboardShell } from "@/components/dashboard/ProviderDashboardUI";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

function ProviderRequestCardSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] transition-all">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-5 w-36" />
            <SkeletonBlock className="h-5 w-20 rounded-full" />
          </div>
          <SkeletonBlock className="mt-2 h-4 w-48" />
        </div>
        <SkeletonBlock className="h-7 w-28 shrink-0 rounded-full" />
      </div>

      <div className="mt-4 rounded-md bg-[var(--surface-soft)] p-4 space-y-2">
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-3/4" />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(10,37,64,0.08)] pt-4">
        <div className="flex items-center gap-4">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-10 w-28 rounded-md" />
          <SkeletonBlock className="h-10 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export default function ProviderRequestsLoading() {
  return (
    <ProviderDashboardShell
      active="requests"
      description="Usta hesabına bağlanacak gelen talepler için hazırlanan sade takip alanı."
      title="Gelen Talepler"
    >
      <section
        aria-busy="true"
        aria-label="Gelen talepler yükleniyor"
        className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
      >
        <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-4 h-8 w-64" />
          </div>
          <SkeletonBlock className="h-8 w-32" />
        </div>
        <div className="mt-5 grid gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <ProviderRequestCardSkeleton key={index} />
          ))}
        </div>
      </section>
    </ProviderDashboardShell>
  );
}
