import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  Home,
  MapPinned,
  MessageSquarePlus,
  Star,
  Timer,
  UserSearch,
  WalletCards,
} from "lucide-react";
import { FuwuLogo, FuwuWatermark } from "@/components/brand/FuwuLogo";
import { ProviderProfileViewTracker } from "@/components/providers/ProviderAnalytics";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { ProviderGalleryGrid } from "@/components/providers/ProviderGalleryGrid";
import { ProviderReviews } from "@/components/providers/ProviderReviews";
import { ProviderTrustBadges } from "@/components/providers/ProviderTrustBadges";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { TextLink } from "@/components/ui/TextLink";
import { appRoutes } from "@/lib/constants/navigation";
import {
  getProviderDataNotice,
  getProviderInitials,
  isLiveProvider,
} from "@/lib/constants/providers";
import { createPageMetadata, getProviderProfessionLabel } from "@/lib/seo";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { getProviderById, getProvidersByCategory } from "@/services/providers";
import { getProviderGallery } from "@/services/providers/gallery";
import { getProviderReviews } from "@/services/reviews";
import { getAuthenticatedServerUserId } from "@/services/auth/server";

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
    description: `${provider.district} bölgesinde hizmet veren ${provider.name} için ${provider.averagePrice} fiyat aralığını ve ${provider.rating.toFixed(1)} puanını inceleyin, Fuwu üzerinden talep oluşturun.`,
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
    <div className="premium-page-shell pb-24 lg:pb-0">
      <section className="premium-page-band relative overflow-hidden">
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

