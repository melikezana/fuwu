import Link from "next/link";
import type { ReactNode } from "react";
import { FuwuLogo } from "@/components/brand/FuwuLogo";
import { HomeHeroFilters } from "@/components/home/HomeHeroFilters";
import { Container } from "@/components/ui/Container";
import { FAQSection } from "@/components/home/FAQSection";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { SmartMatchSection } from "@/components/home/SmartMatchSection";
import { ProviderContactLink } from "@/components/providers/ProviderAnalytics";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { appRoutes } from "@/lib/constants/navigation";
import { I18nText, type TranslationKey } from "@/lib/i18n";
import { PROVIDER_AVAILABILITY_STATUSES } from "@/lib/constants/statuses";
import { services, type Service } from "@/lib/constants/services";
import {
  createInstantMatchQuery,
  getInstantMatchedProviders,
  type InstantMatchedProvidersResult,
  type InstantMatchInput,
} from "@/services/matching";
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
  "Bahçe Bakımı",
  "Havuz Bakımı",
];

const quickSteps = [
  {
    description: "İhtiyacına en yakın kategoriyi seç.",
    title: "Hizmet seç",
  },
  {
    description: "Sadece çalışılacak ilçeyi belirt.",
    title: "İlçe seç",
  },
  {
    description: "Ekonomik, Standart veya Premium seç.",
    title: "Bütçe seç",
  },
] satisfies Array<{ description: string; title: string }>;

const trustSignals = ["Net fiyat aralığı", "Puan bilgisi", "Direkt WhatsApp", "Telefonla arama"];

const orderedServices = serviceOrder
  .map((title) => services.find((service) => service.title === title))
  .filter((service): service is Service => Boolean(service));

