import { ProviderDashboardShell } from "@/components/dashboard/ProviderDashboardUI";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

export default function ProviderMessagesLoading() {
  return (
    <ProviderDashboardShell
      active="requests"
      description="Müşterilerle açık talep yazışmalarını tek yerden takip et."
      title="Mesajlar"
    >
      <section
        aria-busy="true"
        aria-label="Mesajlar yükleniyor"
        className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
      >
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="mt-4 h-8 w-56" />
        <div className="mt-6 grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4"
              key={index}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <SkeletonBlock className="h-5 w-44" />
                  <SkeletonBlock className="mt-3 h-4 w-56" />
                </div>
                <SkeletonBlock className="h-8 w-28 rounded-full" />
              </div>
              <SkeletonBlock className="mt-4 h-52" />
            </div>
          ))}
        </div>
      </section>
    </ProviderDashboardShell>
  );
}
