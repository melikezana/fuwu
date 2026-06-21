import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  Home,
  MapPinned,
  MessageCircle,
  Phone,
  Star,
  Timer,
  UserSearch,
  WalletCards,
} from "lucide-react";
import { FuwuLogo, FuwuWatermark } from "@/components/brand/FuwuLogo";
import {
  ProviderContactLink,
  ProviderProfileViewTracker,
} from "@/components/providers/ProviderAnalytics";
import { ProviderAvatar } from "@/components/providers/ProviderAvatar";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { ProviderReviews } from "@/components/providers/ProviderReviews";
import { ProviderTrustBadges } from "@/components/providers/ProviderTrustBadges";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { TextLink } from "@/components/ui/TextLink";
import { appRoutes } from "@/lib/constants/navigation";
import { getProviderDataNotice, isLiveProvider } from "@/lib/constants/providers";
import { createPageMetadata, getProviderProfessionLabel } from "@/lib/seo";
import { cn } from "@/lib/utils";
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
        <Container className="relative py-8">
          <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-[var(--muted)]">
            <TextLink className="text-[var(--muted)] no-underline" href={appRoutes.home}>
              Ana sayfa
            </TextLink>
            <span>/</span>
            <TextLink className="text-[var(--muted)] no-underline" href={appRoutes.providers}>
              Usta Bul
            </TextLink>
            <span>/</span>
            <span className="text-[var(--brand-navy)]">Usta bulunamadı</span>
          </nav>
        </Container>
      </section>

      <Container className="py-12 sm:py-16 lg:py-20">
        <section className="relative mx-auto max-w-2xl overflow-hidden rounded-lg bg-white p-6 text-center shadow-[var(--shadow-elevated)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-8">
          <FuwuWatermark className="-right-16 -top-10 text-[7rem] opacity-[0.03] sm:text-[9rem]" />
          <Link
            aria-label="Fuwu ana sayfasına git"
            className="relative mx-auto mb-6 inline-flex rounded-lg bg-white px-4 py-3 shadow-[var(--shadow-subtle)] ring-1 ring-[rgba(13,20,36,0.08)] transition-colors hover:bg-[var(--brand-orange-soft)]"
            href={appRoutes.home}
          >
            <FuwuLogo size="sm" />
          </Link>
          <div className="relative mx-auto flex size-16 items-center justify-center rounded-lg bg-[var(--brand-navy)] text-white shadow-[var(--shadow-card)]">
            <UserSearch aria-hidden="true" className="size-7" />
          </div>
          <h1 className="relative mt-5 text-3xl font-bold leading-tight text-[var(--brand-navy)] sm:text-4xl">
            Usta bulunamadı
          </h1>
          <p className="relative mt-3 text-base font-normal leading-7 text-[var(--muted)]">
            Aradığınız profile ulaşılamadı.
          </p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
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
  const hasWhatsApp = Boolean(provider.whatsapp?.trim());
  const hasPhone = Boolean(provider.phone?.trim());
  const hasContact = hasWhatsApp || hasPhone;
  const availabilityLabel = provider.availabilityStatus.label;
  const availabilityTone = provider.availabilityStatus.tone;
  const availabilityBadgeClassName =
    availabilityTone === "green"
      ? "bg-[var(--trust-green-soft)] text-[var(--trust-green)]"
      : availabilityTone === "orange"
        ? "bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]"
        : "bg-[var(--surface-soft)] text-[var(--muted)]";
  const heroStats = [
    {
      icon: Star,
      label: `${provider.reviewCount} değerlendirme`,
      value: provider.rating.toFixed(1),
    },
    {
      icon: BriefcaseBusiness,
      label: "Tamamlanan iş",
      value: String(provider.completedJobs),
    },
    {
      icon: Timer,
      label: "Yanıt süresi",
      value: provider.responseTime.replace(/^Ortalama cevap:\s*/i, ""),
    },
  ];

  return (
    <div className="bg-[var(--background)]">
      <ProviderProfileViewTracker provider={provider} />
      <section className="relative overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(180deg,#FFFFFF_0%,#FAFAFB_100%)]">
        <FuwuWatermark className="-right-14 -top-14 text-[8rem] opacity-[0.035] sm:text-[10rem]" />
        <Container className="relative py-8">
          <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-[var(--muted)]">
            <TextLink className="text-[var(--muted)] no-underline" href={appRoutes.home}>
              Ana sayfa
            </TextLink>
            <span>/</span>
            <TextLink className="text-[var(--muted)] no-underline" href={appRoutes.providers}>
              Usta Bul
            </TextLink>
            <span>/</span>
            <span className="text-[var(--brand-navy)]">{provider.name}</span>
          </nav>
        </Container>
      </section>

      <Container className="grid gap-8 py-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,370px)] lg:items-start lg:py-16">
        <div className="min-w-0 space-y-8">
          <section className="relative overflow-hidden rounded-lg bg-white p-6 shadow-[var(--shadow-elevated)] ring-1 ring-[rgba(13,20,36,0.08)] sm:p-8">
            <FuwuWatermark className="-right-16 -top-10 text-[7rem] opacity-[0.03] sm:text-[9rem]" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start">
              <ProviderAvatar
                className="shadow-[var(--shadow-card)]"
                provider={provider}
                variant="profile"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <ProviderTrustBadges
                    badges={provider.trustBadges}
                    featured
                    limit={1}
                  />
                  <span
                    className={`inline-flex min-h-8 items-center rounded-md px-3 py-1.5 text-xs font-medium ${availabilityBadgeClassName}`}
                  >
                    {availabilityLabel}
                  </span>
                </div>
                <h1 className="mt-4 text-3xl font-bold leading-tight text-[var(--brand-navy)] sm:text-5xl">
                  {provider.name}
                </h1>
                <div className="mt-3 flex flex-wrap gap-2">
                  <TextLink
                    className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--brand-navy)] no-underline hover:border-[rgba(255,138,0,0.36)] hover:bg-[var(--brand-orange-soft)]"
                    href={`${appRoutes.providers}?category=${encodeURIComponent(provider.category)}`}
                  >
                    {provider.category}
                  </TextLink>
                  <TextLink
                    className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--brand-navy)] no-underline hover:border-[rgba(255,138,0,0.36)] hover:bg-[var(--brand-orange-soft)]"
                    href={`${appRoutes.providers}?district=${encodeURIComponent(provider.district)}`}
                  >
                    {provider.district}
                  </TextLink>
                </div>
                <p className="mt-4 max-w-2xl text-base font-normal leading-7 text-[var(--muted)]">
                  {provider.shortDescription}
                </p>
              </div>
            </div>

            <div className="relative mt-8 grid divide-y divide-[var(--border)] border-y border-[var(--border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {heroStats.map((stat) => {
                const Icon = stat.icon;

                return (
                  <div className="flex items-center gap-3 px-2 py-4 sm:px-5" key={stat.label}>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xl font-semibold leading-none text-[var(--brand-navy)]">
                        {stat.value}
                      </span>
                      <span className="mt-1 block text-xs font-medium text-[var(--muted)]">
                        {stat.label}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="relative mt-6 rounded-md bg-[var(--surface-soft)] px-4 py-3 text-sm font-medium leading-6 text-[var(--muted)]">
              {getProviderDataNotice(provider)}
            </p>

            <div className="relative mt-6 lg:hidden">
              {hasContact ? (
                <div className={cn("grid gap-3", hasWhatsApp && hasPhone && "sm:grid-cols-2")}>
                  {hasWhatsApp ? (
                    <ProviderContactLink
                      className="min-h-12 w-full gap-2"
                      kind="whatsapp"
                      provider={provider}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <MessageCircle aria-hidden="true" className="size-4 shrink-0" />
                      WhatsApp ile Yaz
                    </ProviderContactLink>
                  ) : null}
                  {hasPhone ? (
                    <ProviderContactLink
                      className="min-h-12 w-full gap-2"
                      kind="phone"
                      provider={provider}
                    >
                      <Phone aria-hidden="true" className="size-4 shrink-0" />
                      Hemen Ara
                    </ProviderContactLink>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm font-medium text-[var(--muted)]">
                  İletişim bilgisi yakında eklenecek.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-[rgba(13,20,36,0.08)]">
            <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">
              Profil özeti
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--brand-navy)]">
              Hizmet yaklaşımı
            </h2>
            <p className="mt-4 text-base font-normal leading-8 text-[var(--muted)]">
              {provider.description}
            </p>
          </section>

          <ProviderReviews
            reviews={reviewData.reviews}
            source={reviewData.source}
            summary={reviewData.summary}
          />

          <section className="rounded-lg bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-[rgba(13,20,36,0.08)]">
            <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">
              Sunduğu hizmetler
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--brand-navy)]">
              En sık aldığı işler
            </h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {provider.servicesOffered.map((service) => (
                <div
                  className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-3 text-sm font-medium text-[var(--brand-navy)]"
                  key={service}
                >
                  {service}
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-8 md:grid-cols-2">
            <div className="rounded-lg bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-[rgba(13,20,36,0.08)]">
              <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">
                Hizmet bölgeleri
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--brand-navy)]">
                Çalıştığı bölgeler
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {provider.serviceAreas.map((area) => (
                  <TextLink
                    className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-medium text-[var(--brand-navy)] no-underline hover:border-[var(--brand-orange)] hover:bg-[var(--brand-orange-soft)]"
                    href={`${appRoutes.providers}?district=${encodeURIComponent(area)}`}
                    key={area}
                  >
                    {area}
                  </TextLink>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-[rgba(13,20,36,0.08)]">
              <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">
                {isLiveProvider(provider) ? "Güven sinyalleri" : "Örnek güven sinyalleri"}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--brand-navy)]">
                {isLiveProvider(provider) ? "Profil bilgileri" : "Canlı doğrulama değildir"}
              </h2>
              <ProviderTrustBadges
                badges={provider.trustBadges.slice(1)}
                className="mt-4"
              />
              {provider.trustBadges.length <= 1 ? (
                <p className="mt-4 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-3 text-sm font-medium text-[var(--muted)]">
                  Ek doğrulama bilgileri admin onayıyla yayınlanır.
                </p>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-24">
          <section className="overflow-hidden rounded-lg bg-white shadow-[var(--shadow-elevated)] ring-1 ring-[rgba(13,20,36,0.1)]">
            <div className="h-1.5 bg-[var(--brand-orange)]" />
            <div className="p-6">
              <Link
                aria-label="Fuwu ana sayfasına git"
                className="inline-flex rounded-md"
                href={appRoutes.home}
              >
                <FuwuLogo />
              </Link>
              <p className="mt-6 text-xs font-medium uppercase text-[var(--brand-orange-dark)]">
                Doğrudan iletişim
              </p>
              <h2 className="mt-2 text-2xl font-bold leading-tight text-[var(--brand-navy)]">
                Ustayla hızlıca görüş
              </h2>
              <p className="mt-3 text-sm font-normal leading-6 text-[var(--muted)]">
                {isLiveProvider(provider)
                  ? "İşin kapsamını, uygun zamanı ve net fiyatı doğrudan ustayla konuş."
                  : "Bu örnek profilde iletişim akışı gösterim amaçlıdır."}
              </p>

              {hasContact ? (
                <div className="mt-6 grid gap-3">
                  {hasWhatsApp ? (
                    <ProviderContactLink
                      className="min-h-12 w-full gap-2"
                      kind="whatsapp"
                      provider={provider}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <MessageCircle aria-hidden="true" className="size-4 shrink-0" />
                      WhatsApp ile Yaz
                    </ProviderContactLink>
                  ) : null}
                  {hasPhone ? (
                    <ProviderContactLink
                      className="min-h-12 w-full gap-2"
                      kind="phone"
                      provider={provider}
                    >
                      <Phone aria-hidden="true" className="size-4 shrink-0" />
                      Hemen Ara
                    </ProviderContactLink>
                  ) : null}
                </div>
              ) : (
                <p className="mt-6 rounded-md bg-[var(--surface-soft)] px-4 py-3 text-sm font-medium leading-6 text-[var(--muted)]">
                  İletişim bilgisi yakında eklenecek.
                </p>
              )}

              <dl className="mt-6 divide-y divide-[var(--border)] border-y border-[var(--border)]">
                {[
                  {
                    icon: WalletCards,
                    label: "Ortalama fiyat",
                    value: provider.averagePrice || "Bilgi yakında",
                  },
                  {
                    icon: CalendarClock,
                    label: "Çalışma saatleri",
                    value: provider.workingHours,
                  },
                  {
                    icon: MapPinned,
                    label: "Hizmet alanı",
                    value: provider.serviceAreas.join(", "),
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div className="flex gap-3 py-4" key={item.label}>
                      <Icon
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-[var(--brand-orange-dark)]"
                      />
                      <div className="min-w-0">
                        <dt className="text-xs font-medium text-[var(--muted)]">{item.label}</dt>
                        <dd className="mt-1 text-sm font-semibold leading-6 text-[var(--brand-navy)]">
                          {item.value}
                        </dd>
                      </div>
                    </div>
                  );
                })}
              </dl>

              <Button className="mt-6 w-full" href={appRoutes.providers} variant="ghost">
                <ArrowLeft aria-hidden="true" className="mr-2 size-4 shrink-0" />
                Ustalara Geri Dön
              </Button>
            </div>
          </section>
        </aside>
      </Container>

      {relatedProviders.length > 0 ? (
        <section className="border-t border-[var(--border)] bg-white">
          <Container className="py-12 lg:py-16">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium uppercase text-[var(--brand-orange-dark)]">
                  Benzer profiller
                </p>
                <h2 className="mt-1 text-2xl font-bold leading-tight text-[var(--brand-navy)]">
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
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {relatedProviders.map((relatedProvider) => (
                <ProviderCard key={relatedProvider.id} provider={relatedProvider} />
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {hasContact ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-white/95 px-4 py-3 shadow-[var(--shadow-card)] backdrop-blur lg:hidden">
          <div
            className={cn(
              "mx-auto grid max-w-xl gap-2",
              hasWhatsApp && hasPhone ? "grid-cols-[minmax(0,1fr)_auto]" : "grid-cols-1",
            )}
          >
            {hasWhatsApp ? (
              <ProviderContactLink
                aria-label={`${provider.name} ile WhatsApp üzerinden yazış`}
                className="min-h-12 w-full gap-2"
                kind="whatsapp"
                provider={provider}
                rel="noopener noreferrer"
                target="_blank"
              >
                <MessageCircle aria-hidden="true" className="size-4 shrink-0" />
                WhatsApp ile Yaz
              </ProviderContactLink>
            ) : null}
            {hasPhone ? (
              <ProviderContactLink
                aria-label={`${provider.name} adlı ustayı telefonla ara`}
                className="min-h-12 gap-2 px-4"
                kind="phone"
                provider={provider}
              >
                <Phone aria-hidden="true" className="size-4 shrink-0" />
                <span className={hasWhatsApp ? "sr-only" : undefined}>Telefon</span>
              </ProviderContactLink>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
