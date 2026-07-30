import Link from "next/link";
import { ArrowRight, BadgeCheck, CircleDollarSign, MapPin, MessageSquareText, Star } from "lucide-react";
import { ProviderAvatar } from "@/components/providers/ProviderAvatar";
import { ProviderTrustBadges } from "@/components/providers/ProviderTrustBadges";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { homeCopy } from "@/lib/constants/home";
import { appRoutes } from "@/lib/constants/navigation";
import type { Provider } from "@/types/provider";

type TrustedProvidersProps = {
  providers: Provider[];
  totalCount: number;
};

function getStartingPrice(provider: Provider) {
  if (typeof provider.averagePriceMin === "number" && Number.isFinite(provider.averagePriceMin)) {
    return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(
      provider.averagePriceMin,
    )} TL'den başlar`;
  }

  const price = provider.averagePrice?.trim();

  if (price && price !== "Bilgi yok") {
    return price;
  }

  return "";
}

export function TrustedProviders({ providers, totalCount }: TrustedProvidersProps) {
  const hasProviders = providers.length > 0;

  return (
    <section className="border-b border-[var(--border)] bg-white py-14 sm:py-16 lg:py-20" id="providers">
      <Container className="max-w-[1240px]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionIntro
            description={homeCopy.providers.description}
            eyebrow={homeCopy.providers.eyebrow}
            title={homeCopy.providers.title}
          />
          <Link
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-4 text-sm font-bold text-[var(--brand-navy)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(249,115,22,0.4)] hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            href={appRoutes.providers}
          >
            Tüm profilleri incele
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        {hasProviders ? (
          <div className="mt-8 grid auto-rows-fr gap-4 lg:grid-cols-3">
            {providers.map((provider) => {
              const profileHref = `${appRoutes.providers}/${provider.id}`;
              const startingPrice = getStartingPrice(provider);
              const hasRating = Number.isFinite(provider.rating) && provider.rating > 0;
              const isVerified = Boolean(
                provider.isVerified ||
                  provider.identityVerified ||
                  provider.phoneVerified ||
                  provider.trustBadges.length,
              );

              return (
                <article
                  className="flex min-w-0 flex-col rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 shadow-[var(--shadow-subtle)] transition-all duration-200 hover:-translate-y-1 hover:border-[rgba(249,115,22,0.32)] hover:bg-white hover:shadow-[var(--shadow-card)]"
                  key={provider.id}
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <ProviderAvatar provider={provider} variant="card" />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-extrabold leading-6 text-[var(--brand-navy)]">
                            {provider.name}
                          </h3>
                          <p className="mt-1 text-sm font-semibold leading-5 text-[var(--muted)]">
                            {provider.category}
                          </p>
                        </div>
                        {isVerified ? (
                          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--trust-green-soft)] text-[var(--trust-green)] ring-1 ring-[rgba(23,116,95,0.18)]">
                            <BadgeCheck aria-hidden="true" className="size-4" />
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
                    <span className="inline-flex min-w-0 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 py-2 font-semibold text-[var(--brand-navy)]">
                      <MapPin aria-hidden="true" className="size-4 shrink-0 text-[var(--brand-orange)]" />
                      <span className="truncate">{provider.district}</span>
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 py-2 font-semibold text-[var(--brand-navy)]">
                      <Star
                        aria-hidden="true"
                        className="size-4 shrink-0 text-amber-600"
                        fill={hasRating ? "currentColor" : "none"}
                      />
                      <span className="truncate">{hasRating ? provider.rating.toFixed(1) : "Puan yok"}</span>
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 py-2 font-semibold text-[var(--brand-navy)]">
                      <MessageSquareText
                        aria-hidden="true"
                        className="size-4 shrink-0 text-[var(--brand-orange)]"
                      />
                      <span className="truncate">{provider.reviewCount} yorum</span>
                    </span>
                    {startingPrice ? (
                      <span className="inline-flex min-w-0 items-center gap-2 rounded-md border border-[rgba(249,115,22,0.22)] bg-[var(--brand-orange-soft)] px-3 py-2 font-semibold text-[var(--brand-navy)]">
                        <CircleDollarSign
                          aria-hidden="true"
                          className="size-4 shrink-0 text-[var(--brand-orange-dark)]"
                        />
                        <span className="truncate">{startingPrice}</span>
                      </span>
                    ) : null}
                  </div>

                  <ProviderTrustBadges className="mt-4" badges={provider.trustBadges} limit={3} />

                  <Button className="mt-auto h-11 min-h-11 gap-2 pt-2" href={profileHref}>
                    Profili İncele
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-lg border border-dashed border-[rgba(20,33,61,0.18)] bg-[var(--background)] px-5 py-10 text-center">
            <h3 className="text-xl font-extrabold text-[var(--brand-navy)]">
              {homeCopy.providers.emptyTitle}
            </h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm font-medium leading-6 text-[var(--muted)]">
              {homeCopy.providers.emptyDescription}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button href={appRoutes.providers}>Usta Bul</Button>
              <Button href={appRoutes.providerApplication} variant="secondary">
                Hizmet Ver
              </Button>
            </div>
            {totalCount > 0 ? (
              <p className="mt-4 text-xs font-semibold text-[var(--muted)]">
                Yayına hazır olmayan veya örnek profiller bu alanda güvenilir usta olarak gösterilmez.
              </p>
            ) : null}
          </div>
        )}
      </Container>
    </section>
  );
}
