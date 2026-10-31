import Link from "next/link";
import { AlertTriangle, ArrowUpRight, LockKeyhole } from "lucide-react";
import type { PrelaunchSnapshot } from "@/services/admin/prelaunch";
import { CapacityOverview } from "./CapacityOverview";

export function PrelaunchDashboard({ snapshot }: { snapshot: PrelaunchSnapshot | null }) {
  if (!snapshot) return <section className="commerce-panel control-unavailable" role="alert"><h2>Hazırlık verileri okunamadı.</h2><p>Bağlantı, şema veya yetkiler doğrulanamadı. Usta ve müşteri sayısı bilinmiyor.</p><Link className="commerce-secondary" href="/admin/marketplace?view=health">Sistem Sağlığını İncele</Link></section>;
  const { network, settings, readiness } = snapshot;
  const metrics = [
    { label: "Bekleyen gerçek başvuru", value: readiness?.pending_real_applications, href: "/admin/provider-applications?status=pending" },
    { label: "Yayın kararına hazır", value: readiness?.ready, href: "/admin/providers?filter=pending" },
    { label: "Yayındaki gerçek usta", value: network.published, href: "/admin/providers?filter=published" },
    { label: "Eksik profil ve mağaza", value: readiness?.incomplete, href: "/admin/providers?filter=incomplete" },
    { label: "Doğrulama gereken usta", value: readiness?.missing_verification, href: "/admin/providers?filter=verification" },
    { label: "İzinli müşteri ön kaydı", value: snapshot.interest, href: "/admin/interest" },
    { label: "Aktif kategoriler", value: snapshot.active_categories, href: "/admin/catalog" },
  ];
  return <div className="prelaunch-dashboard">
    <section aria-label="Pazaryeri özeti" className="control-overview-metrics">{metrics.map(metric => <Link href={metric.href} key={metric.label}><span>{metric.label}<ArrowUpRight size={18} aria-hidden /></span><strong>{metric.value === undefined ? "Bilinmiyor" : metric.value.toLocaleString("tr-TR")}</strong></Link>)}</section>
    {!readiness && <p className="commerce-notice" role="status">Hazırlık ölçümleri için güncel migration gerekiyor. Bilinmeyen değerler sıfır gösterilmez.</p>}
    <section className="control-system-notice" aria-labelledby="control-system-title"><AlertTriangle size={23} aria-hidden /><div><h2 id="control-system-title">Sistem ve güvenlik takibi</h2><p>{settings.launch_security_blockers || "Güncel güvenlik ve staging doğrulama kanıtlarını kontrol et."}</p><Link className="control-review-link" href="/admin/marketplace?view=health">Sistem Sağlığını İncele <ArrowUpRight size={16} aria-hidden /></Link></div></section>
    <Link className="commerce-secondary" href="/admin/verifications">Belge inceleme kuyruğunu aç</Link>
    <CapacityOverview rows={snapshot.capacity ?? snapshot.pilot} pilotOnly={!snapshot.capacity} />
    <details className="commerce-panel control-launch-details"><summary>Lansman hazırlığı ve kayıt kaynakları</summary>
      <p className="control-payment-closed"><LockKeyhole size={18} aria-hidden /> Canlı ödeme kapalı. Online satın alma henüz açılmadı.</p>
      <dl className="prelaunch-readiness"><div><dt>Şirketleşme · manuel durum</dt><dd>{settings.launch_company_status || "Durum girilmedi"}</dd></div><div><dt>Kaynağı incelenecek profil</dt><dd>{network.unclassified}</dd></div><div><dt>İnceleme kuyruğundaki tüm başvurular</dt><dd>{snapshot.pending_applications ?? "Bilinmiyor"}</dd></div>{[["Google OAuth", "launch_google_evidence"], ["Staging migration", "launch_migration_evidence"]].map(([label, key]) => <div key={key}><dt>{label}</dt><dd>{settings[key] ? `İncelenecek kanıt: ${settings[key]}` : "Test kanıtı girilmedi"}</dd></div>)}</dl>
      <p className="commerce-help">Test ve kaynağı doğrulanmamış profiller gerçek usta metriklerine katılmaz. Geri çekilen iletişim izinleri ön kayıt sayısına katılmaz. Manuel notlar bir testin geçtiğini göstermez.</p><Link className="commerce-secondary" href="/admin/settings">Hazırlık Notlarını Yönet</Link>
    </details>
  </div>;
}
