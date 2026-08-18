import { Container } from "@/components/ui/Container";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

function RequestCardSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] transition-all sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-6 w-44" />
            <SkeletonBlock className="h-5 w-20 rounded-full" />
          </div>
          <SkeletonBlock className="mt-2 h-4 max-w-md" />
        </div>
        <SkeletonBlock className="h-8 w-32 shrink-0 rounded-full" />
      </div>

      <div className="mt-5 grid gap-3 rounded-md bg-[var(--surface-soft)] p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <SkeletonBlock className="h-3 w-16" />
          <SkeletonBlock className="h-5 w-28" />
        </div>
        <div className="space-y-1">
          <SkeletonBlock className="h-3 w-16" />
          <SkeletonBlock className="h-5 w-32" />
        </div>
        <div className="space-y-1">
          <SkeletonBlock className="h-3 w-16" />
          <SkeletonBlock className="h-5 w-24" />
        </div>
        <div className="space-y-1">
          <SkeletonBlock className="h-3 w-16" />
          <SkeletonBlock className="h-5 w-20" />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[rgba(10,37,64,0.08)] pt-4">
        <SkeletonBlock className="h-4 w-36" />
        <SkeletonBlock className="h-9 w-28 rounded-md" />
      </div>
    </div>
  );
}

export default function AccountRequestsLoading() {
  return (
    <main className="min-h-screen bg-[var(--surface-soft)]">
      <Container className="max-w-5xl py-8 sm:py-10">
        <section aria-busy="true" aria-label="Talepler yükleniyor">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="mt-4 h-9 w-56" />
          <SkeletonBlock className="mt-2 h-5 max-w-2xl" />
          <div className="mt-6 grid gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <RequestCardSkeleton key={index} />
            ))}
          </div>
        </section>
      </Container>
    </main>
  );
}
