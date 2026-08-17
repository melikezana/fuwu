import { AdminPageShell } from "@/components/admin/AdminUI";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

export default function AdminAuditLoading() {
  return (
    <AdminPageShell active="audit" description="Denetim Günlükleri" title="Audit Logs">
      <section aria-busy="true" aria-label="Denetim kayıtları yükleniyor" className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
        <SkeletonBlock className="h-6 w-40" />
        <SkeletonBlock className="mt-4 h-48 w-full" />
      </section>
    </AdminPageShell>
  );
}
