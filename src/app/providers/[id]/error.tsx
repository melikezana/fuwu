"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { appRoutes } from "@/lib/constants/navigation";

export default function ProviderProfileError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="bg-[var(--background)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-white p-6 text-center shadow-[var(--shadow-elevated)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-red-50 text-red-700">
          <AlertTriangle aria-hidden="true" className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-[var(--brand-navy)]">
          Profil yüklenemedi
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
          Bu usta profilini şu anda gösteremiyoruz. Listeye dönüp başka profilleri inceleyebilirsin.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            onClick={reset}
            type="button"
          >
            Tekrar dene
          </Button>
          <Button
            href={appRoutes.providers}
            variant="secondary"
          >
            Usta listesine dön
          </Button>
        </div>
      </div>
    </section>
  );
}
