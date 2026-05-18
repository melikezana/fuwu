import { AdminPageShell } from "@/components/admin/AdminUI";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

export default function AdminProvidersLoading() {
  return (
    <AdminPageShell
      active="providers"
      description="Supabase üzerindeki tüm usta kayıtlarını, iletişim bilgilerini ve yayın durumlarını takip et."
      title="Ustalar"
    >
      <section aria-busy="true" aria-label="Usta tablosu yükleniyor">
        <div className="grid gap-4 lg:hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              className="rounded-lg border border-[var(--border)] bg-white p-4 shadow-[0_12px_34px_rgba(13,20,36,0.05)]"
              key={index}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <SkeletonBlock className="h-5 w-36" />
                  <SkeletonBlock className="mt-3 h-4 w-44" />
                </div>
                <SkeletonBlock className="h-8 w-20" />
              </div>
              <SkeletonBlock className="mt-5 h-16" />
              <div className="mt-4 flex flex-wrap gap-2">
                <SkeletonBlock className="h-10 w-28" />
                <SkeletonBlock className="h-10 w-28" />
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-[0_14px_40px_rgba(13,20,36,0.05)] lg:block">
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
