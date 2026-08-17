import { Container } from "@/components/ui/Container";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

export default function AccountRequestsLoading() {
  return (
    <main className="min-h-screen bg-[var(--surface-soft)]">
      <Container className="max-w-5xl py-8 sm:py-10">
        <section aria-busy="true" aria-label="Talepler yükleniyor">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="mt-4 h-10 w-56" />
          <SkeletonBlock className="mt-3 h-5 max-w-2xl" />
          <div className="mt-6 grid gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]"
                key={index}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <SkeletonBlock className="h-6 w-44" />
                    <SkeletonBlock className="mt-3 h-5 max-w-xl" />
                  </div>
                  <SkeletonBlock className="h-8 w-28 shrink-0 rounded-full" />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((__, itemIndex) => (
                    <SkeletonBlock className="h-16" key={itemIndex} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </Container>
    </main>
  );
}
