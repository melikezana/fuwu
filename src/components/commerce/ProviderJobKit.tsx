import { Briefcase, MessageCircleQuestion, ShieldCheck } from "lucide-react";
import { jobLabel, providerKit, type JobKind } from "@/lib/jobs/job-kit";

/**
 * Usta: yola çıkmadan önce "çantana koy" listesi, kapıda sorulacaklar ve güvenlik notları.
 * Amaç ikinci gelişi ve "malzeme almaya gittim" beklemesini önlemek. Statik rehberdir.
 */
export function ProviderJobKit({ kind }: { kind: JobKind }) {
  const kit = providerKit(kind);
  return (
    <section className="commerce-panel provider-job-kit" aria-labelledby="job-kit-title">
      <h2 id="job-kit-title"><Briefcase aria-hidden size={22} /> Yola çıkmadan · {jobLabel(kind)}</h2>
      <p className="commerce-help">Bu iş için önerilen hazırlık. İkinci geliş, müşterinin güvenini ve senin gününü en çok yoran şeydir.</p>
      <div className="job-kit-grid">
        <div>
          <h3>Çantana koy</h3>
          <ul>{kit.bring.map(item => <li key={item}>{item}</li>)}</ul>
        </div>
        <div>
          <h3><MessageCircleQuestion aria-hidden size={17} /> Kapıda sor</h3>
          <ul>{kit.askAtDoor.map(item => <li key={item}>{item}</li>)}</ul>
        </div>
        <div>
          <h3><ShieldCheck aria-hidden size={17} /> Güvenlik ve kapsam</h3>
          <ul>{kit.safety.map(item => <li key={item}>{item}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}
