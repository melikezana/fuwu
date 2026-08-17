import { Container } from "@/components/ui/Container";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

export default function OrderTrackingLoading() {
  return (
    <main className="min-h-screen bg-[var(--surface-soft)]">
      <Container className="max-w-6xl py-8 sm:py-10">
        <section
          aria-busy="true"
          aria-label="Talep takip ekranı yükleniyor"
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]"
        >
          <div className="min-w-0">
            <div className="rounded-lg border border-[rgba(249,115,22,0.22)] bg-white p-5 shadow-[var(--shadow-elevated)] sm:p-6">
              <SkeletonBlock className="h-4 w-32" />
              <SkeletonBlock className="mt-4 h-10 max-w-lg" />
              <SkeletonBlock className="mt-4 h-5 max-w-2xl" />
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <SkeletonBlock className="h-24" key={index} />
                ))}
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <SkeletonBlock className="h-20" key={index} />
              ))}
            </div>
          </div>
          <aside className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-premium)]">
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-4 h-8 w-56" />
            <SkeletonBlock className="mt-5 h-32" />
            <SkeletonBlock className="mt-5 h-28" />
            <SkeletonBlock className="mt-5 h-12" />
          </aside>
        </section>
      </Container>
    </main>
  );
}
