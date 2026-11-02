import Link from "next/link";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import type { ProviderAlert, TrustAlerts as Alerts } from "@/services/admin/trust-alerts";

function ProviderList({ items, render }: { items: ProviderAlert[]; render: (item: ProviderAlert) => string }) {
  return <ul>{items.slice(0, 5).map(item => <li key={item.provider_id}><Link href={`/admin/providers?id=${item.provider_id}`}>{item.name}</Link> · {render(item)}</li>)}</ul>;
}

// Güven radarı: müdahale gerektiren usta ve süreçleri tek bakışta gösterir.
export function TrustAlerts({ alerts }: { alerts: Alerts | null }) {
  if (!alerts) return <section className="commerce-panel trust-alerts" role="status"><h2><ShieldAlert size={20} aria-hidden /> Güven radarı</h2><p className="commerce-help">Güven alarmları şu anda doğrulanamadı. Veritabanı güncellemesi ve bağlantı kontrol edilmeli.</p></section>;
  const groups = [
    { key: "low", title: "Düşük puanlı ustalar", hint: "Ortalama 3,5 altı · en az 3 yorum", items: alerts.low_rated, render: (i: ProviderAlert) => `${Number(i.rating_avg).toLocaleString("tr-TR")} puan · ${i.review_count} yorum` },
    { key: "cancel", title: "Sık iptal", hint: "Son 30 günde 2+ iptal veya iade", items: alerts.frequent_cancellations, render: (i: ProviderAlert) => `${i.count} iptal` },
    { key: "late", title: "Geç varış", hint: "Son 30 günde 2+ kez 15 dk üstü gecikme", items: alerts.late_arrivals, render: (i: ProviderAlert) => `${i.count} geç varış` },
  ];
  const total = groups.reduce((sum, group) => sum + group.items.length, 0) + alerts.stale_disputes + alerts.stale_documents;
  return (
    <section className="commerce-panel trust-alerts" aria-labelledby="trust-alerts-title">
      <h2 id="trust-alerts-title">{total ? <AlertTriangle size={20} aria-hidden /> : <CheckCircle2 size={20} aria-hidden />} Güven radarı {total ? `· ${total} uyarı` : "· temiz"}</h2>
      <div className="trust-alert-grid">
        {groups.map(group => (
          <article key={group.key} className={group.items.length ? "has-alert" : undefined}>
            <strong>{group.title}</strong><small>{group.hint}</small>
            {group.items.length ? <ProviderList items={group.items} render={group.render} /> : <p>Uyarı yok</p>}
          </article>
        ))}
        <article className={alerts.stale_disputes ? "has-alert" : undefined}><strong>Bekleyen uyuşmazlık</strong><small>48 saatten uzun süredir yanıtsız</small><p>{alerts.stale_disputes ? <Link href="?view=disputes">{alerts.stale_disputes} uyuşmazlık</Link> : "Uyarı yok"}</p></article>
        <article className={alerts.stale_documents ? "has-alert" : undefined}><strong>Bekleyen belge</strong><small>48 saatten uzun süredir incelenmedi</small><p>{alerts.stale_documents ? <Link href="/admin/verifications">{alerts.stale_documents} belge</Link> : "Uyarı yok"}</p></article>
      </div>
    </section>
  );
}
