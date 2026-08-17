import { Container } from "@/components/ui/Container";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[rgba(13,20,36,0.08)] ${className}`} />;
}

export default function AccountNotificationsLoading() {
  return (
    <main className="min-h-screen bg-[var(--surface-soft)]">
      <Container className="max-w-5xl py-8 sm:py-10">
        <section aria-busy="true" aria-label="Bildirimler yükleniyor">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="mt-4 h-10 w-56" />
          <SkeletonBlock className="mt-3 h-5 max-w-2xl" />
          <div className="mt-6 grid gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                className="rounded-lg border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-subtle)]"
                key={index}
              >
                <div className="flex gap-3">
                  <SkeletonBlock className="size-10 shrink-0" />
                  <div className="flex-1">
                    <SkeletonBlock className="h-5 w-48" />
                    <SkeletonBlock className="mt-3 h-5 max-w-2xl" />
                    <SkeletonBlock className="mt-3 h-4 w-28" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </Container>
    </main>
  );
}
