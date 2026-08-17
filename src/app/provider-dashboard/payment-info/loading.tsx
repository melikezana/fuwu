import { ProviderDashboardShell } from "@/components/dashboard/ProviderDashboardUI";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

export default function ProviderPaymentInfoLoading() {
  return (
    <ProviderDashboardShell active="overview" description="Ödeme ve IBAN Bilgileri" title="Ödeme Bilgileri">
      <section aria-busy="true" aria-label="Ödeme bilgileri yükleniyor" className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
        <SkeletonBlock className="h-6 w-40" />
        <SkeletonBlock className="mt-4 h-12 w-full" />
        <SkeletonBlock className="mt-4 h-12 w-full" />
        <SkeletonBlock className="mt-6 h-10 w-32" />
      </section>
    </ProviderDashboardShell>
  );
}
