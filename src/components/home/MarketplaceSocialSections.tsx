import type { ReactNode } from "react";
import {
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
    icon: LucideIcon;
    label: string;
    value: number;
  }> = [
    {
      icon: Users,
      label: "Aktif Usta",
      value: metrics.activeProviders,
    },
    {
      icon: Wrench,
      label: "Hizmet Kategorisi",
      value: metrics.serviceCategories,
    },
    {
      icon: MapPin,
      label: "İstanbul İlçesi",
      value: metrics.districts,
    },
    {
      icon: CheckCircle2,
      label: "Tamamlanan Talep",
      value: metrics.completedRequests,
    },
  ];

  return (
    <section className="border-b border-[var(--border)] bg-white" id="social-proof">
      <Container className="py-7 sm:py-9">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                className="flex min-w-0 items-center gap-3 rounded-lg border border-[rgba(13,20,36,0.08)] bg-[#FAFAFA] p-4"
                key={stat.label}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-2xl font-bold leading-none text-[var(--brand-navy)]">
                    {formatStatValue(stat.value)}
                  </span>
                  <span className="mt-1 block text-sm font-semibold leading-5 text-[var(--muted)]">
                    {stat.label}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

export function MarketplaceProviderPreviewSection({ featuredProviders }: { featuredProviders: Provider[] }) {
  return (
    <section className="bg-[var(--background)]" id="providers-preview">
      <Container className="py-12 sm:py-14 lg:py-16">
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
          <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
