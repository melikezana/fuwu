import Link from "next/link";
import {
  MessageCircle,
  ShieldCheck,
  WalletCards,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { LazyVoiceCommandButton } from "@/components/accessibility/LazyVoiceCommandButton";
import { FuwuLogo } from "@/components/brand/FuwuLogo";
import { HomeHeroFilters } from "@/components/home/HomeHeroFilters";
import { ProviderContactLink } from "@/components/providers/ProviderAnalytics";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { appRoutes } from "@/lib/constants/navigation";
import { I18nText, type TranslationKey } from "@/lib/i18n";
import { serviceCategories } from "@/lib/constants/services";
import type { ProviderFilterOptions } from "@/services/providers";
import type { Provider } from "@/types/provider";

const mobileTrustSignals: Array<{
  icon: LucideIcon;
  labelKey: TranslationKey;
}> = [
  { icon: ShieldCheck, labelKey: "home.trust.signal.approved" },
  { icon: MessageCircle, labelKey: "home.trust.signal.direct" },
  { icon: WalletCards, labelKey: "home.trust.signal.price" },
  { icon: Zap, labelKey: "home.trust.signal.fast" },
];

function MobileHeroTrustSignals() {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 md:hidden" aria-label="Fuwu güven sinyalleri">
      {mobileTrustSignals.map((signal) => {
        const Icon = signal.icon;

        return (
          <div
            className="inline-flex min-h-10 cursor-default select-none items-center gap-2 rounded-md border border-[rgba(13,20,36,0.08)] bg-white px-3 py-2 text-xs font-bold leading-4 text-[var(--brand-navy)] shadow-[var(--shadow-subtle)]"
            key={signal.labelKey}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0 text-[var(--brand-orange-dark)]" />
            <span className="min-w-0">
              <I18nText i18nKey={signal.labelKey} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PhoneProviderRow({ provider }: { provider: Provider }) {
  const profileHref = `${appRoutes.providers}/${provider.id}`;
  const hasWhatsApp = Boolean(provider.whatsapp?.trim());
  const hasPhone = Boolean(provider.phone?.trim());

  return (
    <article className="group relative cursor-pointer select-none rounded-lg bg-white p-3.5 shadow-[var(--shadow-subtle)] ring-1 ring-[var(--border)] transition-all hover:shadow-[var(--shadow-elevated)] hover:ring-gray-300">
      <Link
        aria-label={`${provider.name} profilini incele`}
        className="absolute inset-0 z-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
        href={profileHref}
      />
      <div className="pointer-events-none relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 cursor-default select-none">
          <p className="text-sm font-semibold leading-5 text-[var(--brand-navy)]">{provider.name}</p>
          <p className="mt-0.5 text-xs font-medium text-[var(--muted)]">
            {provider.category} • {provider.district}
          </p>
          {provider.averagePrice && (
            <p className="mt-1.5 text-xs font-semibold text-[var(--brand-navy)]">
              {provider.averagePrice}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-soft)] px-2 py-1 text-xs font-semibold text-[var(--brand-navy)]">
            ⭐ {provider.rating.toFixed(1)}
          </span>
        </div>
      </div>
      {hasWhatsApp || hasPhone ? (
      <div className="pointer-events-none relative z-10 mt-3 grid grid-cols-2 gap-2">
        {hasWhatsApp ? (
        <ProviderContactLink
          aria-label={`${provider.name} WhatsApp ile yaz`}
          className="pointer-events-auto h-9 min-h-9 px-3 text-xs"
          kind="whatsapp"
          provider={provider}
          rel="noopener noreferrer"
          target="_blank"
        >
          WhatsApp
        </ProviderContactLink>
        ) : null}
        {hasPhone ? (
        <ProviderContactLink
          aria-label={`${provider.name} telefonla ara`}
          className="pointer-events-auto h-9 min-h-9 px-3 text-xs"
          kind="phone"
          provider={provider}
        >
          Telefon
        </ProviderContactLink>
        ) : null}
      </div>
      ) : (
        <p className="relative z-10 mt-3 text-xs font-medium text-[var(--muted)]">
          İletişim bilgisi yakında eklenecek.
        </p>
      )}
    </article>
  );
}

function HeroMockup({ heroProviders }: { heroProviders: Provider[] }) {
  return (
    <aside className="mx-auto hidden w-full max-w-[320px] select-none xl:block xl:mx-0 xl:max-w-[300px] xl:justify-self-end 2xl:max-w-[320px]">
      <div className="relative rounded-[2rem] bg-white p-2 shadow-[var(--shadow-premium)] ring-1 ring-[rgba(13,20,36,0.06)]">
        <div className="rounded-[1.6rem] bg-[#F9FAFB] p-4 ring-1 ring-[rgba(13,20,36,0.04)] inset-ring-white">
          <div className="flex cursor-default select-none items-center justify-between">
            <Link
              aria-label="Fuwu ana sayfasına git"
              className="inline-flex cursor-pointer rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
              href={appRoutes.home}
            >
              <FuwuLogo size="sm" />
            </Link>
            <span className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-[var(--brand-navy)] shadow-[var(--shadow-subtle)]">
              İstanbul
            </span>
          </div>

          <div className="mt-5 cursor-default select-none rounded-lg bg-white p-4 shadow-[var(--shadow-subtle)] ring-1 ring-[var(--border)]">
            <p className="text-xs font-semibold text-[var(--trust-green)]">
              <I18nText i18nKey="home.hero.mockup.available" />
            </p>
            <h2 className="mt-1 text-lg font-semibold leading-tight text-[var(--brand-navy)]">
              <I18nText i18nKey="home.hero.mockup.nearby" />
            </h2>
            <p className="mt-1.5 text-xs font-medium leading-5 text-[var(--muted)]">
              <I18nText i18nKey="home.hero.mockup.summary" />
            </p>
          </div>

          <div className="mt-3 grid gap-3">
            {heroProviders.length > 0 ? (
              heroProviders.map((provider) => (
                <PhoneProviderRow key={provider.id} provider={provider} />
              ))
            ) : (
              <div className="cursor-default rounded-lg bg-white p-4 text-center shadow-[var(--shadow-card)] ring-1 ring-[rgba(13,20,36,0.08)]">
                <p className="text-sm font-bold leading-6 text-[var(--brand-navy)]">
                  <I18nText i18nKey="home.hero.empty.title" />
                </p>
                <p className="mt-1 text-xs font-bold leading-5 text-[var(--muted)]">
                  <I18nText i18nKey="home.hero.empty.description" />
                </p>
              </div>
            )}
          </div>

          <Button
            className="mt-4 w-full"
            href={appRoutes.providers}
          >
            <I18nText i18nKey="cta.viewAllProviders" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

export function MarketplaceHeroSection({
  districtCount,
  filterOptions,
  heroProviders,
  todayActiveCount,
  voiceProviders,
}: {
  districtCount: number;
  filterOptions: ProviderFilterOptions;
  heroProviders: Provider[];
  todayActiveCount: number;
  voiceProviders: Provider[];
}) {
  const heroStats: Array<{ href: string; labelKey: TranslationKey; values?: Record<string, number> }> = [
    { labelKey: "home.hero.stats.available", href: appRoutes.providers },
    {
      labelKey: "home.hero.stats.activeToday",
      href: appRoutes.providers,
      values: { count: todayActiveCount },
    },
    {
      labelKey: "home.hero.stats.categoryCount",
      href: appRoutes.services,
      values: { count: serviceCategories.length },
    },
    {
      labelKey: "home.hero.stats.districtCount",
      href: appRoutes.providers,
      values: { count: districtCount },
    },
  ];

  return (
    <section className="relative overflow-hidden border-b border-[var(--border)] bg-[#FAFAFA]">
      <Container className="grid max-w-[1400px] gap-8 py-10 sm:py-16 lg:py-20 xl:grid-cols-[1.3fr_auto] xl:items-center xl:justify-between xl:gap-12">
        <div className="w-full max-w-[calc(100vw-2rem)] min-w-0 sm:max-w-full xl:max-w-[820px] xl:pr-6">
          <Link
            aria-label="Fuwu ana sayfasına git"
            className="inline-flex cursor-pointer select-none rounded-lg bg-white px-4 py-3 shadow-[var(--shadow-elevated)] ring-1 ring-[rgba(13,20,36,0.08)] transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            href={appRoutes.home}
          >
            <FuwuLogo size="md" />
          </Link>

          <h1 className="text-wrap-anywhere mt-5 max-w-full cursor-default select-none break-words text-3xl font-bold tracking-tight leading-[1.15] text-[var(--brand-navy)] sm:max-w-3xl sm:text-5xl lg:text-[4rem]">
            <I18nText i18nKey="home.hero.title" />
          </h1>
          <p className="mt-5 max-w-full cursor-default select-none break-words text-[15px] font-medium leading-relaxed text-[#4B5563] sm:max-w-3xl sm:text-xl sm:leading-[1.7]">
            <span className="sm:hidden">
              <I18nText i18nKey="home.hero.mobileSummary" />
            </span>
            <span className="hidden sm:inline">
              <I18nText i18nKey="home.hero.subtitle" />
            </span>
          </p>

          <div className="mt-8 hidden max-w-full gap-3 sm:flex sm:flex-wrap">
            {heroStats.map((item) => (
              <Link
                className="inline-flex min-w-0 cursor-pointer select-none items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[0.8rem] font-bold text-[#4B5563] shadow-[var(--shadow-subtle)] ring-1 ring-[#E5E7EB] transition-all hover:bg-[#F9FAFB] hover:text-[var(--brand-navy)] hover:shadow-[var(--shadow-elevated)]"
                href={item.href}
                key={item.labelKey}
              >
                <span className="size-2 shrink-0 rounded-full bg-[var(--brand-orange)] shadow-[var(--shadow-action)]" />
                <span>
                  <I18nText i18nKey={item.labelKey} values={item.values} />
                </span>
              </Link>
            ))}
          </div>

          <HomeHeroFilters filterOptions={filterOptions} />
          <MobileHeroTrustSignals />
          <div className="hidden md:block">
            <LazyVoiceCommandButton
              categories={filterOptions.categories}
              districts={filterOptions.districts}
              providers={voiceProviders}
            />
          </div>
        </div>

        <HeroMockup heroProviders={heroProviders} />
      </Container>
    </section>
  );
}
