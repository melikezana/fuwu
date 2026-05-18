import { ProviderDashboardShell } from "@/components/dashboard/ProviderDashboardUI";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

export default function ProviderDashboardLoading() {
  return (
    <ProviderDashboardShell
      active="overview"
      description="Profil görünürlüğünü, temel durumları ve gelen talep alanını tek ekranda takip et."
      title="Usta Paneli"
    >
      <section aria-busy="true" aria-label="Usta paneli yükleniyor" className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[0_14px_40px_rgba(13,20,36,0.06)]"
              key={index}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <SkeletonBlock className="h-4 w-24" />
                  <SkeletonBlock className="mt-3 h-7 w-20" />
                  <SkeletonBlock className="mt-3 h-12" />
                </div>
                <SkeletonBlock className="h-11 w-11 shrink-0" />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[0_14px_40px_rgba(13,20,36,0.05)] sm:p-6">
          <SkeletonBlock className="h-6 w-56" />
          <SkeletonBlock className="mt-4 h-5 max-w-xl" />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock className="h-20" key={index} />
            ))}
          </div>
        </div>
      </section>
    </ProviderDashboardShell>
  );
}
