import { AdminPageShell } from "@/components/admin/AdminUI";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

export default function AdminRevenueLoading() {
  return (
    <AdminPageShell active="revenue" description="Gelir ve Finans Analitiği" title="Gelir Raporu">
      <section aria-busy="true" aria-label="Gelir raporu yükleniyor" className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
        <SkeletonBlock className="h-6 w-36" />
        <SkeletonBlock className="mt-4 h-64 w-full" />
      </section>
    </AdminPageShell>
  );
}
