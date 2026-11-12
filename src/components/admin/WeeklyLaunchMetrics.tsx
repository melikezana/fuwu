import Link from "next/link";
import type { WeeklyLaunchMetrics as Metrics, WeeklyMetricKey } from "@/services/admin/launch-metrics";

const columns: [WeeklyMetricKey, string][] = [
  ["applications_received", "Usta başvurusu"],
  ["providers_approved", "Yayına onaylanan usta"],
  ["stores_updated", "Güncellenen mağaza"],
  ["interest_granted", "İzinli ön kayıt"],
  ["interest_withdrawn", "Geri çekilen izin"],
  ["orders_created", "Sipariş"],
  ["orders_completed", "Tamamlanan sipariş"],
  ["support_received", "Destek talebi"],
  ["support_resolved", "Çözülen destek"],
];
const applicationStatus: Record<string, string> = { pending: "bekliyor", approved: "onaylı", rejected: "reddedildi" };
const weekLabel = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "UTC" });

// 9 Kasım 2026 denetimi · İzleme: haftalık doğrulama, mağaza, izinli kayıt, dönüşüm ve destek ölçümleri.
export function WeeklyLaunchMetrics({ metrics }: { metrics: Metrics | null }) {
  if (!metrics) return <details className="commerce-panel control-launch-details"><summary>Haftalık lansman ölçümleri</summary><p className="commerce-notice" role="status">Haftalık ölçümler okunamadı. Güncel migration uygulanmamış olabilir; bilinmeyen değerler sıfır gösterilmez.</p></details>;
  const unlinked = Object.entries(metrics.applications.unlinked);
  const unlinkedTotal = unlinked.reduce((sum, [, total]) => sum + total, 0);
  const orders = metrics.weeks.reduce((sum, week) => sum + week.orders_created, 0);
  return <details className="commerce-panel control-launch-details">
    <summary>Haftalık lansman ölçümleri</summary>
    <dl className="prelaunch-readiness">
      <div><dt>Yayındaki gerçek usta</dt><dd>{metrics.totals.published_providers}</dd></div>
      <div><dt>Yayımlı mağaza</dt><dd>{metrics.totals.published_stores}</dd></div>
      <div><dt>İzinli müşteri ön kaydı</dt><dd>{metrics.totals.consented_interest}</dd></div>
      <div><dt>Açık destek talebi</dt><dd>{metrics.totals.open_support}</dd></div>
      <div><dt>Hesaba bağlı başvuru</dt><dd>{metrics.applications.linked} / {metrics.applications.total}</dd></div>
      <div><dt>Son {metrics.weeks.length} haftada sipariş</dt><dd>{orders}</dd></div>
    </dl>
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Haftalık ölçüm tablosu">
      <table className="w-full min-w-[640px] text-left text-sm">
        <caption className="sr-only">Hafta başlangıcına göre lansman ölçümleri, İstanbul saatiyle</caption>
        <thead><tr><th scope="col" className="py-2 pr-3">Hafta</th>{columns.map(([key, label]) => <th scope="col" className="py-2 pr-3" key={key}>{label}</th>)}</tr></thead>
        <tbody>{metrics.weeks.map(week => <tr key={week.week_start}><th scope="row" className="py-2 pr-3 font-semibold">{weekLabel(week.week_start)}</th>{columns.map(([key]) => <td className="py-2 pr-3 tabular-nums" key={key}>{week[key].toLocaleString("tr-TR")}</td>)}</tr>)}</tbody>
      </table>
    </div>
    {unlinkedTotal > 0 && <p className="commerce-warning" role="status">{unlinkedTotal} başvuru bir kullanıcı hesabına bağlı değil ({unlinked.map(([status, total]) => `${total} ${applicationStatus[status] ?? status}`).join(", ")}). Kaynağı gerçek, deneme veya eksik olarak sınıflandır. <Link href="/admin/provider-applications">Başvuruları aç</Link></p>}
    {metrics.unauthorized_actions.length > 0 && <>
      <h3 className="mt-5 text-sm font-bold">Yetkisiz işlem denemeleri · son 14 gün</h3>
      <ul className="mt-2 grid gap-1 text-sm">{metrics.unauthorized_actions.map(row => <li key={`${row.day}-${row.entity_type}`}>{weekLabel(row.day)} · {row.entity_type}: {row.total} deneme, {row.distinct_accounts} hesap{row.anonymous ? `, ${row.anonymous} oturumsuz` : ""}</li>)}</ul>
      <p className="commerce-help">Tek güne ve tek hesaba yığılan denemeler çoğunlukla otomatik test koşusudur; farklı hesaplara yayılan denemeler incelenmelidir. <Link href="/admin/audit">Denetim kayıtlarını aç</Link></p>
    </>}
    <p className="commerce-help">Deneme ve kaynağı doğrulanmamış usta kayıtları bu ölçümlere katılmaz. Haftalar pazartesi başlar.</p>
  </details>;
}
