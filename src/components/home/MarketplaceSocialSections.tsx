import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  MapPin,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { Container } from "@/components/ui/Container";
import { TextLink } from "@/components/ui/TextLink";
import { appRoutes } from "@/lib/constants/navigation";
import { I18nText } from "@/lib/i18n";
import type { MarketplaceTrustMetrics } from "@/services/providers";
import type { Provider } from "@/types/provider";

type SectionHeadingProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
};

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="max-w-3xl cursor-default select-none">
      {eyebrow ? (
        <p className="text-sm font-bold uppercase text-[var(--brand-orange-dark)]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-3 text-3xl font-semibold leading-tight text-[var(--brand-navy)] sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base font-medium leading-7 text-[var(--muted)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function formatStatValue(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function MarketplaceSocialProofSection({ metrics }: { metrics: MarketplaceTrustMetrics }) {
  const stats: Array<{
    href: string;
    icon: LucideIcon;
    label: string;
    value: number;
  }> = [
    {
      href: appRoutes.providers,
      icon: Users,
      label: "Aktif Usta",
      value: metrics.activeProviders,
    },
    {
      href: appRoutes.services,
      icon: Wrench,
      label: "Hizmet Kategorisi",
      value: metrics.serviceCategories,
    },
    {
      href: appRoutes.providers,
      icon: MapPin,
      label: "İstanbul İlçesi",
      value: metrics.districts,
    },
    {
      href: "/account/requests",
      icon: CheckCircle2,
      label: "Tamamlanan Talep",
      value: metrics.completedRequests,
    },
  ];

  return (
    <section className="border-b border-[var(--border)] bg-white" id="social-proof">
      <Container className="max-w-7xl py-8 sm:py-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <Link
                aria-label={`${stat.label} detaylarını görüntüle`}
                className="group flex min-w-0 items-center gap-3 rounded-xl border border-[rgba(13,20,36,0.08)] bg-[#FAFAFA] p-4 shadow-[var(--shadow-subtle)] transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(255,138,0,0.34)] hover:bg-white hover:shadow-[var(--shadow-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
                href={stat.href}
                key={stat.label}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)] ring-1 ring-[rgba(255,138,0,0.15)] transition-colors group-hover:bg-[var(--brand-orange)] group-hover:text-white">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-2xl font-bold leading-none text-[var(--brand-navy)]">
                    {formatStatValue(stat.value)}
                  </span>
                  <span className="mt-1 block text-sm font-semibold leading-5 text-[var(--muted)]">
                    {stat.label}
                  </span>
                </span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--brand-orange-dark)] transition-all group-hover:border-[var(--brand-orange)] group-hover:bg-[var(--brand-orange-soft)]">
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

export function MarketplaceProviderPreviewSection({ featuredProviders }: { featuredProviders: Provider[] }) {
  const providerGridClassName =
    featuredProviders.length === 1
      ? "mx-auto max-w-2xl"
      : featuredProviders.length === 2
        ? "mx-auto max-w-5xl md:grid-cols-2"
        : "md:grid-cols-2 xl:grid-cols-3";

  return (
    <section className="bg-[var(--background)]" id="providers-preview">
      <Container className="max-w-7xl py-14 sm:py-16 lg:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            description={<I18nText i18nKey="home.providers.description" />}
            eyebrow={<I18nText i18nKey="home.providers.eyebrow" />}
            title={<I18nText i18nKey="home.providers.title" />}
          />
          <TextLink
            className="text-sm font-semibold"
            href={appRoutes.providers}
          >
            <I18nText i18nKey="cta.reviewProfiles" />
          </TextLink>
        </div>
        {featuredProviders.length > 0 ? (
          <div className={`mt-8 grid auto-rows-fr gap-5 ${providerGridClassName}`}>
            {featuredProviders.map((provider, index) => (
              <ProviderCard
                actionsId={index === 0 ? "provider-contact-actions" : undefined}
                key={provider.id}
                provider={provider}
              />
            ))}
          </div>
        ) : (
          <div className="mt-7 cursor-default rounded-lg bg-white p-7 text-center shadow-[var(--shadow-elevated)] ring-1 ring-[rgba(13,20,36,0.08)]">
            <p className="text-xl font-bold text-[var(--brand-navy)]">
              <I18nText i18nKey="home.hero.empty.title" />
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-[var(--muted)]">
              <I18nText i18nKey="home.hero.empty.description" />
            </p>
          </div>
        )}
      </Container>
    </section>
  );
}
