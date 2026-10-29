import { notFound } from "next/navigation";
import Link from "next/link";
import { getCommerceCatalog } from "@/services/commerce";
import { ServiceBooking } from "@/components/commerce/ServiceBooking";
import { getServerAuthContext } from "@/services/auth/server";
import { ONLINE_PURCHASE_CLOSED, sandboxCheckoutEnabled } from "@/lib/prelaunch";
export const dynamic = "force-dynamic";
export default async function ServicePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ provider?: string; district?: string; variant?: string; rebook?: string }> }) {
  const [catalog, { slug }, query] = await Promise.all([getCommerceCatalog(), params, searchParams]);
  const service = catalog.services.find(s => s.slug === slug);
  if (!service && catalog.unavailable) return <div className="commerce-page"><section className="commerce-panel"><h1>Hizmete şu anda ulaşılamıyor</h1><p role="alert" className="commerce-notice">Katalog bağlantısı kurulamadı. Hizmet, fiyat ve randevu bilgileri doğrulanana kadar satın alma kapalı.</p><Link className="commerce-button" href={`/services/${encodeURIComponent(slug)}`}>Yeniden Dene</Link><Link className="commerce-secondary" href="/services">Tüm Hizmetleri Gör</Link></section></div>;
  if (!service) notFound();
  if (!sandboxCheckoutEnabled()) return <div className="commerce-page"><section className="commerce-panel"><p className="commerce-eyebrow">HİZMET KAPSAMI</p><h1>{service.name}</h1><p>{service.description}</p><h2>Neler dahil?</h2><p>{service.scope}</p>{service.exclusions && <><h2>Dahil olmayanlar</h2><p>{service.exclusions}</p></>}<p className="commerce-notice">{ONLINE_PURCHASE_CLOSED}</p><div className="prelaunch-actions"><Link className="commerce-button" href="/waitlist">Açılıştan Haberdar Ol</Link><Link className="commerce-secondary" href="/services">Hizmetleri Keşfet</Link></div></section></div>;
  const { user, supabase } = await getServerAuthContext();
  const addresses = user && supabase ? await supabase.from("customer_addresses").select("id,label,district_id,address").eq("customer_id", user.id).limit(100) : null;
  return <ServiceBooking service={service} offers={catalog.offers.filter(o => o.service_id === service.id)} variants={catalog.variants.filter(v => v.service_id === service.id)} districts={catalog.districts} unavailable={catalog.unavailable} initialProvider={query.provider} initialDistrict={query.district} initialVariant={query.variant} initialRebook={query.rebook} savedAddresses={addresses?.data ?? []} />;
}
