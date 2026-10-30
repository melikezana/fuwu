import Link from "next/link";
import { appointment } from "@/lib/commerce/display";
import { evidenceState, probeLabels, type OperationsHealth as Health } from "@/lib/commerce/operations-health";
import { checkOperationsHealth } from "@/app/admin/marketplace/health-actions";

export function OperationsHealth({ health, reconciliationCount, configured, now }: { now: number; health: Health | null; reconciliationCount: number | null; configured: { service: boolean; payment: boolean; cron: boolean } }) {
  return <section className="commerce-panel">
    <h2>Sistem sağlığı ve kontrol kanıtları</h2>
    <p className="commerce-help">Sonuçlar son çalıştırılan kontrolü gösterir. Anahtar tanımı ve servis erişimi ayrı izlenir.</p>
    <dl className="fusion-health">
      {Object.entries(probeLabels).map(([name, label]) => {
        const evidence = health?.probes.find(probe => probe.name === name);
        return <div key={name}><dt>{label}</dt><dd>
          {evidenceState(evidence, now, name === "cron" ? 26 : 24)}
          <p className="commerce-help">{evidence?.detail || "Henüz kayıtlı bir gerçek kontrol yok."}</p>
          <p className="commerce-help">Son kontrol: {evidence ? appointment(evidence.checked_at) : "Yok"}<br />Son başarı: {evidence?.last_success_at ? appointment(evidence.last_success_at) : "Yok"}</p>
        </dd></div>;
      })}
      <div><dt>Şu anki schema / RLS sözleşmesi</dt><dd>
        {!health ? "Doğrulanamadı" : health.contract_ok ? "Kontrol geçti" : "Eksik sözleşme var"}
        <p className="commerce-help">{health ? `Kontrol: ${appointment(health.checked_at)}. Migration geçmişi ve staging testinin yerine geçmez.` : "Migration ve admin RPC erişimini kontrol et."}</p>
        {health && !health.contract_ok && <p role="alert">{health.missing_contracts.join(", ")}</p>}
      </dd></div>
      <div><dt>Mutabakat bekleyen</dt><dd>{reconciliationCount ?? "Doğrulanamadı"}<br /><Link className="commerce-text-link" href="?view=reconciliation">Kuyruğu Aç →</Link></dd></div>
      <div><dt>Son audit olayı</dt><dd>{health?.audit_last_event_at ? appointment(health.audit_last_event_at) : "Kanıt yok"}</dd></div>
    </dl>
    <details className="fusion-legacy"><summary>Sunucu yapılandırması</summary><dl className="fusion-health">{[["Supabase sunucu yetkisi", configured.service], ["iyzico sandbox anahtarları", configured.payment], ["Cron anahtarı", configured.cron]].map(([label, present]) => <div key={String(label)}><dt>{label}</dt><dd>{present ? "Tanımlı · çalıştığı doğrulanmadı" : "Eksik"}</dd></div>)}</dl></details>
    <form action={checkOperationsHealth}><button className="commerce-button" disabled={!configured.service}>Gerçek Kontrolleri Çalıştır</button></form>
    <p className="commerce-help">Bağlantı ve schema/RLS kontrolü, gerçek Google girişi veya uçtan uca ödeme testi değildir. Canlı ödeme kapalı kalır.</p>
    <Link className="commerce-text-link" href="/admin/audit">Denetim Kayıtları →</Link>
  </section>;
}
