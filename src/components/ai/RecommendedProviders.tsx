"use client";

import { ArrowRight, BadgeCheck, CalendarCheck, Clock3, MapPin, Star } from "lucide-react";
import type { RecommendedProvider } from "@/lib/ai/assistant-schema";
import { cn } from "@/lib/utils";

type RecommendedProvidersProps = {
  providers: RecommendedProvider[];
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toLocaleUpperCase("tr");
}

function formatRating(provider: RecommendedProvider) {
  if (typeof provider.rating !== "number") {
    return "Puan yok";
  }

  return provider.rating.toFixed(1);
}

export function RecommendedProviders({ providers }: RecommendedProvidersProps) {
  if (providers.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-3" aria-labelledby="assistant-provider-title">
      <div>
        <p id="assistant-provider-title" className="text-sm font-extrabold text-[var(--brand-navy)]">
          Senin için uygun olabilecek ustalar
        </p>
        <p className="mt-1 text-xs font-semibold leading-5 text-[var(--muted)]">
          Bu kartlar yalnızca gerçek Fuwu profillerinden gelir; asistan otomatik rezervasyon veya ödeme yapmaz.
        </p>
      </div>
      <div className="grid gap-3">
        {providers.slice(0, 3).map((provider) => (
          <article
            className="rounded-3xl border border-[rgba(10,37,64,0.1)] bg-white p-3 shadow-[var(--shadow-subtle)]"
            key={provider.id}
          >
            <div className="grid grid-cols-[52px_minmax(0,1fr)] gap-3">
              <div className="overflow-hidden rounded-2xl bg-[var(--brand-navy-soft)]">
                {provider.profileImageUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- Provider image hosts are data-driven and may not be in Next image config. */}
                  <img
                    alt={`${provider.name} profil fotoğrafı`}
                    className="size-[52px] object-cover"
                    src={provider.profileImageUrl}
                  />
                  </>
                ) : (
                  <div className="flex size-[52px] items-center justify-center text-sm font-extrabold text-[var(--brand-navy)]">
                    {getInitials(provider.name)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-extrabold text-[var(--brand-navy)]">
                      {provider.name}
                    </h3>
                    <p className="mt-0.5 truncate text-xs font-semibold text-[var(--muted)]">
                      {provider.category}
                    </p>
                  </div>
                  {provider.verified ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--trust-green-soft)] px-2 py-1 text-[11px] font-extrabold text-[var(--trust-green)]">
                      <BadgeCheck aria-hidden className="size-3.5" />
                      Doğrulanmış
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-[var(--brand-navy)]">
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Star aria-hidden className="size-3.5 text-[var(--brand-orange)]" />
                    {formatRating(provider)}
                    {typeof provider.reviewCount === "number" ? ` · ${provider.reviewCount} yorum` : ""}
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <MapPin aria-hidden className="size-3.5 text-[var(--brand-orange)]" />
                    <span className="truncate">
                      {provider.distanceKm ? `${provider.distanceKm.toFixed(1)} km` : provider.district}
                    </span>
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <CalendarCheck aria-hidden className="size-3.5 text-[var(--brand-orange)]" />
                    <span className="truncate">{provider.availability ?? "Müsaitlik bilgisi yok"}</span>
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Clock3 aria-hidden className="size-3.5 text-[var(--brand-orange)]" />
                    <span className="truncate">{provider.responseTime ?? "Yanıt süresi yok"}</span>
                  </span>
                </div>
                {provider.startingPrice ? (
                  <p className="mt-2 text-xs font-bold text-[var(--muted)]">{provider.startingPrice}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[rgba(10,37,64,0.12)] bg-white px-3 text-sm font-bold text-[var(--brand-navy)] transition-colors hover:bg-[var(--brand-orange-soft)]"
                href={provider.profileHref}
              >
                Profili Gör
              </a>
              <a
                className={cn(
                  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl px-3 text-sm font-bold text-white shadow-[var(--shadow-action)] transition-colors",
                  "bg-[var(--brand-orange)] hover:bg-[var(--brand-orange-dark)]",
                )}
                href={provider.bookingHref}
              >
                Rezervasyona Başla
                <ArrowRight aria-hidden className="size-4" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
