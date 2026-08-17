import { Container } from "@/components/ui/Container";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

export default function AccountApplicationsLoading() {
  return (
    <main className="min-h-screen bg-[var(--surface-soft)] py-8">
      <Container className="max-w-4xl">
        <section aria-busy="true" aria-label="Başvurularım yükleniyor" className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
          <SkeletonBlock className="h-7 w-48" />
          <SkeletonBlock className="mt-4 h-24 w-full" />
        </section>
      </Container>
    </main>
  );
}
