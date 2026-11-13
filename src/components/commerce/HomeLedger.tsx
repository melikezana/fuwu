import Link from "next/link";
import { BookHeart, RotateCcw } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildHomeLedger, type LedgerEntry, type LedgerOrder } from "@/lib/jobs/job-kit";

const monthYear = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "Europe/Istanbul" });
const ago = (months: number) => months === 0 ? "bu ay" : months < 12 ? `${months} ay önce` : `${Math.floor(months / 12)} yıl${months % 12 ? ` ${months % 12} ay` : ""} önce`;

/**
 * Ev Karnesi — evinde FUWU ile yapılan işlerin dijital geçmişi. Her iş türü için son yapılan iş,
 * kimin yaptığı, ne kadar zaman geçtiği ve (düzenli bakım gerektiren işlerde) bir sonraki öneri.
 * Yalnızca müşterinin kendi tamamlanmış siparişlerini okur (RLS). Okunamazsa ya da kayıt yoksa
 * hiç görünmez; panelin geri kalanı etkilenmez.
 */
export async function HomeLedger({ userId, now = new Date() }: { userId: string; now?: Date }) {
  const db = await createSupabaseServerClient();
  if (!db) return null;
  const result = await db.from("commerce_orders")
    .select("id,service_name,variant_name,scope,provider_id,provider_name,starts_at")
    .eq("customer_id", userId).eq("status", "COMPLETED")
    .order("starts_at", { ascending: false }).limit(100)
    .then(r => r, () => ({ data: null, error: true }));
  if (result.error || !result.data?.length) return null;
  return <HomeLedgerView entries={buildHomeLedger(result.data as LedgerOrder[], now)} />;
}

/** Sunum: veri okumadan Ev Karnesi'ni çizer (önizleme ve test için ayrı). */
export function HomeLedgerView({ entries }: { entries: LedgerEntry[] }) {
  if (!entries.length) return null;
  const dueCount = entries.filter(entry => entry.due).length;
  return (
    <section className="commerce-panel home-ledger" aria-labelledby="home-ledger-title">
      <h2 id="home-ledger-title"><BookHeart aria-hidden size={22} /> Ev Karnen</h2>
      <p className="commerce-help">Evinde yapılan işlerin geçmişi tek yerde. {dueCount ? `${dueCount} iş için bakım zamanı gelmiş olabilir.` : "Şu an zamanı gelen bir bakım görünmüyor."}</p>
      <ol>
        {entries.map(entry => (
          <li key={entry.kind} className={entry.due ? "is-due" : undefined}>
            <div className="ledger-head">
              <strong>{entry.label}</strong>
              {entry.due && <span className="ledger-badge">Zamanı geldi</span>}
            </div>
            <p>{entry.last.service_name}{entry.last.variant_name ? ` · ${entry.last.variant_name}` : ""} — <Link href={`/providers/${entry.last.provider_id}`}>{entry.last.provider_name}</Link></p>
            <p className="ledger-meta">
              Son iş: {monthYear.format(new Date(entry.last.starts_at))} ({ago(entry.monthsSince)}){entry.count > 1 ? ` · toplam ${entry.count} kez` : ""}
              {entry.suggestedAt && !entry.due ? ` · Önerilen sonraki bakım: ${monthYear.format(new Date(entry.suggestedAt))}` : ""}
            </p>
            <Link className="ledger-action" href={`/providers/${entry.last.provider_id}`}><RotateCcw aria-hidden size={16} /> Aynı ustadan yeniden al</Link>
          </li>
        ))}
      </ol>
      <p className="commerce-help">Bakım önerileri genel rehberdir; cihazının ya da evinin durumuna göre değişebilir.</p>
    </section>
  );
}
