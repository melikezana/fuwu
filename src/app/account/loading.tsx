import { Container } from "@/components/ui/Container";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

export default function AccountLoading() {
  return (
    <main className="min-h-screen bg-[var(--surface-soft)] py-8">
      <Container className="max-w-4xl">
        <section aria-busy="true" aria-label="Hesabım sayfası yükleniyor" className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
          <SkeletonBlock className="h-7 w-40" />
          <SkeletonBlock className="mt-2 h-4 w-60" />
          <div className="mt-6 grid gap-3">
            <SkeletonBlock className="h-16 w-full" />
            <SkeletonBlock className="h-16 w-full" />
            <SkeletonBlock className="h-16 w-full" />
          </div>
        </section>
      </Container>
    </main>
  );
}
