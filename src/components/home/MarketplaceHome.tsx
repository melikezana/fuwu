import Link from "next/link";
import { FuwuLogo } from "@/components/brand/FuwuLogo";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { FAQSection } from "@/components/home/FAQSection";
import { ServiceIcon } from "@/components/home/ServiceIcon";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { appRoutes, ctaLabels } from "@/lib/constants/navigation";
import {
  getProviderPhoneHref,
  getProviderWhatsAppHref,
  minimumRatingOptions,
} from "@/lib/constants/providers";
import { services, type Service } from "@/lib/constants/services";
import { getProviderDirectory, type ProviderFilterOptions } from "@/services/providers";
import type { Provider } from "@/types/provider";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
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

const heroServiceFilterOptions = [
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
    title: "Hizmetini seç",
    description: "Kategori veya arama alanından ihtiyacını belirle, sonuçları hizmete göre daralt.",
    href: "#services",
  },
  {
    title: "Ustaları karşılaştır",
    description: "İlçe, fiyat aralığı, puan, deneyim ve uygunluk bilgisini aynı ekranda incele.",
    href: "#providers-preview",
  },
  {
    title: "Direkt iletişime geç",
    description: "Karar verdiğinde ustayı telefonla ara veya WhatsApp üzerinden hemen yaz.",
    href: "#provider-contact-actions",
  },
];

const trustItems = [
  {
    title: "Şeffaf fiyat aralığı",
    description: "Her profilde ortalama fiyat aralığını görerek bütçeni hızlıca netleştir.",
  },
  {
    title: "Puan ve profil bilgisi",
    description: "Deneyim, yorum sayısı, hizmet bölgesi ve çalışma saatlerini birlikte değerlendir.",
  },
  {
    title: "Doğrudan iletişim",
    description: "Aracı beklemeden telefon veya WhatsApp ile ustaya doğrudan ulaş.",
  },
  {
    title: "Memnuniyetin önceliğimiz",
    description: "Net bilgiler ve doğrudan iletişimle kararını güvenle vermene yardımcı olur.",
  },
];

const orderedServices = serviceOrder
  .map((title) => services.find((service) => service.title === title))
  .filter((service): service is Service => Boolean(service));

const fieldBaseClassName =
  "mt-2 h-12 w-full min-w-0 rounded-md border border-[var(--border)] bg-white px-3.5 text-sm font-medium leading-5 text-[var(--brand-navy)] outline-none transition-colors placeholder:text-[#6B7280] focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]";

const selectClassName = `${fieldBaseClassName} cursor-pointer select-none pr-10`;
const inputClassName = `${fieldBaseClassName} cursor-text select-text`;

