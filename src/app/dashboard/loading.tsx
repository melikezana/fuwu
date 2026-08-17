import { Container } from "@/components/ui/Container";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-[var(--surface-soft)] py-8">
      <Container>
        <section aria-busy="true" aria-label="Kullanıcı paneli yükleniyor" className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
          <SkeletonBlock className="h-8 w-48" />
          <SkeletonBlock className="mt-2 h-4 w-72" />
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <SkeletonBlock className="h-28 w-full" />
            <SkeletonBlock className="h-28 w-full" />
            <SkeletonBlock className="h-28 w-full" />
          </div>
        </section>
      </Container>
    </main>
  );
}
