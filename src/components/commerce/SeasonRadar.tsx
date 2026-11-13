import { Radar } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { kindFromCategorySlug } from "@/lib/jobs/job-kit";
import { seasonSignals, type SeasonSignal } from "@/lib/jobs/season-signals";

/**
 * Usta: Mevsim Radarı. Müşterilerin ev bakım takviminde gördüğü hatırlatmaların ustanın
 * kategorisine düşenlerini önceden gösterir; usta takvimini ve paketlerini talep gelmeden hazırlar.
 * Talep tahmini değildir (gerçek sipariş verisi yok); müşteriye gösterilen rehberin aynısıdır.
 */
export async function SeasonRadar({ providerId, now = new Date() }: { providerId: string; now?: Date }) {
  const db = await createSupabaseServerClient();
  if (!db) return null;
  const provider = await db.from("providers").select("category_id").eq("id", providerId).maybeSingle().then(r => r, () => ({ data: null, error: true }));
  const categoryId = !provider.error && provider.data ? (provider.data as { category_id: string | null }).category_id : null;
  if (!categoryId) return null;
  const category = await db.from("service_categories").select("slug").eq("id", categoryId).maybeSingle().then(r => r, () => ({ data: null, error: true }));
  const slug = !category.error && category.data ? (category.data as { slug: string }).slug : null;
  return <SeasonRadarView signals={seasonSignals([kindFromCategorySlug(slug)], now)} />;
}

/** Sunum: veri okumadan Mevsim Radarı'nı çizer. */
export function SeasonRadarView({ signals }: { signals: SeasonSignal[] }) {
  if (!signals.length) return null;
  return (
    <section className="commerce-panel season-radar" aria-labelledby="season-radar-title">
      <h2 id="season-radar-title"><Radar aria-hidden size={22} /> Mevsim radarın</h2>
      <p className="commerce-help">Müşterilerin ev bakım takviminde bu dönemde şu hatırlatmaları görüyor. Talep gelmeden takvimini aç ve paket kapsamını bu işlere göre netleştir.</p>
      <ul>
        {signals.map(signal => (
          <li key={`${signal.month}-${signal.title}`}>
            <span className={signal.upcoming ? "radar-chip is-upcoming" : "radar-chip"}>{signal.upcoming ? signal.month : `Bu ay · ${signal.month}`}</span>
            <strong>{signal.title}</strong>
            <small>{signal.why}</small>
          </li>
        ))}
      </ul>
      <p className="commerce-help">Bu bir talep tahmini değildir; FUWU&apos;nun müşterilere gösterdiği mevsimsel rehberdir.</p>
    </section>
  );
}