function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="max-w-3xl cursor-default select-none">
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase text-[var(--brand-orange-dark)]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-2 text-2xl font-semibold leading-tight text-[var(--brand-navy)] sm:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted)] sm:text-base sm:leading-7">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function PhoneProviderRow({ provider }: { provider: Provider }) {
  const profileHref = `${appRoutes.providers}/${provider.id}`;
  const displayPrice =
    provider.averagePrice && !/\b(null|undefined|nan)\b/i.test(provider.averagePrice)
      ? provider.averagePrice
      : "";

  return (
    <article className="group relative cursor-pointer select-none rounded-lg bg-white p-3 shadow-[0_10px_24px_rgba(13,20,36,0.05)] ring-1 ring-[rgba(13,20,36,0.08)] transition-all hover:shadow-[0_14px_32px_rgba(13,20,36,0.08)] hover:ring-[rgba(255,138,0,0.28)]">
      <Link
        aria-label={`${provider.name} profilini incele`}
        className="absolute inset-0 z-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
        href={profileHref}
      />
      <div className="pointer-events-none relative z-10 flex items-start justify-between gap-2.5">
        <div className="min-w-0 cursor-default select-none">
          <p className="text-sm font-semibold leading-5 text-[var(--brand-navy)]">{provider.name}</p>
          <p className="mt-0.5 text-xs font-medium text-[var(--muted)]">
            {provider.category} • {provider.district}
          </p>
          {displayPrice ? (
            <p className="mt-1.5 text-xs font-semibold text-[var(--brand-navy)]">
              {displayPrice}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-soft)] px-2 py-1 text-[0.7rem] font-semibold text-[var(--brand-navy)]">
            ⭐ {provider.rating.toFixed(1)}
          </span>
        </div>
      </div>
      <div className="pointer-events-none relative z-10 mt-2.5 grid grid-cols-2 gap-2">
        <ProviderContactLink
          aria-label={`${provider.name} WhatsApp ile yaz`}
          className="pointer-events-auto inline-flex h-8 cursor-pointer items-center justify-center rounded-md bg-[#25D366]/10 px-2.5 text-xs font-semibold text-[#1DA851] transition-colors hover:bg-[#25D366]/20"
          kind="whatsapp"
          provider={provider}
          rel="noopener noreferrer"
          target="_blank"
        >
          WhatsApp
        </ProviderContactLink>
        <ProviderContactLink
          aria-label={`${provider.name} telefonla ara`}
          className="pointer-events-auto inline-flex h-8 cursor-pointer items-center justify-center rounded-md bg-gray-100 px-2.5 text-xs font-semibold text-[var(--brand-navy)] transition-colors hover:bg-gray-200"
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
    <aside className="mx-auto hidden w-full max-w-[310px] select-none lg:block lg:mx-0 lg:justify-self-end xl:max-w-[326px]">
      <div className="relative rounded-[1.65rem] bg-[var(--brand-navy)] p-2.5 shadow-[0_24px_66px_rgba(13,20,36,0.14)]">
        <div className="rounded-[1.35rem] bg-[#F7F7F8] p-3.5">
          <div className="flex cursor-default select-none items-center justify-between">
            <Link
              aria-label="Fuwu ana sayfasına git"
              className="inline-flex cursor-pointer rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
              href={appRoutes.home}
            >
              <FuwuLogo size="sm" />
            </Link>
            <span className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-[var(--brand-navy)] shadow-[0_8px_18px_rgba(13,20,36,0.05)]">
              İstanbul
            </span>
          </div>

          <div className="mt-4 cursor-default select-none rounded-lg bg-white p-3.5 shadow-[0_10px_26px_rgba(13,20,36,0.05)] ring-1 ring-[rgba(13,20,36,0.08)]">
            <p className="text-[0.7rem] font-semibold uppercase text-[var(--trust-green)]">
              <I18nText i18nKey="home.hero.mockup.available" />
            </p>
            <h2 className="mt-1 text-base font-semibold leading-tight text-[var(--brand-navy)]">
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
              <div className="cursor-default rounded-lg bg-white p-3.5 text-center shadow-[0_10px_24px_rgba(13,20,36,0.05)] ring-1 ring-[rgba(13,20,36,0.08)]">
                <p className="text-sm font-semibold leading-5 text-[var(--brand-navy)]">
                  <I18nText i18nKey="home.hero.empty.title" />
                </p>
                <p className="mt-1.5 text-xs font-medium leading-5 text-[var(--muted)]">
                  <I18nText i18nKey="home.hero.empty.description" />
                </p>
              </div>
            )}
          </div>

          <Link
            className="mt-3.5 inline-flex min-h-10 w-full cursor-pointer items-center justify-center rounded-md bg-[var(--brand-orange)] px-4 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(255,138,0,0.22)] transition-colors hover:bg-[var(--brand-orange-dark)]"
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
  filterOptions,
  heroProviders,
}: {
  filterOptions: ProviderFilterOptions;
  heroProviders: Provider[];
}) {
  return (
    <section className="relative overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFBFC_58%,#F7F7F8_100%)]">
      <Container className="grid max-w-[1180px] gap-6 py-6 sm:py-9 lg:grid-cols-[minmax(0,1fr)_minmax(292px,316px)] lg:items-center lg:gap-7 lg:py-11 xl:grid-cols-[minmax(0,760px)_316px] xl:justify-between xl:gap-8">
        <div className="w-full max-w-full min-w-0 xl:max-w-[830px]">
          <h1 className="max-w-[23rem] cursor-default select-none break-words text-[2rem] font-semibold leading-[1.12] text-[var(--brand-navy)] sm:max-w-3xl sm:text-4xl sm:leading-[1.1] lg:text-5xl">
            <I18nText i18nKey="home.hero.title" />
          </h1>
          <p className="mt-3 max-w-full cursor-default select-none break-words text-sm font-medium leading-6 text-[var(--muted)] sm:max-w-[38rem] sm:text-base sm:leading-7">
            <span className="sm:hidden">
              <I18nText i18nKey="home.hero.mobileSummary" />
            </span>
            <span className="hidden sm:inline">
              <I18nText i18nKey="home.hero.subtitle" />
            </span>
          </p>

          <HomeHeroFilters filterOptions={filterOptions} />
        </div>

        <HeroMockup heroProviders={heroProviders} />
      </Container>
    </section>
  );
}

function ServiceCard({ service }: { service: Service }) {
  const titleKey = `services.${service.id}.title` as TranslationKey;

  return (
    <Link
      aria-label={`${service.title} kategorisinde usta bul`}
      className="group grid min-h-20 cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg bg-white p-4 shadow-[0_10px_28px_rgba(13,20,36,0.04)] ring-1 ring-[rgba(13,20,36,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(13,20,36,0.07)] hover:ring-[rgba(255,138,0,0.34)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
      href={service.href}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)] ring-1 ring-[rgba(255,138,0,0.22)] transition-colors group-hover:bg-[var(--brand-orange)] group-hover:text-white">
        <ServiceIcon className="h-5 w-5" name={service.iconName} />
      </span>
      <span className="block min-w-0">
        <span className="block truncate text-base font-semibold leading-tight text-[var(--brand-navy)]">
          <I18nText i18nKey={titleKey} />
        </span>
        <span className="mt-1 inline-flex text-sm font-semibold text-[var(--brand-orange-dark)] transition-colors group-hover:text-[var(--brand-navy)]">
          <I18nText i18nKey="cta.findProvider" />
        </span>
      </span>
    </Link>
  );
}

