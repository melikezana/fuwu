import Link from "next/link";
import { CalendarDays, Clock3 } from "lucide-react";
import type { CommerceOrder } from "@/lib/commerce/types";
import { appointment, orderLabels } from "@/lib/commerce/display";
import { isOrderOverdue } from "@/lib/commerce/order-state";
export function CustomerSpotlight({ upcoming, active, now }: { upcoming: CommerceOrder | null; active: CommerceOrder | null; now: number }) {
  return <div className="operations-spotlights">{[["Yaklaşan randevun", upcoming], ["Takip edilen aktif hizmetin", active]].map(([title, value]) => {
    const order = value as CommerceOrder | null;
    return <section className="commerce-panel" key={String(title)}><p className="commerce-eyebrow">{String(title)}</p>{order ? <><h2>{order.service_name}</h2><p>{order.provider_name}</p><p><CalendarDays size={17} aria-hidden /> {appointment(order.starts_at)}</p><p className="commerce-help">{orderLabels[order.status]}</p>{isOrderOverdue(order, now) && <p className="commerce-warning"><Clock3 size={17} aria-hidden /> Geciken hizmet · Hizmet takibi sürüyor.</p>}<Link className="commerce-button" href={`/orders/${order.id}`}>Sipariş Detayını Gör</Link></> : <><h2>{title === "Yaklaşan randevun" ? "Yeni bir hizmete yer aç." : "Her şey kontrol altında."}</h2><p className="commerce-help">{title === "Yaklaşan randevun" ? "Henüz yaklaşan bir randevun yok." : "Şu anda takip edilen aktif hizmetin yok."}</p><Link className="commerce-secondary" href={title === "Yaklaşan randevun" ? "/services" : "/orders"}>{title === "Yaklaşan randevun" ? "Hizmetleri İncele" : "Siparişlerim"}</Link></>}</section>;
  })}</div>;
}
