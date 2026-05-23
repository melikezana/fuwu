import Link from "next/link";
import type { ReactNode } from "react";
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
import { MobileCollapsibleSection } from "@/components/home/MobileCollapsibleSection";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { FAQSection } from "@/components/home/FAQSection";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { ProviderContactLink } from "@/components/providers/ProviderAnalytics";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { appRoutes } from "@/lib/constants/navigation";
import { I18nText, type TranslationKey } from "@/lib/i18n";
import {
  getProviderAvailabilityLabel,
} from "@/lib/constants/providers";
import { PROVIDER_AVAILABILITY_STATUSES } from "@/lib/constants/statuses";
import { services, type Service } from "@/lib/constants/services";
import { getProviderDirectory, type ProviderFilterOptions } from "@/services/providers";
import type { Provider } from "@/types/provider";

type SectionHeadingProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
};

const serviceOrder = [
  "Tesisat",
  "Elektrik",
  "Temizlik",
  "Halı Yıkama",
  "Klima & Beyaz Eşya",
  "Mobilya Montaj",
  "Boya Badana",
  "Nakliye Yardımı",
];

const howItWorksSteps = [
  {
    descriptionKey: "home.how.step1.description",
    href: "#services",
    titleKey: "home.how.step1.title",
  },
  {
    descriptionKey: "home.how.step2.description",
    href: "#providers-preview",
    titleKey: "home.how.step2.title",
  },
  {
    descriptionKey: "home.how.step3.description",
    href: "#provider-contact-actions",
    titleKey: "home.how.step3.title",
  },
] satisfies Array<{ descriptionKey: TranslationKey; href: string; titleKey: TranslationKey }>;

const trustItems = [
  {
    descriptionKey: "home.trust.item1.description",
    titleKey: "home.trust.item1.title",
  },
  {
    descriptionKey: "home.trust.item2.description",
    titleKey: "home.trust.item2.title",
  },
  {
    descriptionKey: "home.trust.item3.description",
    titleKey: "home.trust.item3.title",
  },
  {
    descriptionKey: "home.trust.item4.description",
    titleKey: "home.trust.item4.title",
  },
] satisfies Array<{ descriptionKey: TranslationKey; titleKey: TranslationKey }>;

const mobileTrustSignals: Array<{
  icon: LucideIcon;
  labelKey: TranslationKey;
}> = [
  { icon: ShieldCheck, labelKey: "home.trust.signal.approved" },
  { icon: MessageCircle, labelKey: "home.trust.signal.direct" },
  { icon: WalletCards, labelKey: "home.trust.signal.price" },
  { icon: Zap, labelKey: "home.trust.signal.fast" },
];

const orderedServices = serviceOrder
  .map((title) => services.find((service) => service.title === title))
  .filter((service): service is Service => Boolean(service));

function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
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

