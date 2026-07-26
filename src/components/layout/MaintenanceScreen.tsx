import { Wrench } from "lucide-react";

// Bakım modu açıkken admin olmayan ziyaretçilere gösterilen tam sayfa ekran.
export function MaintenanceScreen({ message }: { message?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface-soft)] px-6 text-center">
      <span className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
        <Wrench className="h-8 w-8" aria-hidden />
      </span>
      <h1 className="text-3xl font-bold text-[var(--brand-navy)] sm:text-4xl">
        Kısa bir bakımdayız
      </h1>
      <p className="mt-4 max-w-md text-base font-medium leading-7 text-[var(--muted)]">
        {message?.trim()
          ? message
          : "Fuwu şu anda bakımda. Kısa süre içinde tekrar hizmetinizdeyiz, anlayışınız için teşekkürler."}
      </p>
    </div>
  );
}
