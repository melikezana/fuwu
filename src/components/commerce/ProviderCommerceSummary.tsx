import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { money, appointment } from "@/lib/commerce/display";
export async function ProviderCommerceSummary({ providerId, earnings = false }: { providerId: string; earnings?: boolean }) {
  const db = await createSupabaseServerClient();
  const result = db ? await db.from("orders").select("*").eq("provider_id",providerId).in("status", earnings ? ["COMPLETED"] : ["CONFIRMED","PROVIDER_ON_THE_WAY","IN_PROGRESS"]).order("starts_at") : null;
  const orders=result?.data ?? [];
  return <section className="commerce-panel mb-6"><h2>{earnings ? "Satın alınan hizmetlerden hak ediş · test" : "Satın alınan hizmet randevuları"}</h2>{result?.error || !db ? <p className="commerce-notice">Sipariş verilerine şu anda ulaşılamıyor.</p> : earnings ? <><strong className="text-2xl font-bold">{money(orders.reduce((sum,o)=>sum+o.provider_gross_minor,0))}</strong><p className="commerce-help">{orders.length} tamamlanan hizmet. Platform komisyonu düşülmüş brüt hak ediştir. Ödeme kuruluşu kesintisi sipariş ayrıntılarında ayrıca gösterilir. Bu tutar gerçek ödeme değildir.</p></> : orders.length ? <ul className="grid gap-3">{orders.slice(0,5).map(o=><li key={o.id}><Link className="commerce-text-link" href={`/orders/${o.id}`}>{o.service_name} · {appointment(o.starts_at)}</Link></li>)}</ul> : <p className="commerce-help">Henüz onaylanmış hizmet randevusu yok.</p>}<Link className="commerce-text-link" href="/provider-dashboard/orders">Tüm Siparişleri Gör →</Link></section>;
}
