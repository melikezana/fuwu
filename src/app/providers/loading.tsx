import { Container } from "@/components/ui/Container";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

export default function ProvidersLoading() {
  return (
    <main className="min-h-screen bg-[var(--surface-soft)] py-8">
      <Container>
        <section aria-busy="true" aria-label="Ustalar yükleniyor" className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
          <SkeletonBlock className="h-8 w-56" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock className="h-48 w-full" key={index} />
            ))}
          </div>
        </section>
      </Container>
    </main>
  );
}
