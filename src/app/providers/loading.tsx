import { Container } from "@/components/ui/Container";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

function ProviderCardSkeleton() {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] transition-all">
      <div>
        {/* Top Header: Avatar + Title & Category */}
        <div className="flex items-start gap-4">
          <SkeletonBlock className="size-14 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <SkeletonBlock className="h-5 w-32" />
              <SkeletonBlock className="h-5 w-16 rounded-full" />
            </div>
            <SkeletonBlock className="mt-2 h-4 w-24" />
            <SkeletonBlock className="mt-2 h-3.5 w-20" />
          </div>
        </div>

        {/* Badges / Metrics Row */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <SkeletonBlock className="h-6 w-20 rounded-full" />
          <SkeletonBlock className="h-6 w-28 rounded-full" />
          <SkeletonBlock className="h-6 w-24 rounded-full" />
        </div>

        {/* Description Lines */}
        <div className="mt-4 space-y-2">
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-4/5" />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-6 flex items-center gap-3 border-t border-[rgba(10,37,64,0.08)] pt-4">
        <SkeletonBlock className="h-10 flex-1 rounded-md" />
        <SkeletonBlock className="h-10 w-24 rounded-md" />
      </div>
    </div>
  );
}

export default function ProvidersLoading() {
  return (
    <main className="min-h-screen bg-[var(--surface-soft)] py-8">
      <Container>
        <section aria-busy="true" aria-label="Ustalar yükleniyor">
          {/* Header Skeleton */}
          <div className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-subtle)] sm:p-6">
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-3 h-8 w-64" />
            <SkeletonBlock className="mt-2 h-4 w-80" />
          </div>

          {/* Provider Cards Grid */}
          <div className="mt-6 grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <ProviderCardSkeleton key={index} />
            ))}
          </div>
        </section>
      </Container>
    </main>
  );
}
