import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCommerceCatalog } from "@/services/commerce";
import { money } from "@/lib/commerce/display";
export async function ProviderPurchases({ providerId }: { providerId: string }) {
  const catalog = await getCommerceCatalog();
  const offers = catalog.offers.filter(o => o.provider_id === providerId);
  return <section className="market-profile-section" id="provider-services"><p className="market-eyebrow">USTANIN HİZMET MAĞAZASI</p><h2>Hizmetini doğrudan satın al</h2>{catalog.unavailable ? <p className="commerce-notice">Hizmet mağazasına şu anda ulaşılamıyor.</p> : !offers.length ? <p className="commerce-notice">Bu ustanın henüz satın alınabilir, fiyatlandırılmış bir hizmeti yok.</p> : <div className="market-service-options">{offers.map(o => { const service = catalog.services.find(s => s.id === o.service_id); return service ? <Link key={o.id} href={`/services/${service.slug}?provider=${providerId}`}><span>{service.name}{o.variant_name && ` · ${o.variant_name}`}<small className="block">{o.duration_minutes} dakika · {money(o.price_minor)}</small></span><ArrowRight size={18} aria-hidden /></Link> : null; })}</div>}<p className="market-help-text">Hizmeti seçtikten sonra bölgeniz için gerçek müsait gün ve saatleri görebilirsiniz.</p></section>;
}
