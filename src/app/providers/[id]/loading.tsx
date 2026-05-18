import { Container } from "@/components/ui/Container";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`}
    />
  );
}

export default function ProviderProfileLoading() {
  return (
    <div className="bg-[var(--background)]">
      <section className="border-b border-[var(--border)] bg-white">
        <Container className="py-6 sm:py-8">
          <SkeletonBlock className="h-5 w-64" />
        </Container>
      </section>
      <Container className="grid gap-6 py-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,370px)] lg:items-start lg:py-12">
        <div className="space-y-6">
          <section className="rounded-lg bg-white p-5 shadow-[0_24px_74px_rgba(13,20,36,0.1)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-7">
            <div className="flex gap-5">
              <SkeletonBlock className="h-20 w-20 shrink-0" />
              <div className="flex-1">
                <SkeletonBlock className="h-5 w-48" />
                <SkeletonBlock className="mt-4 h-12 max-w-lg" />
                <SkeletonBlock className="mt-4 h-16 max-w-2xl" />
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <SkeletonBlock className="h-24" key={index} />
              ))}
            </div>
          </section>
          <SkeletonBlock className="h-48" />
          <SkeletonBlock className="h-56" />
        </div>
        <aside className="rounded-lg bg-white p-5 shadow-[0_24px_70px_rgba(13,20,36,0.1)] ring-1 ring-[rgba(13,20,36,0.1)]">
          <SkeletonBlock className="h-10 w-32" />
          <SkeletonBlock className="mt-6 h-7 w-48" />
          <SkeletonBlock className="mt-4 h-12" />
          <SkeletonBlock className="mt-3 h-12" />
          <SkeletonBlock className="mt-5 h-32" />
        </aside>
      </Container>
    </div>
  );
}
