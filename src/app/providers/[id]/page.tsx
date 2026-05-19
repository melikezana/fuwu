<<<<<<< HEAD
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Home, MessageCircle, Phone, UserSearch } from "lucide-react";
import { FuwuLogo, FuwuWatermark } from "@/components/brand/FuwuLogo";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import {
  ProviderContactLink,
  ProviderProfileViewTracker,
} from "@/components/providers/ProviderAnalytics";
import { ProviderAvatar } from "@/components/providers/ProviderAvatar";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { ProviderReviews } from "@/components/providers/ProviderReviews";
import { appRoutes } from "@/lib/constants/navigation";
import {
  getProviderAvailabilityLabel,
  getProviderAvailabilityTone,
  getProviderDataNotice,
  getProviderProfileBadge,
  isLiveProvider,
} from "@/lib/constants/providers";
import { createPageMetadata, getProviderProfessionLabel } from "@/lib/seo";
import { getProviderById, getProvidersByCategory } from "@/services/providers";
import { getProviderReviews } from "@/services/reviews";

export const dynamic = "force-dynamic";

type ProviderProfilePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: ProviderProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  const provider = await getProviderById(id);

  if (!provider) {
    return createPageMetadata({
      title: "Usta Bulunamadı | Fuwu",
      description:
        "Aradığınız Fuwu Hizmet profiline ulaşılamadı; İstanbul’daki uygun ustaları kategori, ilçe ve puana göre karşılaştırın.",
      path: `/providers/${id}`,
      noIndex: true,
    });
  }

  const professionLabel = getProviderProfessionLabel(provider.category);

  return createPageMetadata({
    title: `${provider.district} ${professionLabel} | ${provider.name} | Fuwu`,
    description: `${provider.district} bölgesinde hizmet veren ${provider.name} için ${provider.averagePrice} fiyat aralığını, ${provider.rating.toFixed(1)} puanını ve telefon/WhatsApp iletişim bilgilerini inceleyin.`,
    path: `/providers/${provider.id}`,
    keywords: [
      provider.name,
      provider.category,
      provider.district,
      `${provider.district} ${professionLabel}`,
      `${provider.category} Fuwu`,
      "Fuwu Hizmet",
    ],
  });
}

