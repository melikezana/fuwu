import Link from "next/link";
import { AlertTriangle, CheckCircle2, CircleDashed, Info, XCircle } from "lucide-react";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminPageShell } from "@/components/admin/AdminUI";
import { getAdminAccess } from "@/services/admin";
import { getServerAuthContext } from "@/services/auth/server";
import { authChecks, contentChecks, environmentChecks, readAuthSettings, supabaseDashboardUrl, type SetupGroup, type SetupStatus } from "@/services/admin/setup-status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kurulum Durumu", robots: { index: false, follow: false } };

const groups: [SetupGroup, string, string][] = [
  ["altyapi", "Altyapı ve anahtarlar", "Vercel › Settings › Environment Variables. Değerler gösterilmez; yalnızca tanımlı olup olmadığı."],
  ["giris", "Giriş ve doğrulama", "Supabase › Authentication ayarları."],
  ["veritabani", "Veritabanı", "Canlı veritabanının güncelliği."],
  ["icerik", "Katalog, ustalar ve belgeler", "Müşterinin satın alabilmesi için gerekenler."],
];
const icons = { ok: CheckCircle2, warn: AlertTriangle, fail: XCircle, info: Info, manual: CircleDashed } satisfies Record<SetupStatus, unknown>;
const labels: Record<SetupStatus, string> = { ok: "Hazır", warn: "Dikkat", fail: "Eksik", info: "Bilgi", manual: "Panelden kontrol et" };

export default async function SetupPage() {
  const access = await getAdminAccess();
  if (!access.ok) return <AdminAccessGate access={access} />;
  const env = process.env as Record<string, string | undefined>;
  const { supabase } = await getServerAuthContext();
  const [settings, content] = await Promise.all([
    readAuthSettings(env),
    supabase ? contentChecks(supabase).catch(() => []) : Promise.resolve([]),
  ]);
  const checks = [...environmentChecks(env), ...authChecks(settings, supabaseDashboardUrl(env)), ...content];
  const count = (status: SetupStatus) => checks.filter(check => check.status === status).length;
  const failures = count("fail"), warnings = count("warn");

  return <AdminAccessGate access={access}><AdminPageShell active="setup" title="Kurulum Durumu" description="Açılış için gereken ayarlar ve içerik tek ekranda. Gizli anahtarlar gösterilmez.">
    <section className={`commerce-panel setup-summary ${failures ? "is-fail" : warnings ? "is-warn" : "is-ok"}`} role="status">
      <h2>{failures ? `Açılış öncesi ${failures} kritik eksik var` : warnings ? "Kritik eksik yok; dikkat edilecekler var" : "Her şey hazır"}</h2>
      <p>{count("ok")} hazır · {warnings} dikkat · {failures} eksik · {count("manual")} panelden kontrol</p>
    </section>
    {groups.map(([group, title, hint]) => {
      const items = checks.filter(check => check.group === group);
      if (!items.length) return null;
      return <section className="commerce-panel setup-group" key={group}>
        <h2>{title}</h2>
        <p className="commerce-help">{hint}</p>
        <ul className="setup-list">{items.map(item => {
          const Icon = icons[item.status];
          return <li key={item.id} className={`setup-item is-${item.status}`}>
            <Icon size={20} aria-hidden />
            <div>
              <p className="setup-title"><strong>{item.title}</strong><span className="setup-badge">{labels[item.status]}</span></p>
              <p>{item.detail}</p>
              {item.action && <p className="setup-action">{item.href
                ? item.href.startsWith("/") ? <Link href={item.href}>{item.action}</Link> : <a href={item.href} target="_blank" rel="noopener noreferrer">{item.action}</a>
                : item.action}</p>}
            </div>
          </li>;
        })}</ul>
      </section>;
    })}
    <p className="commerce-help">Vercel&apos;de ayar değiştirdikten sonra yeniden deploy et ve bu sayfayı yenile.</p>
  </AdminPageShell></AdminAccessGate>;
}
