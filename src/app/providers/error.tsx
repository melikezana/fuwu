"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { appRoutes } from "@/lib/constants/navigation";

export default function ProvidersError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="bg-[var(--background)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-white p-6 text-center shadow-[0_18px_56px_rgba(13,20,36,0.08)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-red-50 text-red-700">
          <AlertTriangle aria-hidden="true" className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-black text-[var(--brand-navy)]">
          Usta listesi yüklenemedi
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
          Şu anda profilleri gösteremiyoruz. Bağlantını kontrol edip tekrar deneyebilirsin.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md bg-[var(--brand-orange)] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            onClick={reset}
            type="button"
          >
            Tekrar dene
          </button>
          <Link
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md bg-white px-4 py-2.5 text-sm font-bold text-[var(--brand-navy)] shadow-[inset_0_0_0_2px_rgba(255,138,0,0.56)] transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            href={appRoutes.home}
          >
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    </section>
  );
}
