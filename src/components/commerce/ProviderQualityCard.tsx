import { Gauge, Info } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isQualitySnapshot, qualityMetrics } from "@/lib/providers/scorecard";

const toneLabels = { good: "İyi", watch: "Dikkat", risk: "Geliştir", empty: "Yeni" } as const;

// Ustaya kendi güven karnesini gösterir. Platform kaliteyi bu göstergelerle izler; sürpriz yoktur.
export async function ProviderQualityCard({ providerId }: { providerId: string }) {
  const db = await createSupabaseServerClient();
  const result = db ? await db.rpc("provider_quality_snapshot" as never, { p_provider_id: providerId } as never).then(r => r, () => ({ data: null, error: true })) : { data: null, error: true };
  const snapshot = result.error ? null : (result.data as unknown);
  if (!isQualitySnapshot(snapshot)) return null;
  const metrics = qualityMetrics(snapshot);
  const tips = metrics.map(metric => metric.tip).filter(Boolean);
  return (
    <section aria-labelledby="quality-title" className="commerce-panel quality-card">
      <div className="quality-head">
        <Gauge aria-hidden size={22} />
        <div>
          <h2 id="quality-title">Güven karnen</h2>
          <p className="commerce-help">Son {snapshot.window_days} gün. Bu karne yalnızca sana ve FUWU ekibine görünür; kaliteyi aynı göstergelerle izleriz.</p>
        </div>
      </div>
      <ul className="quality-grid">
        {metrics.map(metric => (
          <li className={`quality-${metric.tone}`} key={metric.id}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.detail}</small>
            <em>{toneLabels[metric.tone]}</em>
          </li>
        ))}
      </ul>
      {tips.length > 0 && <div className="quality-tips"><Info aria-hidden size={18} /><ul>{tips.map(tip => <li key={tip}>{tip}</li>)}</ul></div>}
    </section>
  );
}