async function getProviderOwnerUserId(
  providerId: string,
  supabase: SupabaseClient<Database>,
) {
  const { data, error } = await supabase
    .from("providers")
    .select("user_id")
    .eq("id", providerId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data?.user_id ?? null;
}

export default async function ProviderProfilePage({ params }: ProviderProfilePageProps) {
  const { id } = await params;
  const provider = await getProviderById(id);

  if (!provider) {
    return <ProviderNotFoundState />;
  }

  const supabase = await createSupabaseServerClient();
  const [
    providers,
    reviewData,
    authenticatedUserId,
    galleryImages,
    providerOwnerUserId,
  ] = await Promise.all([
    getProvidersByCategory(provider.category),
    getProviderReviews(provider.id),
    getAuthenticatedServerUserId(),
    supabase ? getProviderGallery(provider.id, supabase) : Promise.resolve([]),
    supabase ? getProviderOwnerUserId(provider.id, supabase) : Promise.resolve(null),
  ]);
  const relatedProviders = providers
    .filter(
      (relatedProvider) =>
        relatedProvider.id !== provider.id && relatedProvider.category === provider.category,
    )
    .slice(0, 2);
  const isOwnProvider =
    Boolean(authenticatedUserId) && authenticatedUserId === providerOwnerUserId;
  const responseTimeLabel = provider.responseTime.replace(/^Ortalama cevap:\s*/i, "");
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
      value: responseTimeLabel,
    },
  ];
  const providerCheckoutParams = new URLSearchParams({
    district: provider.district,
    provider_id: provider.id,
    provider_name: provider.name,
    service: provider.category,
  });
  const providerCheckoutHref = `${appRoutes.request}?${providerCheckoutParams.toString()}`;

  return (
    <div className="bg-[var(--background)] pb-24 lg:pb-0">
      <ProviderProfileViewTracker provider={provider} />
      <section className="relative overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(180deg,#FFFFFF_0%,#FAFAFB_100%)]">
        <FuwuWatermark className="-right-14 -top-14 text-[8rem] opacity-[0.035] sm:text-[10rem]" />
        <Container className="relative py-3 sm:py-8">
          <nav className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--muted)] sm:text-sm">
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

      <Container className="grid gap-6 py-4 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,370px)] lg:items-start lg:py-16">
        <div className="min-w-0 space-y-6 sm:space-y-8">
          <section className="premium-card relative p-4 sm:p-8">
            <FuwuWatermark className="-right-16 -top-10 text-[7rem] opacity-[0.03] sm:text-[9rem]" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-2xl shadow-[var(--shadow-premium)] ring-4 ring-white sm:h-48 sm:w-48">
                {provider.profileImageUrl ? (
                  <Image
                    alt={provider.name}
                    className="object-cover"
                    fill
                    priority
                    sizes="(min-width: 640px) 192px, 144px"
                    src={provider.profileImageUrl}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--brand-orange)] to-[var(--brand-orange-dark)]">
                    <span className="text-5xl font-bold tracking-tight text-white drop-shadow-sm">
                      {getProviderInitials(provider)}
                    </span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <ProviderTrustBadges
                    badges={provider.trustBadges}
                    featured
                    limit={1}
                  />
                  <span
                    className={`inline-flex min-h-8 items-center rounded-full px-3 py-1.5 text-xs font-medium ${availabilityBadgeClassName}`}
                  >
                    {availabilityLabel}
                  </span>
                </div>
                <h1 className="mt-4 text-3xl font-bold leading-tight text-[var(--brand-navy)] sm:text-5xl">
                  {provider.name}
                </h1>
                <div className="mt-3 flex flex-wrap gap-2">
                  <TextLink
                    className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--brand-navy)] no-underline hover:border-[rgba(255,138,0,0.36)] hover:bg-[var(--brand-orange-soft)]"
                    href={`${appRoutes.providers}?category=${encodeURIComponent(provider.category)}`}
                  >
                    {provider.category}
                  </TextLink>
                  <TextLink
                    className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--brand-navy)] no-underline hover:border-[rgba(255,138,0,0.36)] hover:bg-[var(--brand-orange-soft)]"
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
                      <span className="block text-2xl font-bold leading-none text-[var(--brand-navy)]">
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

            <p className="relative mt-6 rounded-md border border-[rgba(20,33,61,0.08)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-semibold leading-6 text-[var(--muted)]">
              {getProviderDataNotice(provider)}
            </p>

            <div className="relative mt-6 lg:hidden">
              <Button
                className="min-h-12 w-full gap-2"
                href={providerCheckoutHref}
                variant="primary"
              >
                <MessageSquarePlus aria-hidden="true" className="size-4 shrink-0" />
                Hizmeti Satın Al
              </Button>
            </div>
          </section>

          <section className="premium-card p-6">
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

          {galleryImages.length > 0 ? (
            <section className="premium-card p-6">
              <h2 className="mb-4 text-lg font-bold text-[var(--brand-navy)]">
                İşlerimden Kareler
              </h2>
              <ProviderGalleryGrid
                images={galleryImages}
                providerName={provider.name}
              />
            </section>
          ) : isOwnProvider ? (
            <section className="rounded-lg border-2 border-dashed border-[rgba(255,138,0,0.3)] bg-white p-6 shadow-[var(--shadow-subtle)]">
              <p className="text-sm font-semibold text-[var(--muted)]">
                İş galeriniz henüz boş.
              </p>
              <Link
                className="mt-3 inline-flex min-h-10 items-center rounded-md bg-[var(--brand-orange)] px-4 py-2 text-sm font-bold text-white shadow-[var(--shadow-action)] transition hover:bg-[var(--brand-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
                href={appRoutes.providerDashboardProfile}
              >
                Galeri Ekle →
              </Link>
            </section>
          ) : null}

          <ProviderReviews
            isAuthenticated={Boolean(authenticatedUserId)}
            providerId={provider.id}
            reviews={reviewData.reviews}
            source={reviewData.source}
            summary={reviewData.summary}
          />

          <section className="premium-card p-6">
            <p className="text-xs font-medium uppercase text-[var(--brand-orange-dark)]">
              Sunduğu hizmetler
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--brand-navy)]">
              En sık aldığı işler
            </h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {provider.servicesOffered.map((service) => (
                <div
                  className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-3 text-sm font-semibold text-[var(--brand-navy)]"
                  key={service}
                >
                  {service}
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-8 md:grid-cols-2">
            <div className="premium-card p-6">
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

            <div className="premium-card p-6">
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
          <section className="premium-card overflow-hidden p-0 shadow-[var(--shadow-elevated)]">
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
                Hemen İletişime Geç
              </h2>
              <p className="mt-2 text-sm font-bold text-[var(--trust-green)]">
                Ortalama {responseTimeLabel} içinde yanıt
              </p>
              <p className="mt-3 text-sm font-normal leading-6 text-[var(--muted)]">
                {isLiveProvider(provider)
                  ? "İşin kapsamını, uygun zamanı ve net fiyatı Fuwu üzerinden talep oluşturarak netleştir."
                  : "Bu örnek profilde talep akışı gösterim amaçlıdır."}
              </p>

              <div className="mt-6 grid gap-3">
                <Button
                  className="min-h-12 w-full gap-2"
                  href={providerCheckoutHref}
                  variant="primary"
                >
                  <MessageSquarePlus aria-hidden="true" className="size-4 shrink-0" />
                  Hizmeti Satın Al
                </Button>
              </div>

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
        <section className="border-t border-[var(--border)] bg-white/80">
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

      <div className="safe-area-bottom fixed inset-x-0 bottom-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom))] z-40 border-t border-[var(--border)] bg-white/95 p-3 shadow-[var(--shadow-card)] backdrop-blur-sm md:bottom-0 lg:hidden">
        <div className="mx-auto flex max-w-lg gap-3">
          <Button className="h-12 flex-1 gap-1.5 text-sm" href={providerCheckoutHref} variant="primary">
            <MessageSquarePlus aria-hidden="true" className="size-4 shrink-0" />
            Hizmeti Satın Al
          </Button>
        </div>
      </div>
    </div>
  );
}
