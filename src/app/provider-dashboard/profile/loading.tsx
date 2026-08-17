import { ProviderDashboardShell } from "@/components/dashboard/ProviderDashboardUI";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

export default function ProviderProfileLoading() {
  return (
    <ProviderDashboardShell active="profile" description="Profil Ayarları" title="Profil">
      <section aria-busy="true" aria-label="Profil bilgileri yükleniyor" className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
        <SkeletonBlock className="h-6 w-36" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
        </div>
        <SkeletonBlock className="mt-4 h-24 w-full" />
      </section>
    </ProviderDashboardShell>
  );
}
