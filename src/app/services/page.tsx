import Link from "next/link";
import { getCommerceCatalog } from "@/services/commerce";
import { getCatalogNavigation } from "@/lib/commerce/catalog-navigation";
import { ServiceCatalog } from "@/components/commerce/ServiceCatalog";
import { getServiceForValue } from "@/lib/constants/services";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hizmetleri Keşfet | FUWU", description: "Hizmetini seç, ustaları karşılaştır, uygun gün ve saatte randevunu planla." };

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; district?: string }> }) {
  const [catalog, params] = await Promise.all([getCommerceCatalog(), searchParams]);
  const requestedCategory = params.category ?? "";
  const canonicalSlug = getServiceForValue(requestedCategory)?.slug;
  const category = catalog.categories.find(item => item.slug === requestedCategory || item.name === requestedCategory) ?? catalog.categories.find(item => item.slug === canonicalSlug);
  const categorySlug = category?.slug ?? getServiceForValue(requestedCategory)?.slug ?? requestedCategory;
  const services = catalog.services.filter(service => service.is_active && (!requestedCategory || service.category_id === category?.id));
  const categoryName = category?.name ?? (requestedCategory ? "Kategori bulunamadı" : "");
  const navigation = getCatalogNavigation(catalog);
  const district = catalog.districts.find(item => item.id === params.district || item.name === params.district);
  const categoryHref = (slug?: string) => `/services${slug || params.district ? `?${new URLSearchParams({ ...(slug ? { category: slug } : {}), ...(params.district ? { district: params.district } : {}) })}` : ""}`;

  return <div className="commerce-page catalog-page">
    <header className="commerce-page-header"><p className="commerce-eyebrow">HİZMET KATALOĞU{categoryName ? ` / ${categoryName}` : ""}</p><h1>{categoryName || "Evin için ne yapalım?"}</h1><p>Hizmetini seç, ustanı ve saatini belirle.</p></header>
    <nav className="catalog-category-nav" aria-label="Hizmet kategorileri"><Link href={categoryHref()} aria-current={!requestedCategory ? "page" : undefined}>Tüm hizmetler</Link>{navigation.map(item => <Link key={item.slug} href={categoryHref(item.slug)} aria-current={categorySlug === item.slug ? "page" : undefined}>{item.title}</Link>)}</nav>
    <ServiceCatalog key={`${requestedCategory}|${params.q ?? ""}|${params.district ?? ""}`} category={categorySlug} categories={catalog.categories} services={services} offers={catalog.offers} unavailable={catalog.unavailable} initialSearch={params.q} district={params.district} districtId={params.district ? district?.id ?? "unknown-district" : ""} />
    <p className="catalog-payment-note">Online satın alma henüz açılmadı. <Link href="/waitlist">Açılıştan haberdar ol</Link></p>
  </div>;
}