function ServicesSection() {
  return (
    <section className="border-y border-[var(--border)] bg-white" id="services">
      <Container className="py-9 sm:py-11 lg:py-12">
        <SectionHeading
          description={<I18nText i18nKey="home.services.description" />}
          eyebrow={<I18nText i18nKey="home.services.eyebrow" />}
          title={<I18nText i18nKey="home.services.title" />}
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
      <Container className="py-9 sm:py-11 lg:py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            description={<I18nText i18nKey="home.providers.description" />}
            eyebrow={<I18nText i18nKey="home.providers.eyebrow" />}
            title={<I18nText i18nKey="home.providers.title" />}
          />
          <Link
            className="cursor-pointer text-sm font-semibold text-[var(--brand-orange-dark)] transition-colors hover:text-[var(--brand-navy)]"
            href={appRoutes.providers}
          >
            <I18nText i18nKey="cta.reviewProfiles" />
          </Link>
        </div>
        {featuredProviders.length > 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredProviders.map((provider, index) => (
              <ProviderCard
                actionsId={index === 0 ? "provider-contact-actions" : undefined}
                key={provider.id}
                provider={provider}
              />
            ))}
          </div>
        ) : (
          <div className="mt-5 cursor-default rounded-lg bg-white p-5 text-center shadow-[0_14px_38px_rgba(13,20,36,0.06)] ring-1 ring-[rgba(13,20,36,0.08)]">
            <p className="text-lg font-semibold text-[var(--brand-navy)]">
              <I18nText i18nKey="home.hero.empty.title" />
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-[var(--muted)]">
              <I18nText i18nKey="home.hero.empty.description" />
            </p>
          </div>
        )}
      </Container>
    </section>
  );
}

function CompactProofSection() {
  return (
    <section className="border-y border-[var(--border)] bg-white" id="how-it-works">
      <Container className="py-8 sm:py-10 lg:py-11">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-start">
          <div className="cursor-default select-none" id="about">
            <p className="text-sm font-semibold uppercase text-[var(--brand-orange-dark)]">
              Nasıl çalışır?
            </p>
            <h2 className="mt-2 max-w-lg text-2xl font-semibold leading-tight text-[var(--brand-navy)] sm:text-3xl">
              Üç seçim yap, uygun ustaya direkt ulaş.
            </h2>
            <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-[var(--muted)]">
              <I18nText i18nKey="home.about.description" />
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {quickSteps.map((step, index) => (
              <div
                className="rounded-lg bg-[#F7F7F8] p-4 ring-1 ring-[rgba(13,20,36,0.08)]"
                key={step.title}
              >
                <span className="inline-flex size-8 items-center justify-center rounded-md bg-[var(--brand-orange)] text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-3 text-base font-semibold leading-tight text-[var(--brand-navy)]">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm font-medium leading-6 text-[var(--muted)]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border)] pt-5"
          id="trust"
        >
          {trustSignals.map((signal) => (
            <span
              className="inline-flex min-h-9 cursor-default select-none items-center rounded-md bg-[var(--brand-orange-soft)] px-3 text-sm font-semibold text-[var(--brand-navy)] ring-1 ring-[rgba(255,138,0,0.24)]"
              key={signal}
            >
              {signal}
            </span>
          ))}
          <Link
            className="inline-flex min-h-9 cursor-pointer select-none items-center rounded-md bg-[var(--brand-navy)] px-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-navy-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            href={appRoutes.providers}
          >
            Ustaları gör
          </Link>
        </div>
      </Container>
    </section>
  );
}

export async function MarketplaceHome({
  isSmartMatchActive = false,
  smartMatchInput = {},
}: {
  isSmartMatchActive?: boolean;
  smartMatchInput?: InstantMatchInput;
}) {
  const matchQuery = createInstantMatchQuery(smartMatchInput);
  const emptyMatchResult: InstantMatchedProvidersResult = {
    exactMatchCount: 0,
    fallbackReason: null,
    isExactMatch: false,
    isFallback: false,
    providers: [],
    query: matchQuery,
  };
  const [providerDirectory, matchedProviders] = await Promise.all([
    getProviderDirectory(),
    isSmartMatchActive ? getInstantMatchedProviders(smartMatchInput, 6) : Promise.resolve(emptyMatchResult),
  ]);
  const { allProviders, filterOptions } = providerDirectory;
  const featuredProviders = allProviders.filter((provider) => provider.featured).slice(0, 3);
  const previewProviders =
    featuredProviders.length > 0 ? featuredProviders : allProviders.slice(0, 3);
  const todayProviders = allProviders.filter(
    (provider) => provider.availability === PROVIDER_AVAILABILITY_STATUSES.musait,
  );
  const heroProviders = todayProviders.length > 0 ? todayProviders.slice(0, 2) : allProviders.slice(0, 2);

  return (
    <div className="bg-[var(--background)]">
      <HeroSection
        filterOptions={filterOptions}
        heroProviders={heroProviders}
      />
      <SmartMatchSection
        filterOptions={filterOptions}
        isActive={isSmartMatchActive}
        matchQuery={matchQuery}
        matchResult={matchedProviders}
      />
      <ServicesSection />
      <ProviderPreviewSection featuredProviders={previewProviders} />
      <CompactProofSection />
      <FAQSection />
    </div>
  );
}