function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="max-w-3xl cursor-default select-none">
      {eyebrow ? (
        <p className="text-sm font-bold uppercase text-[var(--brand-orange-dark)]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-3 text-3xl font-bold leading-tight text-[var(--brand-navy)] sm:text-4xl">
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

function HeroField({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="block min-w-0 cursor-default">
      <span className="block cursor-default select-none text-xs font-bold uppercase leading-4 text-[var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function HeroSearch({ filterOptions }: { filterOptions: ProviderFilterOptions }) {
  return (
    <form
      action={appRoutes.providers}
      className="mt-8 w-full cursor-default rounded-lg bg-white p-4 shadow-[0_22px_60px_rgba(13,20,36,0.09)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-5"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[minmax(10rem,1.15fr)_minmax(8.5rem,0.95fr)_minmax(8rem,0.85fr)_minmax(8rem,0.85fr)_minmax(8.5rem,0.8fr)_minmax(7.75rem,auto)] 2xl:items-end">
        <HeroField label="Hizmet">
          <select className={selectClassName} defaultValue="" name="category">
            <option value="">Tüm hizmetler</option>
            {heroServiceFilterOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </HeroField>

        <HeroField label="İlçe">
          <select className={selectClassName} defaultValue="" name="district">
            <option value="">Tüm ilçeler</option>
            {filterOptions.districts.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </HeroField>

        <HeroField label="Minimum Fiyat">
          <input
            className={inputClassName}
            inputMode="numeric"
            min="0"
            name="average_price_min"
            placeholder="Örn. 500"
            step="50"
            type="number"
          />
        </HeroField>

        <HeroField label="Maksimum Fiyat">
          <input
            className={inputClassName}
            inputMode="numeric"
            min="0"
            name="average_price_max"
            placeholder="Örn. 2500"
            step="50"
            type="number"
          />
        </HeroField>

        <HeroField label="Puan">
          <select className={selectClassName} defaultValue="" name="rating">
            <option value="">Tüm puanlar</option>
            {minimumRatingOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </HeroField>

        <Button className="h-12 min-h-12 w-full rounded-md px-5" type="submit">
          {ctaLabels.findProvider}
        </Button>
      </div>
    </form>
  );
}

function PhoneProviderRow({ provider }: { provider: Provider }) {
  const profileHref = `${appRoutes.providers}/${provider.id}`;

  return (
    <article className="group relative cursor-pointer select-none rounded-lg bg-white p-3 shadow-[0_12px_28px_rgba(13,20,36,0.07)] ring-1 ring-[rgba(13,20,36,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(13,20,36,0.1)] hover:ring-[rgba(255,138,0,0.34)]">
      <Link
        aria-label={`${provider.name} profilini incele`}
        className="absolute inset-0 z-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
        href={profileHref}
      />
      <div className="pointer-events-none relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 cursor-default select-none">
          <p className="text-sm font-bold leading-5 text-[var(--brand-navy)]">{provider.name}</p>
          <p className="mt-1 text-xs font-bold text-[var(--muted)]">
            {provider.category} · {provider.district}
          </p>
        </div>
        <span className="rounded-full bg-[var(--brand-orange-soft)] px-2.5 py-1 text-[0.68rem] font-bold text-[var(--brand-orange-dark)]">
          {provider.rating.toFixed(1)}
        </span>
      </div>
      <div className="pointer-events-none relative z-10 mt-3 grid grid-cols-2 gap-2">
        <a
          aria-label={`${provider.name} WhatsApp ile yaz`}
          className="pointer-events-auto inline-flex min-h-8 cursor-pointer items-center justify-center rounded-md bg-[var(--brand-orange)] px-3 text-[0.7rem] font-bold text-white"
          href={getProviderWhatsAppHref(provider)}
          rel="noopener noreferrer"
          target="_blank"
        >
          WhatsApp
        </a>
        <a
          aria-label={`${provider.name} telefonla ara`}
          className="pointer-events-auto inline-flex min-h-8 cursor-pointer items-center justify-center rounded-md bg-[var(--surface-soft)] px-3 text-[0.7rem] font-bold text-[var(--brand-navy)]"
          href={getProviderPhoneHref(provider)}
        >
          Telefon
        </a>
      </div>
    </article>
  );
}

function HeroMockup({ heroProviders }: { heroProviders: Provider[] }) {
  return (
    <aside className="mx-auto w-full max-w-[340px] select-none xl:mx-0 xl:max-w-[350px] xl:justify-self-end 2xl:max-w-[360px]">
      <div className="relative rounded-[1.75rem] bg-[var(--brand-navy)] p-3 shadow-[0_26px_80px_rgba(13,20,36,0.16)]">
        <div className="rounded-[1.45rem] bg-[#F7F7F8] p-4">
          <div className="flex cursor-default select-none items-center justify-between">
            <FuwuLogo size="sm" />
            <span className="rounded-md bg-white px-3 py-1 text-xs font-bold text-[var(--brand-navy)] shadow-[0_8px_18px_rgba(13,20,36,0.06)]">
              İstanbul
            </span>
          </div>

          <div className="mt-5 cursor-default select-none rounded-lg bg-white p-4 shadow-[0_14px_34px_rgba(13,20,36,0.07)] ring-1 ring-[rgba(13,20,36,0.08)]">
            <p className="text-xs font-bold uppercase text-[var(--brand-orange-dark)]">
              Bugün uygun
            </p>
            <h2 className="mt-2 text-xl font-bold leading-tight text-[var(--brand-navy)]">
              Yakındaki ustalar
            </h2>
            <p className="mt-2 text-xs font-bold leading-5 text-[var(--muted)]">
              Puan, ilçe ve fiyat aralığını tek ekranda karşılaştır.
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
                  Henüz yayında usta bulunmuyor.
                </p>
                <p className="mt-1 text-xs font-bold leading-5 text-[var(--muted)]">
                  İlk ustaları admin panelden ekleyebilir veya usta başvurularını onaylayabilirsin.
                </p>
              </div>
            )}
          </div>

          <Link
            className="mt-4 inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-md bg-[var(--brand-orange)] px-4 text-sm font-bold text-white shadow-[0_14px_30px_rgba(255,138,0,0.22)] transition-colors hover:bg-[var(--brand-orange-dark)]"
            href={appRoutes.providers}
          >
            Tüm ustaları gör
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
}: {
  districtCount: number;
  filterOptions: ProviderFilterOptions;
  heroProviders: Provider[];
  todayActiveCount: number;
}) {
  const heroStats = [
    { label: "Bugün uygun ustalar", href: appRoutes.providers },
    { label: `${todayActiveCount} bugün aktif`, href: appRoutes.providers },
    { label: `${services.length} kategori`, href: appRoutes.services },
    { label: `${districtCount} ilçe`, href: appRoutes.providers },
  ];

  return (
    <section className="relative overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFBFC_55%,#F7F7F8_100%)]">
      <Container className="grid max-w-[1360px] gap-8 py-10 sm:py-14 lg:py-16 xl:grid-cols-[minmax(0,1fr)_minmax(280px,350px)] xl:items-center xl:justify-between xl:gap-8 2xl:grid-cols-[minmax(0,1fr)_360px] 2xl:gap-12">
        <div className="min-w-0 max-w-[880px] xl:pr-2">
          <div className="inline-flex cursor-default select-none rounded-lg bg-white px-4 py-3 shadow-[0_18px_54px_rgba(13,20,36,0.07)] ring-1 ring-[rgba(13,20,36,0.08)]">
            <FuwuLogo size="md" />
          </div>

          <h1 className="mt-5 max-w-3xl cursor-default select-none text-4xl font-bold leading-[1.1] text-[var(--brand-navy)] sm:text-5xl lg:text-6xl">
            Ustaya ulaşmanın en hızlı yolu.
          </h1>
          <p className="mt-5 max-w-3xl cursor-default select-none text-base font-medium leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
            Hizmetini seç, ilçeni belirle, ustaları fiyat ve puana göre karşılaştır. Telefon veya
            WhatsApp ile direkt iletişime geç.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {heroStats.map((item) => (
              <Link
                className="cursor-pointer select-none rounded-md bg-white px-4 py-2 text-sm font-semibold text-[var(--brand-navy)] shadow-[0_10px_24px_rgba(13,20,36,0.045)] ring-1 ring-[rgba(13,20,36,0.07)] transition-colors hover:bg-[var(--brand-orange-soft)] hover:text-[var(--brand-orange-dark)]"
                href={item.href}
                key={item.label}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <HeroSearch filterOptions={filterOptions} />
        </div>

        <HeroMockup heroProviders={heroProviders} />
      </Container>
    </section>
  );
}

function ServiceCard({ service }: { service: Service }) {
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
        <span className="block text-xl font-bold leading-tight text-[var(--brand-navy)]">
          {service.title}
        </span>
        <span className="mt-2 block text-sm font-semibold leading-6 text-[var(--muted)]">
          {service.description}
        </span>
        <span className="mt-4 inline-flex rounded-md bg-[var(--surface-soft)] px-3 py-2 text-sm font-black text-[var(--brand-navy)] transition-colors group-hover:bg-[var(--brand-orange-soft)]">
          Usta Bul
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
          description="Kategori seç, uygun ustaları karşılaştır ve doğrudan iletişime geç."
          eyebrow="Hizmet kategorileri"
          title="İhtiyacın olan hizmeti seç"
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
            description="Puan, ilçe, ortalama fiyat, uygunluk ve telefon bilgisiyle hızlı karşılaştırma yap."
            eyebrow="Usta keşfi"
            title="Sana uygun ustalar"
          />
          <Link
            className="cursor-pointer text-sm font-bold text-[var(--brand-orange-dark)] transition-colors hover:text-[var(--brand-navy)]"
            href={appRoutes.providers}
          >
            Tüm profilleri incele
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
              Henüz yayında usta bulunmuyor.
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-[var(--muted)]">
              İlk ustaları admin panelden ekleyebilir veya usta başvurularını onaylayabilirsin.
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
      <Container className="py-12 sm:py-14 lg:py-16">
        <SectionHeading
          description="Üç adımda ihtiyacını netleştir, profilleri karşılaştır ve doğrudan iletişime geç."
          eyebrow="Nasıl çalışır?"
          title="Usta bulma akışı"
        />
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {howItWorksSteps.map((step, index) => (
            <Link
              aria-label={`${step.title} bölümüne git`}
              className="group cursor-pointer select-none rounded-lg bg-white p-5 shadow-[0_14px_38px_rgba(13,20,36,0.06)] ring-1 ring-[rgba(13,20,36,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_58px_rgba(13,20,36,0.1)] hover:ring-[rgba(255,138,0,0.36)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
              href={step.href}
              key={step.title}
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-sm font-bold text-[var(--brand-orange-dark)] transition-colors group-hover:bg-[var(--brand-orange)] group-hover:text-white">
                0{index + 1}
              </span>
              <h3 className="mt-5 text-xl font-bold leading-tight text-[var(--brand-navy)]">
                {step.title}
              </h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
                {step.description}
              </p>
              <span className="mt-5 inline-flex text-sm font-bold text-[var(--brand-orange-dark)] transition-colors group-hover:text-[var(--brand-navy)]">
                Bölüme git
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}

function AboutSection() {
  return (
    <section className="border-y border-[var(--border)] bg-white" id="about">
      <Container className="py-12 sm:py-14 lg:py-16">
        <div className="grid gap-5 lg:grid-cols-[0.45fr_1fr] lg:items-start">
          <div className="cursor-default select-none">
            <p className="text-sm font-bold uppercase text-[var(--brand-orange-dark)]">
              Hakkımızda
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-[var(--brand-navy)] sm:text-4xl">
              Fuwu ile doğru ustaya daha net ulaş.
            </h2>
          </div>
          <p className="max-w-3xl cursor-default select-none text-base font-semibold leading-8 text-[var(--muted)] sm:text-lg">
            Fuwu, ev hizmetlerinde doğru ustaya hızlı ve şeffaf şekilde ulaşman için geliştirilen
            bir hizmet pazaryeridir.
          </p>
        </div>
      </Container>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="bg-[#F7F7F8]" id="trust">
      <Container className="py-12 sm:py-14 lg:py-16">
        <SectionHeading
          description="Fuwu, müşteri kararını hızlandıran net profil bilgileri ve doğrudan iletişim akışı sunar."
          eyebrow="Fuwu Güvencesi"
          title="Karar vermeyi kolaylaştıran güven sinyalleri"
        />
        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {trustItems.map((item) => (
            <div
              className="cursor-default select-none rounded-lg bg-white p-5 shadow-[0_14px_38px_rgba(13,20,36,0.05)] ring-1 ring-[rgba(13,20,36,0.08)]"
              key={item.title}
            >
              <div className="mb-5 h-1.5 w-12 rounded-full bg-[var(--brand-orange)]" />
              <h3 className="text-xl font-bold leading-tight text-[var(--brand-navy)]">
                {item.title}
              </h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="border-t border-[var(--border)] bg-white">
      <Container className="py-12 sm:py-14 lg:py-16">
        <div className="cursor-default select-none">
          <p className="text-sm font-bold uppercase text-[var(--brand-orange-dark)]">
            Fuwu Hizmet
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-bold leading-tight text-[var(--brand-navy)] sm:text-4xl">
            Müşteri ve usta akışları sade, ayrı ve net.
          </h2>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-[#F7F7F8] p-6 shadow-[0_18px_48px_rgba(13,20,36,0.06)] ring-1 ring-[rgba(13,20,36,0.08)]">
            <div className="cursor-default select-none">
              <p className="text-sm font-black uppercase text-[var(--brand-orange-dark)]">
                Müşteri
              </p>
              <h3 className="mt-3 text-2xl font-bold leading-tight text-[var(--brand-navy)]">
                Yakındaki ustaları karşılaştır.
              </h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
                Kategori, ilçe, puan ve fiyat aralığına göre uygun profilleri gör.
              </p>
            </div>
            <Button className="mt-5 w-full sm:w-fit" href={appRoutes.providers}>
              Usta Bul
            </Button>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-[0_18px_48px_rgba(13,20,36,0.06)] ring-1 ring-[rgba(13,20,36,0.08)]">
            <div className="cursor-default select-none">
              <p className="text-sm font-black uppercase text-[var(--brand-orange-dark)]">
                Usta
              </p>
              <h3 className="mt-3 text-2xl font-bold leading-tight text-[var(--brand-navy)]">
                Profilini hazırlayıp ağa katıl.
              </h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted)]">
                Hizmet alanını, çalışma bölgeni ve doğrudan iletişim bilgilerini gönder.
              </p>
            </div>
            <Button
              className="mt-5 w-full sm:w-fit"
              href={appRoutes.providerApplication}
              variant="secondary"
            >
              Usta Ağına Katıl
            </Button>
          </div>
        </div>
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
    (provider) => provider.availability === "Bugün uygun",
  );
  const heroProviders = todayProviders.length > 0 ? todayProviders.slice(0, 2) : allProviders.slice(0, 2);
  const todayActiveCount = todayProviders.length;

  return (
    <div className="bg-[var(--background)]">
      <HeroSection
        districtCount={filterOptions.districts.length}
        filterOptions={filterOptions}
        heroProviders={heroProviders}
        todayActiveCount={todayActiveCount}
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
