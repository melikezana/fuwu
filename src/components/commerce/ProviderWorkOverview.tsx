import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import type { CommerceOrder } from "@/lib/commerce/types";
import type { ProviderFinance } from "@/lib/commerce/finance";
import { appointment, money } from "@/lib/commerce/display";
import { isOrderOverdue } from "@/lib/commerce/order-state";

export type ProviderOperations = { today_count: number; new_count: number; upcoming_count: number; active_count: number; overdue_count: number };
export function ProviderWorkOverview({ orders, nextOrder, stats, finance, unavailable, now }: {
  orders: CommerceOrder[]; nextOrder: CommerceOrder | null; stats: ProviderOperations | null; finance: ProviderFinance | null; unavailable: boolean; now: number;
}) {
  const sorted = [...orders].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const next = nextOrder;
  return <section className="provider-work-overview">
    {unavailable ? <p role="alert" className="commerce-notice">İşlerin yüklenemedi. Sayfayı yenileyip tekrar dene.</p> : <>
      {next ? <article className="provider-next-job"><p className="commerce-eyebrow">SIRADAKİ İŞİN</p><h2>{new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(new Date(next.starts_at))} · {next.service_name}</h2><p><CalendarDays size={18} aria-hidden />{appointment(next.starts_at)}</p><p><MapPin size={18} aria-hidden />{next.district_name}</p><Link className="commerce-button" href={`/orders/${next.id}`}>Siparişi Gör <ArrowRight size={18} aria-hidden /></Link></article> : <article className="commerce-panel"><h2>Takviminde yer var.</h2><p className="commerce-help">Şu anda yaklaşan bir randevun yok.</p><Link className="commerce-secondary" href="/provider-dashboard/calendar">Takvimi Gör</Link></article>}
      {stats && stats.overdue_count > 0 && <Link className="commerce-warning block" href="/provider-dashboard/orders?view=overdue">{stats.overdue_count} geciken iş · Siparişleri kontrol et →</Link>}
      <div className="fusion-metric-grid provider-work-metrics">{[["Bugünkü randevular", stats?.today_count], ["Yeni siparişler", stats?.new_count], ["Devam eden işler", stats?.active_count], ["Tamamlanan işler", finance?.completed_count]].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value ?? "—"}</strong></article>)}</div>
      <Link className="provider-earnings-link commerce-panel" href="/provider-dashboard/earnings"><span><small>KAZANCIN BURADA</small><strong>{finance ? money(finance.provider_gross_minor) : "Şu anda yüklenemiyor"}</strong><span>Tamamlanan hizmetlerden brüt hak ediş · Sandbox</span></span><ArrowRight size={22} aria-hidden /></Link>
      {sorted.length > 0 && <details className="provider-other-jobs"><summary>Aktif işlerin · {sorted.length}{sorted.length === 30 ? "+" : ""}</summary><ul className="fusion-schedule-list">{sorted.slice(0, 5).map(o => <li key={o.id}><Link href={`/orders/${o.id}`}>{o.service_name} · {appointment(o.starts_at)}</Link>{isOrderOverdue(o, now) && <p className="commerce-warning">Planlanan bitiş saati geçti.</p>}</li>)}</ul></details>}
    </>}
    <div className="fusion-actions"><Link className="commerce-secondary" href="/provider-dashboard/store">Hizmet Mağazam</Link><Link className="commerce-secondary" href="/provider-dashboard/calendar">Takvim ve İzinler</Link></div>
  </section>;
}
