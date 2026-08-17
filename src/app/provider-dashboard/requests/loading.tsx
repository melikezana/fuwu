import { ProviderDashboardShell } from "@/components/dashboard/ProviderDashboardUI";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
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
        <div className="mt-5 grid gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              className="rounded-lg border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-subtle)]"
              key={index}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <SkeletonBlock className="h-5 w-44" />
                  <SkeletonBlock className="mt-3 h-5 max-w-lg" />
                </div>
                <SkeletonBlock className="h-7 w-32 rounded-full" />
              </div>
              <SkeletonBlock className="mt-4 h-24" />
              <SkeletonBlock className="mt-4 h-11 w-48" />
            </div>
          ))}
        </div>
      </section>
    </ProviderDashboardShell>
  );
}
