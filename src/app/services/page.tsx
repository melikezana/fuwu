import { getCommerceCatalog } from "@/services/commerce";
import { catalogPreviews } from "@/lib/commerce/previews";
import { ServiceCatalog } from "@/components/commerce/ServiceCatalog";
import { CommerceJourney } from "@/components/commerce/CommerceJourney";
import { getServiceForValue } from "@/lib/constants/services";
export const dynamic = "force-dynamic";
export const metadata = { title: "Hizmetleri İncele | FUWU", description: "Hizmetini seç, ustaları karşılaştır, uygun gün ve saatte randevunu planla." };
export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; district?: string }> }) {
  const [catalog, params] = await Promise.all([getCommerceCatalog(), searchParams]);
  const category = catalog.categories.find(c => c.slug === params.category || c.name === params.category);
  const previews: Record<string,string> = { "musluk-montaji":"tesisat", "klima-bakimi":"klima-beyaz-esya", "elektrik-ariza-tespiti":"elektrik-hizmeti", "mobilya-montaji":"mobilya-montaj" };
  const services = catalog.unavailable ? catalogPreviews.filter(s => !params.category || previews[s.slug] === params.category) : catalog.services.filter(s => !params.category || s.category_id === category?.id);
  const categoryName = getServiceForValue(params.category)?.title || category?.name;
  return <div className="commerce-page"><header className="commerce-page-header"><p className="commerce-eyebrow">{categoryName ? `HİZMETLER / ${categoryName}` : "EVİN İÇİN, HAYATIN İÇİN"}</p><h1>{categoryName || "Bir hizmet seç."}<br /><span>Gerisini ustasına bırak.</span></h1><p>Kapsamı belli hizmetler. Seçtiğin usta. Sana uygun bir randevu.</p></header><ServiceCatalog category={params.category} services={services} offers={catalog.offers} unavailable={catalog.unavailable} initialSearch={params.q} district={params.district} /><CommerceJourney /></div>;
}
