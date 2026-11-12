import type { Metadata } from "next";
import { CheckCircle2, CircleDashed, HelpCircle } from "lucide-react";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminPageShell } from "@/components/admin/AdminUI";
import { UnitEconomicsCalculator } from "@/components/admin/UnitEconomicsCalculator";
import { buildInvestorFacts, buildLaunchMilestones } from "@/lib/admin/investor-view";
import { getAdminAccess } from "@/services/admin";
import { getWeeklyLaunchMetrics } from "@/services/admin/launch-metrics";
import { getPrelaunchSnapshot } from "@/services/admin/prelaunch";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Yatırımcı Görünümü", description: "FUWU'nun gerçek durumu, lansman adımları ve gelir modeli.", robots: { index: false, follow: false } };

const weekLabel = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "UTC" });
const percent = (value: string | undefined, fallback: string) => (value && /^\d{1,3}(?:[.,]\d{1,2})?$/.test(value.trim()) ? value.trim() : fallback);

export default async function InvestorPage() {
  const access = await getAdminAccess();
  if (!access.ok) return <AdminAccessGate access={access} />;
  const [snapshot, weekly] = await Promise.all([getPrelaunchSnapshot(), getWeeklyLaunchMetrics(8)]);
  const facts = buildInvestorFacts(snapshot, weekly);
  const milestones = buildLaunchMilestones(snapshot);
  const today = new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });

  return (
    <AdminAccessGate access={access}>
      <AdminPageShell active="investor" title="Yatırımcı Görünümü" description="Görüşmede ekranı paylaşabileceğin tek sayfa: gerçek sayılar, lansmana kalan adımlar ve gelir modeli.">
        <div className="investor-view">
          <section className="commerce-panel" aria-labelledby="investor-stage-title">
            <p className="commerce-eyebrow">{today} · İSTANBUL</p>
            <h2 id="investor-stage-title">Aşama: ön lansman. Ürün hazır, gerçek satış henüz açılmadı.</h2>
            <p className="commerce-help">FUWU, kapsamı ve fiyatı baştan belli ev hizmetlerini doğrulanmış ustalarla buluşturan bir pazaryeridir. Aşağıdaki sayılar yalnızca gerçek kayıtlardan gelir; deneme ve kaynağı doğrulanmamış kayıtlar sayılmaz, okunamayan değer sıfır yerine “Bilinmiyor” görünür.</p>
          </section>

          <section aria-labelledby="investor-facts-title">
            <h2 id="investor-facts-title" className="investor-heading">Bugünkü gerçek durum</h2>
            <dl className="investor-facts">
              {facts.map(fact => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value === null ? "Bilinmiyor" : fact.value.toLocaleString("tr-TR")}</dd>
                  {fact.note && <p>{fact.note}</p>}
                </div>
              ))}
            </dl>
            {(!snapshot || !weekly) && <p className="commerce-notice" role="status">Bazı ölçümler okunamadı. Güncel migration üretime uygulanmamış olabilir.</p>}
          </section>

          {weekly && (
            <section className="commerce-panel" aria-labelledby="investor-weekly-title">
              <h2 id="investor-weekly-title">Haftalık hareket · son {weekly.weeks.length} hafta</h2>
              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Haftalık hareket tablosu">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead><tr><th scope="col" className="py-2 pr-3">Hafta</th><th scope="col" className="py-2 pr-3">Usta başvurusu</th><th scope="col" className="py-2 pr-3">Yayına onaylanan</th><th scope="col" className="py-2 pr-3">İzinli ön kayıt</th><th scope="col" className="py-2 pr-3">Sipariş</th></tr></thead>
                  <tbody>{weekly.weeks.map(week => <tr key={week.week_start}><th scope="row" className="py-2 pr-3 font-semibold">{weekLabel(week.week_start)}</th><td className="py-2 pr-3 tabular-nums">{week.applications_received}</td><td className="py-2 pr-3 tabular-nums">{week.providers_approved}</td><td className="py-2 pr-3 tabular-nums">{week.interest_granted}</td><td className="py-2 pr-3 tabular-nums">{week.orders_created}</td></tr>)}</tbody>
                </table>
              </div>
            </section>
          )}

          <section className="commerce-panel" aria-labelledby="investor-milestones-title">
            <h2 id="investor-milestones-title">Lansmana kalan adımlar</h2>
            <ol className="investor-milestones">
              {milestones.map(item => {
                const Icon = item.done === null ? HelpCircle : item.done ? CheckCircle2 : CircleDashed;
                return (
                  <li key={item.title} data-state={item.done === null ? "unknown" : item.done ? "done" : "open"}>
                    <Icon aria-hidden size={22} />
                    <div><strong>{item.title} · {item.done === null ? "Bilinmiyor" : item.done ? "Tamam" : "Açık"}</strong><p>{item.detail}</p></div>
                  </li>
                );
              })}
            </ol>
          </section>

          <UnitEconomicsCalculator commissionPercent={percent(snapshot?.settings.commission_rate, "10")} customerFeePercent={percent(snapshot?.settings.customer_fee_rate, "0")} />
        </div>
      </AdminPageShell>
    </AdminAccessGate>
  );
}
