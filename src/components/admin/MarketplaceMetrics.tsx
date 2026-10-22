import Link from "next/link";
import { money } from "@/lib/commerce/display";
import type { MarketplaceSummary } from "@/lib/commerce/finance";

export function MarketplaceMetrics({ summary }: { summary: MarketplaceSummary | null }) {
  if (!summary) return <section className="commerce-panel"><h2>Marketplace operasyonları</h2><p className="commerce-notice" role="status">Marketplace verileri okunamadı. Bağlantı, migration ve yetkileri kontrol edin.</p><Link className="commerce-text-link" href="/admin/marketplace">Operasyon Merkezi →</Link></section>;
  const metrics = [
    ["Tamamlanan sipariş", summary.completed_count], ["Bugün GMV", money(summary.daily_gmv_minor)], ["Bu ay GMV", money(summary.monthly_gmv_minor)],
    ["Tamamlanan hizmet komisyonu", money(summary.commission_minor)], ["Ödeme bekleyen", summary.pending_count], ["Başarısız ödeme", summary.failed_count],
    ["İade bekleyen", summary.refund_pending_count], ["Doğrulanan iadeler", money(summary.refunded_minor)], ["Bekleyen brüt hak ediş", money(summary.payout_pending_minor)],
    ["Aktif ve onaylı usta", summary.active_providers], ["Bu ay yeni müşteri", summary.new_customers_month],
    ["İptal oranı", `%${summary.order_count ? (100 * summary.cancelled_count / summary.order_count).toFixed(1) : "0"}`],
    ["Ortalama ödenen hizmet", money(summary.average_minor)], ["Tekrar satın alan müşteri", `%${summary.repeat_customer_percent}`],
  ];
  return <section className="fusion-marketplace-metrics"><div className="fusion-section-heading"><div><p className="commerce-eyebrow">MARKETPLACE OPERASYONLARI</p><h2>Siparişten hak edişe, tek merkez.</h2></div><Link className="commerce-text-link" href="/admin/marketplace">Operasyon Merkezi →</Link></div><p className="commerce-sandbox">Sandbox işlemleri · GMV toplam hizmet satış hacmidir. Komisyon ayrı gösterilir; tutarlar gerçek şirket geliri değildir.</p><div className="fusion-metric-grid">{metrics.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>{summary.reconciliation_count > 0 && <Link className="commerce-notice block" href="/admin/marketplace?view=payments">{summary.reconciliation_count} ödeme veya hak ediş kaydı mutabakat gerektiriyor.</Link>}<p className="commerce-help">GMV başarılı tahsilatların brüt toplamıdır; iadeler ayrıca gösterilir. Komisyon yalnızca tamamlanan ve ödenmiş hizmetlerden hesaplanır. Gün ve ay sınırları Türkiye saatidir.</p></section>;
}
