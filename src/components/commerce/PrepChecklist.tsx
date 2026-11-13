"use client";
import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { customerPrep, jobLabel, prepProgress, type JobKind } from "@/lib/jobs/job-kit";

const storageKey = (orderId: string) => `fuwu:prep:${orderId}`;

function readDone(orderId: string): string[] {
  try {
    const raw = window.localStorage.getItem(storageKey(orderId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string").slice(0, 50) : [];
  } catch { return []; }
}

/**
 * Müşteri: "Usta gelmeden önce" hazırlık listesi. İşaretler yalnızca bu tarayıcıda tutulur
 * (sunucuya gitmez); depolama kapalıysa liste yine çalışır, yalnızca hatırlanmaz.
 */
export function PrepChecklist({ orderId, kind }: { orderId: string; kind: JobKind }) {
  const items = useMemo(() => customerPrep(kind), [kind]);
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => { const t = setTimeout(() => setDone(readDone(orderId)), 0); return () => clearTimeout(t); }, [orderId]);
  const progress = prepProgress(items, done);

  function toggle(id: string) {
    setDone(current => {
      const next = current.includes(id) ? current.filter(value => value !== id) : [...current, id];
      try { window.localStorage.setItem(storageKey(orderId), JSON.stringify(next)); } catch { /* Depolama kapalı: yalnızca bu oturumda tutulur. */ }
      return next;
    });
  }

  return (
    <section className="commerce-panel prep-checklist" aria-labelledby={`prep-${orderId}`}>
      <h2 id={`prep-${orderId}`}><ClipboardCheck aria-hidden size={22} /> Usta gelmeden önce</h2>
      <p className="commerce-help">{jobLabel(kind)} işi için kısa bir hazırlık, ödediğin sürenin işe gitmesini sağlar ve kapıda sürpriz çıkmasını önler.</p>
      <div className="prep-meter" role="progressbar" aria-label="Hazırlık durumu" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <p className="prep-meter-label" aria-live="polite">{progress === 100 ? "Her şey hazır. Usta geldiğinde doğrudan işe başlayabilir." : `Hazırlık %${progress}`}</p>
      <ul>
        {items.map(item => {
          const checked = done.includes(item.id);
          return (
            <li key={item.id} className={checked ? "is-done" : undefined}>
              <label>
                <input type="checkbox" checked={checked} onChange={() => toggle(item.id)} />
                <span><strong>{item.title}</strong><small>{item.why}</small></span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="commerce-help">İşaretlerin yalnızca bu cihazda saklanır.</p>
    </section>
  );
}
