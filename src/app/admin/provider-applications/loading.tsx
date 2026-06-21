import { AdminPageShell } from "@/components/admin/AdminUI";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

export default function AdminProviderApplicationsLoading() {
  return (
    <AdminPageShell
      active="applications"
      description="Usta adaylarının başvuru bilgilerini ve değerlendirme durumlarını takip et."
      title="Başvurular"
    >
      <section aria-busy="true" aria-label="Başvuru tablosu yükleniyor">
        <div className="grid gap-4 lg:hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              className="rounded-lg border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-card)]"
              key={index}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <SkeletonBlock className="h-5 w-40" />
                  <SkeletonBlock className="mt-3 h-4 w-48" />
                </div>
                <SkeletonBlock className="h-8 w-24" />
              </div>
              <SkeletonBlock className="mt-5 h-20" />
              <div className="mt-4 flex gap-2">
                <SkeletonBlock className="h-10 w-24" />
                <SkeletonBlock className="h-10 w-24" />
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-[var(--shadow-card)] lg:block">
          <div className="grid grid-cols-6 gap-4 bg-[var(--surface-soft)] px-4 py-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock className="h-4" key={index} />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="grid grid-cols-6 gap-4 border-t border-[var(--border)] px-4 py-4" key={index}>
              {Array.from({ length: 6 }).map((__, cellIndex) => (
                <SkeletonBlock className="h-5" key={cellIndex} />
              ))}
            </div>
          ))}
        </div>
      </section>
    </AdminPageShell>
  );
}
