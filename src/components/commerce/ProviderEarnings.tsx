import Link from "next/link";
import type { ProviderFinance } from "@/lib/commerce/finance";
import { providerNetEntitlement } from "@/lib/commerce/finance";
import { money } from "@/lib/commerce/display";

export function ProviderEarnings({ finance }: { finance: ProviderFinance | null }) {
  const net = finance ? providerNetEntitlement(finance) : null;
  return <section className="commerce-panel"><h2>Kazancın burada.</h2><p className="commerce-sandbox">Sandbox · Test işlemleri, gerçek banka ödemesi değildir.</p>{!finance ? <p role="alert" className="commerce-notice">Kazançların yüklenemedi. Sayfayı yenileyip tekrar dene.</p> : <>
    <div className="fusion-metric-grid">{[["Hizmet bedeli", money(finance.gross_minor)], ["FUWU komisyonu", money(finance.commission_minor)], ["Brüt hak ediş", money(finance.provider_gross_minor)], ["Kesinti sonrası hak ediş", net == null ? "Kesinti doğrulanmadı" : money(net)]].map(([label,value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
    <h3>Ödeme durumu</h3><dl className="fusion-health"><div><dt>Kuruluş onayı bekleyen brüt pay</dt><dd>{money(finance.pending_minor)}</dd></div><div><dt>Kuruluşça onaylanan brüt pay</dt><dd>{money(finance.released_minor)}</dd></div></dl>
    <p className="commerce-help">Hak ediş onayı, banka transferinin tamamlandığı anlamına gelmez.</p>
    {net == null && <p className="commerce-notice">Ustaya yansıtılacak tüm kesintiler doğrulanmadan net hak ediş gösterilmez.</p>}
    {finance.in_flight_count > 0 && <p className="commerce-notice">{finance.in_flight_count} işlem kuruluşla mutabakat bekliyor.</p>}
    <details className="provider-finance-details"><summary>Kesintiler ve iadeler</summary><dl className="fusion-health"><div><dt>Tamamlanan hizmet</dt><dd>{finance.completed_count}</dd></div><div><dt>Bildirilen kuruluş maliyeti</dt><dd>{money(finance.known_processor_fee_minor)}</dd></div><div><dt>Ustaya yansıtılan doğrulanmış kesinti</dt><dd>{finance.provider_processor_fee_minor == null ? "Veri yok" : money(finance.provider_processor_fee_minor)}</dd></div><div><dt>İade edilen hizmet bedeli</dt><dd>{finance.refunded_service_minor == null ? "Veri yok" : money(finance.refunded_service_minor)}</dd></div></dl><p className="commerce-help">{finance.unknown_fee_count} işlemde kuruluş maliyeti, {finance.unconfirmed_provider_fee_count ?? "bilinmeyen sayıda"} işlemde ustaya yansıtılacak kesinti doğrulanmadı. Kuruluş maliyeti ayrıca gösterilir.</p></details>
  </>}<Link className="commerce-text-link" href="/provider-dashboard/orders">Siparişleri Gör →</Link></section>;
}
