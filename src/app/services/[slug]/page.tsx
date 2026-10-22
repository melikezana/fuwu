import { notFound } from "next/navigation";
import { getCommerceCatalog } from "@/services/commerce";
import { catalogPreviews } from "@/lib/commerce/previews";
import { ServiceBooking } from "@/components/commerce/ServiceBooking";
export const dynamic = "force-dynamic";
export default async function ServicePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ provider?: string; district?: string }> }) {
  const [catalog, { slug }, query] = await Promise.all([getCommerceCatalog(), params, searchParams]);
  const service = (catalog.unavailable ? catalogPreviews : catalog.services).find(s => s.slug === slug);
  if (!service) notFound();
  return <ServiceBooking service={service} offers={catalog.offers.filter(o => o.service_id === service.id)} variants={catalog.variants.filter(v => v.service_id === service.id)} districts={catalog.districts} unavailable={catalog.unavailable} initialProvider={query.provider} initialDistrict={query.district} />;
}