function MobileHeroTrustSignals() {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 md:hidden" aria-label="Fuwu güven sinyalleri">
      {mobileTrustSignals.map((signal) => {
        const Icon = signal.icon;

        return (
          <div
            className="inline-flex min-h-10 cursor-default select-none items-center gap-2 rounded-md border border-[rgba(13,20,36,0.08)] bg-white px-3 py-2 text-xs font-bold leading-4 text-[var(--brand-navy)] shadow-[0_8px_20px_rgba(13,20,36,0.04)]"
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

  return (
    <article className="group relative cursor-pointer select-none rounded-lg bg-white p-3.5 shadow-sm ring-1 ring-[var(--border)] transition-all hover:shadow-md hover:ring-gray-300">
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
      <div className="pointer-events-none relative z-10 mt-3 grid grid-cols-2 gap-2">
        <ProviderContactLink
          aria-label={`${provider.name} WhatsApp ile yaz`}
          className="pointer-events-auto inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-[#25D366]/10 px-3 text-xs font-semibold text-[#1DA851] transition-colors hover:bg-[#25D366]/20"
          kind="whatsapp"
          provider={provider}
          rel="noopener noreferrer"
          target="_blank"
        >
          WhatsApp
        </ProviderContactLink>
        <ProviderContactLink
          aria-label={`${provider.name} telefonla ara`}
          className="pointer-events-auto inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-gray-100 px-3 text-xs font-semibold text-[var(--brand-navy)] transition-colors hover:bg-gray-200"
          kind="phone"
          provider={provider}
        >
          Telefon
        </ProviderContactLink>
      </div>
    </article>
  );
}

function HeroMockup({ heroProviders }: { heroProviders: Provider[] }) {
  return (
    <aside className="mx-auto hidden w-full max-w-[340px] select-none xl:block xl:mx-0 xl:max-w-[350px] xl:justify-self-end 2xl:max-w-[360px]">
      <div className="relative rounded-[1.75rem] bg-[var(--brand-navy)] p-3 shadow-[0_26px_80px_rgba(13,20,36,0.16)]">
        <div className="rounded-[1.45rem] bg-[#F7F7F8] p-4">
          <div className="flex cursor-default select-none items-center justify-between">
            <Link
              aria-label="Fuwu ana sayfasına git"
              className="inline-flex cursor-pointer rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
              href={appRoutes.home}
            >
              <FuwuLogo size="sm" />
            </Link>
            <span className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-[var(--brand-navy)] shadow-[0_8px_18px_rgba(13,20,36,0.06)]">
              İstanbul
            </span>
          </div>

          <div className="mt-5 cursor-default select-none rounded-lg bg-white p-4 shadow-sm ring-1 ring-[var(--border)]">
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
              <div className="cursor-default rounded-lg bg-white p-4 text-center shadow-[0_12px_28px_rgba(13,20,36,0.07)] ring-1 ring-[rgba(13,20,36,0.08)]">
                <p className="text-sm font-bold leading-6 text-[var(--brand-navy)]">
                  <I18nText i18nKey="home.hero.empty.title" />
                </p>
                <p className="mt-1 text-xs font-bold leading-5 text-[var(--muted)]">
                  <I18nText i18nKey="home.hero.empty.description" />
                </p>
              </div>
            )}
          </div>

          <Link
            className="mt-4 inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-md bg-[var(--brand-orange)] px-4 text-sm font-bold text-white shadow-[0_14px_30px_rgba(255,138,0,0.22)] transition-colors hover:bg-[var(--brand-orange-dark)]"
            href={appRoutes.providers}
          >
            <I18nText i18nKey="cta.viewAllProviders" />
          </Link>
        </div>
      </div>
    </aside>
  );
}

function HeroSection({
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
      values: { count: services.length },
    },
    {
      labelKey: "home.hero.stats.districtCount",
      href: appRoutes.providers,
      values: { count: districtCount },
    },
  ];

  return (
    <section className="relative overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFBFC_55%,#F7F7F8_100%)]">
      <Container className="grid max-w-[1360px] gap-7 py-7 sm:py-14 lg:py-16 xl:grid-cols-[minmax(0,1fr)_minmax(280px,350px)] xl:items-center xl:justify-between xl:gap-8 2xl:grid-cols-[minmax(0,1fr)_360px] 2xl:gap-12">
        <div className="w-full max-w-full min-w-0 xl:max-w-[880px] xl:pr-2">
          <Link
            aria-label="Fuwu ana sayfasına git"
            className="inline-flex cursor-pointer select-none rounded-lg bg-white px-4 py-3 shadow-[0_18px_54px_rgba(13,20,36,0.07)] ring-1 ring-[rgba(13,20,36,0.08)] transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            href={appRoutes.home}
          >
            <FuwuLogo size="md" />
          </Link>

          <h1 className="mt-5 max-w-full cursor-default select-none text-3xl font-semibold leading-[1.1] text-[var(--brand-navy)] sm:max-w-3xl sm:text-5xl lg:text-6xl">
            <I18nText i18nKey="home.hero.title" />
          </h1>
          <p className="mt-4 max-w-full cursor-default select-none break-words text-sm font-semibold leading-6 text-[var(--muted)] sm:max-w-3xl sm:text-lg sm:leading-8">
            <span className="sm:hidden">
              <I18nText i18nKey="home.hero.mobileSummary" />
            </span>
            <span className="hidden sm:inline">
              <I18nText i18nKey="home.hero.subtitle" />
            </span>
          </p>

          <div className="mt-6 hidden max-w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {heroStats.map((item) => (
              <Link
                className="inline-flex min-w-0 cursor-pointer select-none items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-[var(--muted)] shadow-sm ring-1 ring-[var(--border)] transition-colors hover:bg-gray-50 hover:text-[var(--brand-navy)]"
                href={item.href}
                key={item.labelKey}
              >
                <span className="size-1.5 shrink-0 rounded-full bg-[var(--trust-green)]" />
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

function ServiceCard({ service }: { service: Service }) {
  const titleKey = `services.${service.id}.title` as TranslationKey;
  const descriptionKey = `services.${service.id}.description` as TranslationKey;

  return (
    <Link
      aria-label={`${service.title} kategorisinde usta bul`}
      className="group flex min-h-44 cursor-pointer flex-col justify-between rounded-lg bg-white p-5 shadow-[0_14px_38px_rgba(13,20,36,0.05)] ring-1 ring-[rgba(13,20,36,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(13,20,36,0.08)] hover:ring-[rgba(255,138,0,0.36)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
      href={service.href}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)] ring-1 ring-[rgba(255,138,0,0.24)] transition-colors group-hover:bg-[var(--brand-orange)] group-hover:text-white">
        <ServiceIcon className="h-7 w-7" name={service.iconName} />
      </span>
      <span className="mt-5 block">
        <span className="block text-xl font-semibold leading-tight text-[var(--brand-navy)]">
          <I18nText i18nKey={titleKey} />
        </span>
        <span className="mt-2 block text-sm font-semibold leading-6 text-[var(--muted)]">
          <I18nText i18nKey={descriptionKey} />
        </span>
        <span className="mt-4 inline-flex rounded-md bg-[var(--surface-soft)] px-3 py-2 text-sm font-bold text-[var(--brand-navy)] transition-colors group-hover:bg-[var(--brand-orange-soft)]">
          <I18nText i18nKey="cta.findProvider" />
        </span>
      </span>
    </Link>
  );
}

function ServicesSection() {
  return (
    <section className="border-y border-[var(--border)] bg-white" id="services">
      <Container className="py-12 sm:py-14 lg:py-16">
        <SectionHeading
          description={<I18nText i18nKey="home.services.description" />}
          eyebrow={<I18nText i18nKey="home.services.eyebrow" />}
          title={<I18nText i18nKey="home.services.title" />}
        />
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {orderedServices.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function ProviderPreviewSection({ featuredProviders }: { featuredProviders: Provider[] }) {
  return (
    <section className="bg-[var(--background)]" id="providers-preview">
      <Container className="py-12 sm:py-14 lg:py-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            description={<I18nText i18nKey="home.providers.description" />}
            eyebrow={<I18nText i18nKey="home.providers.eyebrow" />}
            title={<I18nText i18nKey="home.providers.title" />}
          />
          <Link
            className="cursor-pointer text-sm font-bold text-[var(--brand-orange-dark)] transition-colors hover:text-[var(--brand-navy)]"
            href={appRoutes.providers}
          >
            <I18nText i18nKey="cta.reviewProfiles" />
          </Link>
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
          <div className="mt-7 cursor-default rounded-lg bg-white p-7 text-center shadow-[0_18px_56px_rgba(13,20,36,0.07)] ring-1 ring-[rgba(13,20,36,0.08)]">
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

function HowItWorksSection() {
  return (
    <section className="border-y border-[var(--border)] bg-white" id="how-it-works">
      <Container className="py-9 sm:py-14 lg:py-16">
        <SectionHeading
          description={<I18nText i18nKey="home.how.description" />}
          eyebrow={<I18nText i18nKey="home.how.eyebrow" />}
          title={<I18nText i18nKey="home.how.title" />}
        />
        <MobileCollapsibleSection contentClassName="mt-7">
          <div className="grid gap-4 md:grid-cols-3">
            {howItWorksSteps.map((step, index) => (
              <Link
                className="group cursor-pointer select-none rounded-lg bg-white p-5 shadow-[0_14px_38px_rgba(13,20,36,0.06)] ring-1 ring-[rgba(13,20,36,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_58px_rgba(13,20,36,0.1)] hover:ring-[rgba(255,138,0,0.36)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
                href={step.href}
                key={step.titleKey}
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-sm font-bold text-[var(--brand-orange-dark)] transition-colors group-hover:bg-[var(--brand-orange)] group-hover:text-white">
                  0{index + 1}
                </span>
                <h3 className="mt-5 text-xl font-bold leading-tight text-[var(--brand-navy)]">
                  <I18nText i18nKey={step.titleKey} />
                </h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
                  <I18nText i18nKey={step.descriptionKey} />
                </p>
                <span className="mt-5 inline-flex text-sm font-bold text-[var(--brand-orange-dark)] transition-colors group-hover:text-[var(--brand-navy)]">
                  <I18nText i18nKey="cta.goToSection" />
                </span>
              </Link>
            ))}
          </div>
        </MobileCollapsibleSection>
      </Container>
    </section>
  );
}

function AboutSection() {
  return (
    <section className="border-y border-[var(--border)] bg-white" id="about">
      <Container className="py-9 sm:py-14 lg:py-16">
        <div className="grid gap-5 lg:grid-cols-[0.45fr_1fr] lg:items-start">
          <div className="cursor-default select-none">
            <p className="text-sm font-bold uppercase text-[var(--brand-orange-dark)]">
              <I18nText i18nKey="home.about.eyebrow" />
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-[var(--brand-navy)] sm:text-4xl">
              <I18nText i18nKey="home.about.title" />
            </h2>
          </div>
          <MobileCollapsibleSection contentClassName="mt-4 lg:mt-0">
            <p className="max-w-3xl cursor-default select-none text-base font-semibold leading-8 text-[var(--muted)] sm:text-lg">
              <I18nText i18nKey="home.about.description" />
            </p>
          </MobileCollapsibleSection>
        </div>
      </Container>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="bg-[#F7F7F8]" id="trust">
      <Container className="py-9 sm:py-14 lg:py-16">
        <SectionHeading
          description={<I18nText i18nKey="home.trust.description" />}
          eyebrow={<I18nText i18nKey="home.trust.eyebrow" />}
          title={<I18nText i18nKey="home.trust.title" />}
        />
        <MobileCollapsibleSection contentClassName="mt-7">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {trustItems.map((item) => (
              <div
                className="cursor-default select-none rounded-lg bg-white p-5 shadow-[0_14px_38px_rgba(13,20,36,0.05)] ring-1 ring-[rgba(13,20,36,0.08)]"
                key={item.titleKey}
              >
                <div className="mb-5 h-1.5 w-12 rounded-full bg-[var(--brand-orange)]" />
                <h3 className="text-xl font-bold leading-tight text-[var(--brand-navy)]">
                  <I18nText i18nKey={item.titleKey} />
                </h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
                  <I18nText i18nKey={item.descriptionKey} />
                </p>
              </div>
            ))}
          </div>
        </MobileCollapsibleSection>
      </Container>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="border-t border-[var(--border)] bg-white">
      <Container className="py-9 sm:py-14 lg:py-16">
        <div className="cursor-default select-none">
          <p className="text-sm font-bold uppercase text-[var(--brand-orange-dark)]">
            <I18nText i18nKey="home.final.eyebrow" />
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-bold leading-tight text-[var(--brand-navy)] sm:text-4xl">
            <I18nText i18nKey="home.final.title" />
          </h2>
        </div>
        <MobileCollapsibleSection contentClassName="mt-7">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-[#F7F7F8] p-6 shadow-[0_18px_48px_rgba(13,20,36,0.06)] ring-1 ring-[rgba(13,20,36,0.08)]">
              <div className="cursor-default select-none">
                <p className="text-sm font-bold uppercase text-[var(--brand-orange-dark)]">
                  <I18nText i18nKey="home.final.customer" />
                </p>
                <h3 className="mt-3 text-2xl font-bold leading-tight text-[var(--brand-navy)]">
                  <I18nText i18nKey="home.final.customerTitle" />
                </h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
                  <I18nText i18nKey="home.final.customerDescription" />
                </p>
              </div>
              <Button className="mt-5 w-full sm:w-fit" href={appRoutes.providers}>
                <I18nText i18nKey="cta.findProvider" />
              </Button>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-[0_18px_48px_rgba(13,20,36,0.06)] ring-1 ring-[rgba(13,20,36,0.08)]">
              <div className="cursor-default select-none">
                <p className="text-sm font-bold uppercase text-[var(--brand-orange-dark)]">
                  <I18nText i18nKey="home.final.provider" />
                </p>
                <h3 className="mt-3 text-2xl font-bold leading-tight text-[var(--brand-navy)]">
                  <I18nText i18nKey="home.final.providerTitle" />
                </h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
                  <I18nText i18nKey="home.final.providerDescription" />
                </p>
              </div>
              <Button
                className="mt-5 w-full sm:w-fit"
                href={appRoutes.providerApplication}
                variant="secondary"
              >
                <I18nText i18nKey="cta.provider" />
              </Button>
            </div>
          </div>
        </MobileCollapsibleSection>
      </Container>
    </section>
  );
}

export async function MarketplaceHome() {
  const { allProviders, filterOptions } = await getProviderDirectory();
  const featuredProviders = allProviders.filter((provider) => provider.featured).slice(0, 3);
  const previewProviders =
    featuredProviders.length > 0 ? featuredProviders : allProviders.slice(0, 3);
  const todayProviders = allProviders.filter(
    (provider) => provider.availability === PROVIDER_AVAILABILITY_STATUSES.musait,
  );
  const heroProviders = todayProviders.length > 0 ? todayProviders.slice(0, 2) : allProviders.slice(0, 2);
  const voiceProviders = Array.from(
    new Map([...heroProviders, ...previewProviders].map((provider) => [provider.id, provider])).values(),
  );
  const todayActiveCount = todayProviders.length;

  return (
    <div className="bg-[var(--background)]">
      <HeroSection
        districtCount={filterOptions.districts.length}
        filterOptions={filterOptions}
        heroProviders={heroProviders}
        todayActiveCount={todayActiveCount}
        voiceProviders={voiceProviders}
      />
      <ServicesSection />
      <ProviderPreviewSection featuredProviders={previewProviders} />
      <HowItWorksSection />
      <AboutSection />
      <TrustSection />
      <FAQSection />
      <FinalCTASection />
    </div>
  );
}
