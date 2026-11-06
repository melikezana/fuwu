import Link from "next/link";
import { ArrowRight, PackageCheck } from "lucide-react";
import type { RecommendedService } from "@/lib/ai/service-recommendations";

const money = (minor: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(minor / 100);

/** Asistanın bulduğu soruna uyan sabit kapsamlı hizmet paketleri. */
export function RecommendedServices({ services }: { services: RecommendedService[] }) {
  if (!services.length) return null;
  return (
    <section aria-labelledby="assistant-service-title" className="grid gap-3">
      <div>
        <p className="text-sm font-extrabold text-[var(--brand-navy)]" id="assistant-service-title">Bu iş için hizmet paketleri</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-[var(--muted)]">Kapsamı ve fiyatı önceden belli. İncele, uygun ustayı ve saati seç.</p>
      </div>
      <ul className="grid gap-2">
        {services.map(service => (
          <li key={service.id}>
            <Link className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-[rgba(10,37,64,0.1)] bg-white px-3 py-3 transition-colors hover:border-[var(--brand-orange)] hover:bg-[var(--brand-orange-soft)]" href={service.href}>
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]"><PackageCheck aria-hidden className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold text-[var(--brand-navy)]">{service.name}</span>
                <span className="block truncate text-xs font-semibold text-[var(--muted)]">{service.startingPriceMinor ? `${money(service.startingPriceMinor)}'den başlayan fiyatlarla` : service.description}</span>
              </span>
              <ArrowRight aria-hidden className="size-4 shrink-0 text-[var(--brand-navy)]" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
