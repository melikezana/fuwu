import { notFound } from "next/navigation";
import { getCommerceCatalog } from "@/services/commerce";
import { catalogPreviews } from "@/lib/commerce/previews";
import { ServiceBooking } from "@/components/commerce/ServiceBooking";
import { getServerAuthContext } from "@/services/auth/server";
export const dynamic = "force-dynamic";
export default async function ServicePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ provider?: string; district?: string; variant?: string; rebook?: string }> }) {
  const [catalog, { slug }, query] = await Promise.all([getCommerceCatalog(), params, searchParams]);
  const service = (catalog.unavailable ? catalogPreviews : catalog.services).find(s => s.slug === slug);
  if (!service) notFound();
  const { user, supabase } = await getServerAuthContext();
  const addresses = user && supabase ? await supabase.from("customer_addresses").select("id,label,district_id,address").eq("customer_id", user.id).limit(100) : null;
  return <ServiceBooking service={service} offers={catalog.offers.filter(o => o.service_id === service.id)} variants={catalog.variants.filter(v => v.service_id === service.id)} districts={catalog.districts} unavailable={catalog.unavailable} initialProvider={query.provider} initialDistrict={query.district} initialVariant={query.variant} initialRebook={query.rebook} savedAddresses={addresses?.data ?? []} />;
}