function ProviderNotFoundState() {
  return (
    <div className="bg-[var(--background)] pb-24 lg:pb-0">
      <section className="relative overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(180deg,#FFFFFF_0%,#FAFAFB_100%)]">
        <FuwuWatermark className="-right-14 -top-14 text-[8rem] opacity-[0.035] sm:text-[10rem]" />
        <Container className="relative py-6 sm:py-8">
          <nav className="flex flex-wrap items-center gap-2 text-sm font-black text-[var(--muted)]">
            <Link className="cursor-pointer transition-colors hover:text-[var(--brand-navy)]" href={appRoutes.home}>
              Ana sayfa
            </Link>
            <span className="cursor-default select-none">/</span>
            <Link className="cursor-pointer transition-colors hover:text-[var(--brand-navy)]" href={appRoutes.providers}>
              Usta Bul
            </Link>
            <span className="cursor-default select-none">/</span>
            <span className="cursor-default select-none text-[var(--brand-navy)]">
              Usta bulunamadı
            </span>
          </nav>
        </Container>
      </section>

      <Container className="py-12 sm:py-16 lg:py-20">
        <section className="relative mx-auto max-w-2xl cursor-default select-none overflow-hidden rounded-lg bg-white p-6 text-center shadow-[0_24px_74px_rgba(13,20,36,0.1)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-8">
          <FuwuWatermark className="-right-16 -top-10 text-[7rem] opacity-[0.03] sm:text-[9rem]" />
          <Link
            aria-label="Fuwu ana sayfasına git"
            className="relative mx-auto mb-6 inline-flex cursor-pointer rounded-lg bg-white px-4 py-3 shadow-[0_14px_34px_rgba(13,20,36,0.06)] ring-1 ring-[rgba(13,20,36,0.08)] transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            href={appRoutes.home}
          >
            <FuwuLogo size="sm" />
          </Link>
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-[linear-gradient(145deg,#111B2E_0%,#22304A_100%)] text-white shadow-[0_16px_36px_rgba(13,20,36,0.18)]">
            <UserSearch aria-hidden="true" className="size-7" />
          </div>
          <h1 className="relative mt-5 text-3xl font-black leading-tight text-[var(--brand-navy)] sm:text-4xl">
            Usta bulunamadı
          </h1>
          <p className="relative mt-3 text-base font-semibold leading-7 text-[var(--muted)]">
            Aradığınız profile ulaşılamadı.
          </p>
          <div className="relative mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button className="w-full sm:w-fit" href={appRoutes.providers}>
              <UserSearch aria-hidden="true" className="mr-2 size-4 shrink-0" />
              Tüm Ustaları Gör
            </Button>
            <Button className="w-full sm:w-fit" href={appRoutes.home} variant="secondary">
              <Home aria-hidden="true" className="mr-2 size-4 shrink-0" />
              Ana Sayfaya Dön
            </Button>
          </div>
        </section>
      </Container>
    </div>
  );
}

export default async function ProviderProfilePage({ params }: ProviderProfilePageProps) {
  const { id } = await params;
  const provider = await getProviderById(id);

  if (!provider) {
    return <ProviderNotFoundState />;
  }

  const [providers, reviewData] = await Promise.all([
    getProvidersByCategory(provider.category),
    getProviderReviews(provider.id),
  ]);
  const relatedProviders = providers
    .filter(
      (relatedProvider) =>
        relatedProvider.id !== provider.id && relatedProvider.category === provider.category,
    )
    .slice(0, 2);
  const availabilityLabel = getProviderAvailabilityLabel(provider.availability);
  const availabilityTone = getProviderAvailabilityTone(provider.availability);
  const availabilityBadgeClassName =
    availabilityTone === "green"
      ? "bg-[var(--trust-green-soft)] text-[var(--trust-green)]"
      : availabilityTone === "orange"
        ? "bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]"
        : "bg-[var(--surface-soft)] text-[var(--muted)]";

  return (
    <div className="bg-[var(--background)]">
      <ProviderProfileViewTracker provider={provider} />
      <section className="relative overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(180deg,#FFFFFF_0%,#FAFAFB_100%)]">
        <FuwuWatermark className="-right-14 -top-14 text-[8rem] opacity-[0.035] sm:text-[10rem]" />
        <Container className="relative py-6 sm:py-8">
          <nav className="flex flex-wrap items-center gap-2 text-sm font-black text-[var(--muted)]">
            <Link className="cursor-pointer transition-colors hover:text-[var(--brand-navy)]" href={appRoutes.home}>
              Ana sayfa
            </Link>
            <span className="cursor-default select-none">/</span>
            <Link className="cursor-pointer transition-colors hover:text-[var(--brand-navy)]" href={appRoutes.providers}>
              Usta Bul
            </Link>
            <span className="cursor-default select-none">/</span>
            <span className="cursor-default select-none text-[var(--brand-navy)]">
              {provider.name}
            </span>
          </nav>
        </Container>
      </section>

      <Container className="grid gap-6 py-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,370px)] lg:items-start lg:py-12">
        <div className="min-w-0 space-y-6">
          <section className="relative cursor-default select-none overflow-hidden rounded-lg bg-white p-5 shadow-[0_24px_74px_rgba(13,20,36,0.1)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-7">
            <FuwuWatermark className="-right-16 -top-10 text-[7rem] opacity-[0.03] sm:text-[9rem]" />
            <Link
              aria-label="Fuwu ana sayfasına git"
              className="relative mb-6 inline-flex cursor-pointer rounded-lg bg-white px-4 py-3 shadow-[0_14px_34px_rgba(13,20,36,0.06)] ring-1 ring-[rgba(13,20,36,0.08)] transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
              href={appRoutes.home}
            >
              <FuwuLogo size="sm" />
            </Link>

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
              <ProviderAvatar
                className="bg-[linear-gradient(145deg,#ffffff_0%,#fff2df_100%)] shadow-[0_16px_36px_rgba(13,20,36,0.12)]"
                provider={provider}
                variant="profile"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    className="cursor-pointer rounded-md bg-[var(--surface-soft)] px-3 py-1 text-xs font-black uppercase text-[var(--brand-navy)] transition-colors hover:bg-[#E5E7EB]"
                    href={`${appRoutes.providers}?category=${encodeURIComponent(provider.category)}`}
                  >
                    {provider.category}
                  </Link>
                  <Link
                    className="cursor-pointer rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-xs font-black text-[var(--brand-navy)] transition-colors hover:border-[var(--brand-orange)]"
                    href={`${appRoutes.providers}?district=${encodeURIComponent(provider.district)}`}
                  >
                    {provider.district}
                  </Link>
                  <span className="max-w-full rounded-md bg-[var(--surface-soft)] px-3 py-1 text-xs font-black leading-5 text-[var(--muted)]">
                    {getProviderProfileBadge(provider)}
                  </span>
                  <span className={`max-w-full rounded-md px-3 py-1 text-xs font-black leading-5 ${availabilityBadgeClassName}`}>
                    {availabilityLabel}
                  </span>
                </div>
                <h1 className="mt-4 text-3xl font-black leading-tight text-[var(--brand-navy)] sm:text-5xl">
                  {provider.name}
                </h1>
                <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-[var(--muted)]">
                  {provider.shortDescription}
                </p>
                <p className="mt-4 max-w-2xl rounded-md bg-[var(--surface-soft)] px-4 py-3 text-sm font-bold leading-6 text-[var(--muted)]">
                  {getProviderDataNotice(provider)}
                </p>
                <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:hidden">
                  <ProviderContactLink
                    aria-label={`${provider.name} ile WhatsApp üzerinden yazış`}
                    className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md bg-[var(--brand-orange)] px-4 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(255,138,0,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--brand-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
                    kind="whatsapp"
                    provider={provider}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <MessageCircle aria-hidden="true" className="size-4 shrink-0" />
                    WhatsApp ile Yaz
                  </ProviderContactLink>
                  <ProviderContactLink
                    aria-label={`${provider.name} adlı ustayı telefonla ara`}
                    className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-black text-[var(--brand-navy)] shadow-[inset_0_0_0_1px_rgba(13,20,36,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--surface-soft)] hover:shadow-[inset_0_0_0_1px_rgba(13,20,36,0.18)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
                    kind="phone"
                    provider={provider}
                  >
                    <Phone aria-hidden="true" className="size-4 shrink-0" />
                    Hemen Ara
                  </ProviderContactLink>
                </div>
              </div>
            </div>

            <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                ["Puan", `${provider.rating.toFixed(1)} (${provider.reviewCount})`],
                ["Deneyim", provider.experience],
                ["Ortalama fiyat aralığı", provider.averagePrice],
                ["Uygunluk", availabilityLabel],
                ["Hızlı dönüş", provider.responseTime],
              ].map(([label, value]) => (
                <div className="rounded-md bg-[var(--surface-soft)] p-4" key={label}>
                  <p className="text-xs font-black uppercase leading-4 text-[var(--muted)]">
                    {label}
                  </p>
                  <p className="mt-2 text-sm font-black leading-6 text-[var(--brand-navy)]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="cursor-default select-none rounded-lg bg-white p-5 shadow-[0_18px_56px_rgba(13,20,36,0.07)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-6">
            <p className="text-xs font-black uppercase text-[var(--brand-orange-dark)]">
              Profil özeti
            </p>
            <h2 className="mt-2 text-2xl font-black text-[var(--brand-navy)]">
              Hizmet yaklaşımı
            </h2>
            <p className="mt-4 text-base font-semibold leading-8 text-[var(--muted)]">
              {provider.description}
            </p>
          </section>

          <ProviderReviews
            reviews={reviewData.reviews}
            source={reviewData.source}
            summary={reviewData.summary}
          />

          <section className="cursor-default select-none rounded-lg bg-white p-5 shadow-[0_18px_56px_rgba(13,20,36,0.07)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-6">
            <p className="text-xs font-black uppercase text-[var(--brand-orange-dark)]">
              Sunduğu hizmetler
            </p>
            <h2 className="mt-2 text-2xl font-black text-[var(--brand-navy)]">
              En sık aldığı işler
            </h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {provider.servicesOffered.map((service) => (
                <div
                  className="rounded-md bg-[var(--surface-soft)] px-3 py-3 text-sm font-black text-[var(--brand-navy)]"
                  key={service}
                >
                  {service}
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="cursor-default select-none rounded-lg bg-white p-5 shadow-[0_18px_56px_rgba(13,20,36,0.07)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-6">
              <p className="text-xs font-black uppercase text-[var(--brand-orange-dark)]">
                Hizmet bölgeleri
              </p>
              <h2 className="mt-2 text-2xl font-black text-[var(--brand-navy)]">
                Çalıştığı bölgeler
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {provider.serviceAreas.map((area) => (
                  <Link
                    className="cursor-pointer rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-bold text-[var(--brand-navy)] transition-colors hover:border-[var(--brand-orange)] hover:bg-[var(--brand-orange-soft)]"
                    href={`${appRoutes.providers}?district=${encodeURIComponent(area)}`}
                    key={area}
                  >
                    {area}
                  </Link>
                ))}
              </div>
            </div>

            <div className="cursor-default select-none rounded-lg bg-white p-5 shadow-[0_18px_56px_rgba(13,20,36,0.07)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-6">
              <p className="text-xs font-black uppercase text-[var(--brand-orange-dark)]">
                {isLiveProvider(provider) ? "Güven sinyalleri" : "Örnek güven sinyalleri"}
              </p>
              <h2 className="mt-2 text-2xl font-black text-[var(--brand-navy)]">
                {isLiveProvider(provider) ? "Profil bilgileri" : "Canlı doğrulama değildir"}
              </h2>
              <div className="mt-4 grid gap-2">
                {provider.trustBadges.map((badge) => (
                  <div
                    className="rounded-md border border-[rgba(23,116,95,0.18)] bg-[var(--trust-green-soft)] px-3 py-3 text-sm font-black text-[var(--brand-navy)]"
                    key={badge}
                  >
                    {badge}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-6 lg:sticky lg:top-24">
          <section className="cursor-default select-none overflow-hidden rounded-lg bg-white shadow-[0_24px_70px_rgba(13,20,36,0.1)] ring-1 ring-[rgba(13,20,36,0.1)]">
            <div className="h-1.5 bg-[var(--brand-orange)]" />
            <div className="p-5">
              <Link
                aria-label="Fuwu ana sayfasına git"
                className="inline-flex cursor-pointer rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
                href={appRoutes.home}
              >
                <FuwuLogo />
              </Link>
              <p className="mt-5 text-xs font-black uppercase text-[var(--brand-orange-dark)]">
                Doğrudan iletişim
              </p>
              <p className="mt-2 text-2xl font-black leading-tight text-[var(--brand-navy)]">
                {provider.phone}
              </p>
              <p className="mt-3 rounded-md bg-[var(--surface-soft)] px-3 py-2 text-xs font-bold leading-5 text-[var(--muted)]">
                {isLiveProvider(provider)
                  ? "Sağlayıcı iletişim bilgisi canlı kayıttan alınır; detayları doğrudan netleştirin."
                  : "Örnek iletişim alanı; canlı sağlayıcı doğrulaması henüz aktif değildir."}
              </p>
              <p className="mt-2 inline-flex max-w-full rounded-md bg-[var(--surface-soft)] px-3 py-1.5 text-sm font-black leading-6 text-[var(--brand-navy)]">
                {provider.responseTime}
              </p>

              <div className="mt-5 grid gap-3">
                <ProviderContactLink
                  className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md bg-[var(--brand-orange)] px-4 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(255,138,0,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--brand-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
                  kind="whatsapp"
                  provider={provider}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <MessageCircle aria-hidden="true" className="size-4 shrink-0" />
                  WhatsApp ile Yaz
                </ProviderContactLink>
                <ProviderContactLink
                  className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-black text-[var(--brand-navy)] shadow-[inset_0_0_0_1px_rgba(13,20,36,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--surface-soft)] hover:shadow-[inset_0_0_0_1px_rgba(13,20,36,0.18)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
                  kind="phone"
                  provider={provider}
                >
                  <Phone aria-hidden="true" className="size-4 shrink-0" />
                  Hemen Ara
                </ProviderContactLink>
                <Button href={appRoutes.providers} variant="secondary">
                  <ArrowLeft aria-hidden="true" className="mr-2 size-4 shrink-0" />
                  Ustalara Geri Dön
                </Button>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-md bg-[var(--surface-soft)] p-4">
                  <p className="text-xs font-black uppercase text-[var(--muted)]">
                    Ortalama fiyat aralığı
                  </p>
                  <p className="mt-2 text-sm font-black text-[var(--brand-navy)]">
                    {provider.averagePrice}
                  </p>
                </div>
                <div className="rounded-md bg-[var(--surface-soft)] p-4">
                  <p className="text-xs font-black uppercase text-[var(--muted)]">
                    Çalışma saatleri
                  </p>
                  <p className="mt-2 text-sm font-bold leading-6 text-[var(--brand-navy)]">
                    {provider.workingHours}
                  </p>
                </div>
                <div className="rounded-md bg-[var(--surface-soft)] p-4">
                  <p className="text-xs font-black uppercase text-[var(--muted)]">
                    Hizmet alanı
                  </p>
                  <p className="mt-2 text-sm font-bold leading-6 text-[var(--brand-navy)]">
                    {provider.serviceAreas.join(", ")}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="cursor-default select-none rounded-lg bg-[var(--brand-navy)] p-5 text-white shadow-[0_18px_56px_rgba(13,20,36,0.12)]">
            <p className="text-xs font-black uppercase text-[var(--brand-orange)]">
              Profil özeti
            </p>
            <p className="mt-2 text-lg font-black leading-7">
              {provider.completedJobs}+ tamamlanan iş, {provider.averagePrice} ortalama fiyat
              aralığı ve {availabilityLabel.toLocaleLowerCase("tr")} bilgisiyle doğrudan
              iletişime hazır.
            </p>
            <Link
              className="mt-4 inline-flex cursor-pointer text-sm font-black text-[var(--brand-orange)] transition-colors hover:text-white"
              href={`${appRoutes.providers}?category=${encodeURIComponent(provider.category)}`}
            >
              Benzer ustaları incele
            </Link>
          </section>
        </aside>
      </Container>

      {relatedProviders.length > 0 ? (
        <section className="border-t border-[var(--border)] bg-white">
          <Container className="py-8 sm:py-10 lg:py-12">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="cursor-default select-none">
                <p className="text-sm font-black uppercase text-[var(--brand-orange-dark)]">
                  Benzer profiller
                </p>
                <h2 className="mt-1 text-2xl font-black leading-tight text-[var(--brand-navy)]">
                  Aynı kategorideki diğer ustalar
                </h2>
              </div>
              <Button
                href={`${appRoutes.providers}?category=${encodeURIComponent(provider.category)}`}
                variant="secondary"
              >
                Tümünü İncele
              </Button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {relatedProviders.map((relatedProvider) => (
                <ProviderCard key={relatedProvider.id} provider={relatedProvider} />
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(13,20,36,0.08)] bg-white/95 px-4 py-3 shadow-[0_-16px_44px_rgba(13,20,36,0.14)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-[minmax(0,1fr)_auto] gap-2">
          <ProviderContactLink
            aria-label={`${provider.name} ile WhatsApp üzerinden yazış`}
            className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md bg-[var(--brand-orange)] px-4 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(255,138,0,0.24)] transition-colors hover:bg-[var(--brand-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            kind="whatsapp"
            provider={provider}
            rel="noopener noreferrer"
            target="_blank"
          >
            <MessageCircle aria-hidden="true" className="size-4 shrink-0" />
            WhatsApp ile Yaz
          </ProviderContactLink>
          <ProviderContactLink
            aria-label={`${provider.name} adlı ustayı telefonla ara`}
            className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-md bg-white px-4 py-3 text-[var(--brand-navy)] shadow-[inset_0_0_0_1px_rgba(13,20,36,0.14)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            kind="phone"
            provider={provider}
          >
            <Phone aria-hidden="true" className="size-4 shrink-0" />
            <span className="sr-only">Telefon</span>
          </ProviderContactLink>
        </div>
      </div>
    </div>
=======
"use client";

import { use, useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { Alert } from "@/components/ui/Alerts";
import { supabase } from "@/lib/supabase/client";
import { Provider } from "@/services/providers";
import { Star, MapPin, Wrench, Phone, MessageCircle, ChevronLeft } from "lucide-react";
import { whatsappHelper } from "@/lib/whatsapp";
import { analyticsService } from "@/services/analytics";
import Link from "next/link";

export default function ProviderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProvider();
  }, [resolvedParams.id]);

  const fetchProvider = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("providers")
        .select("*")
        .eq("id", resolvedParams.id)
        .eq("status", "approved")
        .single();

      if (error) throw error;
      setProvider(data);
      analyticsService.trackProviderView(resolvedParams.id);
    } catch (err: any) {
      setError("Usta profili bulunamadı veya artık aktif değil.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F5F6F8] flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-3xl mx-auto w-full p-6 lg:p-12">
          <div className="animate-pulse bg-white rounded-3xl p-8 shadow-sm h-64"></div>
        </div>
      </main>
    );
  }

  if (error || !provider) {
    return (
      <main className="min-h-screen bg-[#F5F6F8] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <Alert type="error" message={error || "Kayıt bulunamadı"} className="mb-4" />
            <Link href="/providers" className="text-[#FF8A00] font-medium hover:underline">
              Ustalar listesine dön
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const handleWhatsApp = () => {
    analyticsService.trackWhatsAppClick(provider.id);
    const url = whatsappHelper.generateLeadUrl(provider.whatsapp, provider.category, provider.district);
    window.open(url, "_blank");
  };

  const handlePhone = () => {
    analyticsService.trackPhoneClick(provider.id);
    window.open(`tel:${provider.phone}`);
  };

  const statusColors = {
    müsait: "bg-green-100 text-green-700",
    yoğun: "bg-orange-100 text-orange-700",
    çevrimdışı: "bg-gray-100 text-gray-600",
  };

  return (
    <main className="min-h-screen bg-[#F5F6F8] flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-3xl mx-auto w-full p-6 lg:py-12">
        <Link href="/providers" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 font-medium transition-colors w-max">
          <ChevronLeft size={20} />
          <span>Geri Dön</span>
        </Link>
        
        <div className="bg-white rounded-3xl p-6 lg:p-10 shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-6 mb-8 pb-8 border-b border-gray-100">
            <div className="flex gap-4 items-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-3xl font-bold">
                {provider.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#0D1424] mb-2">{provider.name}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 font-medium">
                  <span className="flex items-center gap-1"><Wrench size={16} /> {provider.category}</span>
                  <span className="flex items-center gap-1"><MapPin size={16} /> {provider.district}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${statusColors[provider.availability]}`}>
                {provider.availability.charAt(0).toUpperCase() + provider.availability.slice(1)}
              </span>
              <div className="flex items-center gap-1.5 text-[#FF8A00] font-bold text-lg">
                <Star size={20} className="fill-[#FF8A00]" />
                <span>{provider.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-bold mb-4">Hizmet Bilgileri</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <span className="block text-sm text-gray-500 mb-1">Fiyat Aralığı</span>
                <span className="font-bold">{provider.price_range || "Belirtilmemiş"}</span>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <span className="block text-sm text-gray-500 mb-1">Katılım Tarihi</span>
                <span className="font-bold">{new Date(provider.created_at).toLocaleDateString("tr-TR")}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-gray-100">
            <button 
              onClick={handleWhatsApp}
              className="w-full flex items-center justify-center gap-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 py-4 rounded-2xl font-bold transition-colors text-lg"
            >
              <MessageCircle size={22} />
              <span>WhatsApp</span>
            </button>
            
            <button 
              onClick={handlePhone}
              className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 py-4 rounded-2xl font-bold transition-colors text-lg"
            >
              <Phone size={22} />
              <span>Telefon</span>
            </button>
          </div>
        </div>
      </div>
    </main>
>>>>>>> 41e55ab (Full marketplace backend auth and production update)
  );
}
