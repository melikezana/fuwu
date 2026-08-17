import { AdminPageShell } from "@/components/admin/AdminUI";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

export default function AdminNotificationsLoading() {
  return (
    <AdminPageShell active="notifications" description="Sistem Bildirimleri" title="Bildirim Gönder">
      <section aria-busy="true" aria-label="Bildirim paneli yükleniyor" className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
        <SkeletonBlock className="h-6 w-44" />
        <SkeletonBlock className="mt-4 h-36 w-full" />
      </section>
    </AdminPageShell>
  );
}
