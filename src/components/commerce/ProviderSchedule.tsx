import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Availability } from "@/lib/commerce/types";

const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
export async function ProviderSchedule({ providerId }: { providerId: string }) {
  const db = await createSupabaseServerClient();
  const result = db ? await db.rpc("commerce_public_schedule", { p_provider_id: providerId }) : null;
  const hours = (result?.data ?? []) as unknown as Availability[];
  return <div className="mt-4"><h3 className="font-semibold">Haftalık çalışma takvimi</h3>{result?.error || !db ? <p role="status" className="commerce-notice">Çalışma takvimine şu anda ulaşılamıyor.</p> : hours.length ? <dl className="fusion-health">{hours.map(h => <div key={h.weekday}><dt>{days[h.weekday]}</dt><dd>{h.starts_at.slice(0, 5)}–{h.ends_at.slice(0, 5)}</dd></div>)}</dl> : <p className="market-help-text">Usta henüz satış takvimi tanımlamadı.</p>}<p className="market-help-text">Saatler Türkiye saatidir. İzinler, hizmet süresi ve mevcut rezervasyonlar gün/saat seçimi sırasında hesaba katılır.</p></div>;
}
