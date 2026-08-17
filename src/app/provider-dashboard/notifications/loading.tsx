import { ProviderDashboardShell } from "@/components/dashboard/ProviderDashboardUI";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

export default function ProviderNotificationsLoading() {
  return (
    <ProviderDashboardShell active="overview" description="Bildirimler" title="Bildirimler">
      <section aria-busy="true" aria-label="Bildirimler yükleniyor" className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
        <SkeletonBlock className="h-6 w-36" />
        <div className="mt-4 grid gap-3">
          <SkeletonBlock className="h-16 w-full" />
          <SkeletonBlock className="h-16 w-full" />
          <SkeletonBlock className="h-16 w-full" />
        </div>
      </section>
    </ProviderDashboardShell>
  );
}
