import type { Metadata } from "next";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CalendarDays, Home, MapPin, MessageSquarePlus, Star, UserSearch } from "lucide-react";
import { FuwuLogo, FuwuWatermark } from "@/components/brand/FuwuLogo";
import { ProviderAvatar } from "@/components/providers/ProviderAvatar";
import { ProviderProfileViewTracker } from "@/components/providers/ProviderAnalytics";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { ProviderGalleryGrid } from "@/components/providers/ProviderGalleryGrid";
import { ProviderReviews } from "@/components/providers/ProviderReviews";
import { ProviderPurchases } from "@/components/commerce/ProviderPurchases";
import { ProviderSchedule } from "@/components/commerce/ProviderSchedule";
import { ProviderTrustBadges } from "@/components/providers/ProviderTrustBadges";
import { FavoriteButton } from "@/components/providers/FavoriteButton";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { TextLink } from "@/components/ui/TextLink";
import { appRoutes } from "@/lib/constants/navigation";
import { createPageMetadata, getProviderProfessionLabel } from "@/lib/seo";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { getProviderById, getProvidersByCategory } from "@/services/providers";
import { getProviderGallery } from "@/services/providers/gallery";
import { getProviderReviews, getReviewEligibility } from "@/services/reviews";
import { getAuthenticatedServerUserId } from "@/services/auth/server";
import { getCommerceCatalog } from "@/services/commerce";
import { providerPurchaseLinks } from "@/lib/commerce/purchase-links";
import { money } from "@/lib/commerce/display";

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
    description: `${provider.district} bölgesinde ${provider.category} hizmeti sunan ${provider.name} profilini, hizmet bilgilerini ve müşteri değerlendirmelerini inceleyin.`,
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
            <TextLink className="inline-flex min-h-11 items-center text-[var(--muted)] no-underline sm:min-h-0" href={appRoutes.home}>
              Ana sayfa
            </TextLink>
            <span>/</span>
            <TextLink className="inline-flex min-h-11 items-center text-[var(--muted)] no-underline sm:min-h-0" href={appRoutes.providers}>
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
            Aradığın profile ulaşılamadı.
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
    catalog,
  ] = await Promise.all([
    getProvidersByCategory(provider.category),
    getProviderReviews(provider.id),
    getAuthenticatedServerUserId(),
    supabase ? getProviderGallery(provider.id, supabase) : Promise.resolve([]),
    supabase ? getProviderOwnerUserId(provider.id, supabase) : Promise.resolve(null),
    getCommerceCatalog(),
  ]);
  const relatedProviders = providers
    .filter(
      (relatedProvider) =>
        relatedProvider.id !== provider.id && relatedProvider.category === provider.category,
    )
    .slice(0, 2);
  const isOwnProvider =
    Boolean(authenticatedUserId) && authenticatedUserId === providerOwnerUserId;
  const hasReviews = reviewData.source === "supabase" && reviewData.summary.reviewCount > 0;
  const eligibility = supabase && authenticatedUserId && !isOwnProvider ? await getReviewEligibility(provider.id, supabase) : [];
  const purchase = providerPurchaseLinks(catalog)[provider.id];
  const providerCheckoutHref = purchase?.href ?? "#provider-services";

  return (
    <div className="market-profile-page">
      <ProviderProfileViewTracker provider={provider} />
      <Container className="max-w-7xl">
        <nav aria-label="İçerik yolu" className="market-breadcrumb"><Link href={appRoutes.providers}><ArrowLeft aria-hidden="true" className="size-4" /> Ustalara dön</Link><span>/</span><span>{provider.category}</span></nav>
        <div className="market-profile-layout">
          <div className="min-w-0">
            <header className="market-profile-header">
              <div className="market-profile-person"><ProviderAvatar provider={provider} variant="profile" className="rounded-full" /><div className="min-w-0"><p className="market-eyebrow">{provider.category}</p><h1>{provider.name}</h1><p className="market-profile-location"><MapPin aria-hidden="true" className="size-4 shrink-0" />{provider.district}, İstanbul</p></div></div>
              <div className="profile-trust-actions"><ProviderTrustBadges badges={provider.trustBadges} className="mt-5" /><FavoriteButton providerId={provider.id} providerName={provider.name} /></div>
              <div className="market-profile-stats">
                <div><Star aria-hidden="true" className="size-5" /><span><strong>{hasReviews ? reviewData.summary.averageRating.toLocaleString("tr-TR", { maximumFractionDigits: 1 }) : "Yeni değerlendirmelere açık"}</strong><small>{hasReviews ? `${reviewData.summary.reviewCount} müşteri değerlendirmesi` : "Henüz değerlendirme yok"}</small></span></div>
                {provider.experience ? <div><BriefcaseBusiness aria-hidden="true" className="size-5" /><span><strong>{provider.experience} deneyim</strong><small>Ustanın paylaştığı bilgi</small></span></div> : null}
                {provider.completedJobs > 0 ? <div><CalendarDays aria-hidden="true" className="size-5" /><span><strong>{provider.completedJobs} tamamlanan iş</strong><small>FUWU üzerindeki hizmetler</small></span></div> : null}
              </div>
            </header>
            <nav aria-label="Profil bölümleri" className="market-profile-sections"><a href="#provider-services">Hizmetler</a><a href="#reviews">Yorumlar</a><a href="#about-provider">Hakkında</a>{galleryImages.length ? <a href="#portfolio">İş fotoğrafları</a> : null}</nav>
            <ProviderPurchases providerId={provider.id} catalog={catalog} />
            <section className="market-profile-section"><h2>Çalışma düzeni</h2><ProviderSchedule providerId={provider.id} /></section>
            <details className="market-profile-section" id="about-provider"><summary>Usta hakkında</summary><p className="market-long-copy">{provider.description || "Usta henüz bir tanıtım paylaşmadı."}</p></details>
            {galleryImages.length ? <section className="market-profile-section" id="portfolio"><p className="market-eyebrow">USTANIN PAYLAŞTIKLARI</p><h2>İş fotoğrafları</h2><ProviderGalleryGrid images={galleryImages} providerName={provider.name} /></section> : isOwnProvider ? <section className="market-profile-section"><h2>İşlerini göster</h2><p className="market-help-text">Tamamladığın işlerin fotoğraflarını ekle.</p><Button href={appRoutes.providerDashboardProfile} variant="secondary">Galeri Ekle</Button></section> : null}
            <ProviderReviews eligibility={eligibility} providerId={provider.id} reviews={reviewData.reviews} source={reviewData.source} summary={reviewData.summary} />
            <section className="market-profile-section"><h2>Randevu hakkında</h2><div className="home-faq-items"><details><summary>Bu ustayla nasıl randevu planlarım?</summary><p>Hizmetlerden birini seç, ilçeni belirt ve gerçek müsait saatlerden sana uygun olanı seç. Adresini ekleyip toplam bedeli kontrol et. Randevun ödeme doğrulandıktan sonra kesinleşir.</p></details><details><summary>Hizmette sorun yaşarsam ne yapabilirim?</summary><p>Sipariş detayındaki destek seçeneğinden inceleme başlatabilirsin. Hizmet tamamlanmadan teslim kodunu paylaşma. İptal ve iade durumunu aynı ekrandan takip edebilirsin.</p></details></div></section>
          </div>
          <aside className="market-profile-booking">
            <div className="market-booking-card"><p className="market-eyebrow">RANDEVUNU PLANLA</p><h2>Hizmetini seç,<br />randevunu planla.</h2><p className="market-help-text">Kapsamı, fiyatı ve uygun saatleri gör.</p><div className="market-booking-facts"><div><MapPin aria-hidden="true" className="size-5 shrink-0" /><span>{provider.district}</span></div><div><CalendarDays aria-hidden="true" className="size-5 shrink-0" /><span>Gerçek müsaitlik hizmet seçiminde gösterilir.</span></div></div><Button href={providerCheckoutHref} className="min-h-12 w-full">Hizmetleri İncele <ArrowRight aria-hidden="true" className="size-4 shrink-0" /></Button><p className="market-booking-note">Randevu, ödeme doğrulanınca kesinleşir.</p></div>
            <p className="market-profile-guidance">Karar vermeden önce kapsamı ve profili incele. Doğrulama rozetleri yalnızca belirtilen kontrolleri ifade eder.</p>
          </aside>
        </div>
        {relatedProviders.length ? <section className="market-related"><p className="market-eyebrow">DİĞER SEÇENEKLER</p><h2>Aynı alanda hizmet veren ustalar</h2><div className="mt-6 grid gap-5 md:grid-cols-2">{relatedProviders.map((relatedProvider) => <ProviderCard key={relatedProvider.id} provider={relatedProvider} />)}</div></section> : null}
      </Container>
      <div className="market-mobile-action"><div className="min-w-0"><small>{purchase ? "Başlangıç fiyatı" : "Ustanın mağazası"}</small><strong>{purchase ? money(purchase.priceMinor) : "Hizmetler"}</strong></div><Button href={providerCheckoutHref}><MessageSquarePlus aria-hidden="true" className="size-4 shrink-0" />{purchase ? "Hizmeti Satın Al" : "Hizmetleri Gör"}</Button></div>
    </div>
  );
}
