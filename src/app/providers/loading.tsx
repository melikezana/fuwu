import { Container } from "@/components/ui/Container";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`}
    />
  );
}

export default function ProvidersLoading() {
  return (
    <div className="bg-[var(--background)]">
      <section className="border-b border-[var(--border)] bg-white">
        <Container className="max-w-7xl py-10 sm:py-14 lg:py-16">
          <SkeletonBlock className="h-12 w-36" />
          <SkeletonBlock className="mt-8 h-5 w-32" />
          <SkeletonBlock className="mt-4 h-14 max-w-3xl" />
          <SkeletonBlock className="mt-4 h-6 max-w-2xl" />
        </Container>
      </section>
      <Container className="max-w-7xl py-6 sm:py-8">
        <div className="rounded-lg bg-white p-4 shadow-[0_22px_58px_rgba(13,20,36,0.08)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-5 lg:p-6">
          <SkeletonBlock className="h-6 w-56" />
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <SkeletonBlock className="h-12" />
            <SkeletonBlock className="h-12" />
            <SkeletonBlock className="h-12" />
          </div>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              className="rounded-lg bg-white p-5 shadow-[0_18px_48px_rgba(13,20,36,0.07)] ring-1 ring-[rgba(13,20,36,0.08)]"
              key={index}
            >
              <div className="flex gap-4">
                <SkeletonBlock className="size-14 shrink-0" />
                <div className="flex-1">
                  <SkeletonBlock className="h-7 w-2/3" />
                  <SkeletonBlock className="mt-3 h-5 w-1/2" />
                </div>
              </div>
              <SkeletonBlock className="mt-5 h-20" />
              <SkeletonBlock className="mt-5 h-12" />
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
