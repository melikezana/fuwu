import { Container } from "@/components/ui/Container";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

export default function AppLoading() {
  return (
    <main className="premium-page-shell min-h-screen">
      <Container className="max-w-6xl py-8 sm:py-12">
        <section aria-busy="true" aria-label="Sayfa yükleniyor" className="grid gap-6">
          <div className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="mt-4 h-10 max-w-xl" />
            <SkeletonBlock className="mt-4 h-5 max-w-2xl" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-subtle)]"
                key={index}
              >
                <SkeletonBlock className="size-10" />
                <SkeletonBlock className="mt-4 h-5 w-2/3" />
                <SkeletonBlock className="mt-3 h-16" />
              </div>
            ))}
          </div>
        </section>
      </Container>
    </main>
  );
}
