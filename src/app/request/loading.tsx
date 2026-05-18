import { Container } from "@/components/ui/Container";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

export default function RequestLoading() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#FFF7EC_42%,#ffffff_100%)]">
      <Container className="relative grid min-h-[620px] gap-8 py-10 sm:py-14 lg:grid-cols-[0.84fr_1.16fr] lg:items-center lg:py-16">
        <div className="min-w-0">
          <SkeletonBlock className="h-16 w-36" />
          <SkeletonBlock className="mt-7 h-5 w-28" />
          <SkeletonBlock className="mt-4 h-24 max-w-xl" />
          <SkeletonBlock className="mt-5 h-20 max-w-xl" />
        </div>

        <div
          aria-busy="true"
          aria-label="Talep formu yükleniyor"
          className="rounded-lg bg-white p-5 shadow-[0_24px_70px_rgba(13,20,36,0.09)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-6"
        >
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="mt-3 h-8 w-64 max-w-full" />
          <SkeletonBlock className="mt-3 h-12" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index}>
                <SkeletonBlock className="h-4 w-24" />
                <SkeletonBlock className="mt-2 h-12" />
              </div>
            ))}
          </div>
          <SkeletonBlock className="mt-6 h-28" />
          <SkeletonBlock className="mt-6 h-12 w-full sm:w-40" />
        </div>
      </Container>
    </section>
  );
}
