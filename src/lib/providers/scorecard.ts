// Usta güven karnesi: sunucudaki provider_quality_snapshot verisini anlaşılır göstergelere çevirir.
export type QualitySnapshot = {
  window_days: number; completed_count: number; cancelled_count: number; disputed_count: number;
  arrival_checked_count: number; on_time_count: number; rating_avg: number | null; review_count: number;
};
export type QualityTone = "good" | "watch" | "risk" | "empty";
export type QualityMetric = { id: string; label: string; value: string; detail: string; tone: QualityTone; tip?: string };

export function isQualitySnapshot(value: unknown): value is QualitySnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return ["completed_count", "cancelled_count", "disputed_count", "arrival_checked_count", "on_time_count", "review_count"].every(key => typeof v[key] === "number")
    && (v.rating_avg === null || typeof v.rating_avg === "number" || typeof v.rating_avg === "string");
}

const percent = (part: number, whole: number) => Math.round((part / whole) * 100);
const tone = (value: number, good: number, risk: number): QualityTone => value >= good ? "good" : value < risk ? "risk" : "watch";

export function qualityMetrics(s: QualitySnapshot): QualityMetric[] {
  const closed = s.completed_count + s.cancelled_count + s.disputed_count;
  const completion = closed ? percent(s.completed_count, closed) : null;
  const onTime = s.arrival_checked_count ? percent(s.on_time_count, s.arrival_checked_count) : null;
  const rating = s.rating_avg == null ? null : Number(s.rating_avg);
  return [
    completion == null
      ? { id: "completion", label: "Tamamlama oranı", value: "Henüz veri yok", detail: "İlk işlerin tamamlandıkça hesaplanır.", tone: "empty" }
      : { id: "completion", label: "Tamamlama oranı", value: `%${completion}`, detail: `${s.completed_count} tamamlanan · ${s.cancelled_count} iptal`, tone: tone(completion, 90, 75), tip: completion < 90 ? "Takvimini yalnızca kesin müsait olduğun saatlere aç; iptaller güven karneni düşürür." : undefined },
    onTime == null
      ? { id: "on_time", label: "Zamanında varış", value: "Henüz veri yok", detail: "Varış kodu doğrulandıkça hesaplanır.", tone: "empty" }
      : { id: "on_time", label: "Zamanında varış", value: `%${onTime}`, detail: `${s.on_time_count}/${s.arrival_checked_count} randevuda 15 dakika içinde`, tone: tone(onTime, 90, 70), tip: onTime < 90 ? "Yola çıkınca durumunu güncelle; gecikeceksen müşteriye önceden yaz." : undefined },
    rating == null || !s.review_count
      ? { id: "rating", label: "Müşteri puanı", value: "Henüz yorum yok", detail: "Yorumu yalnızca hizmeti tamamlanan müşteri yazar.", tone: "empty" }
      : { id: "rating", label: "Müşteri puanı", value: rating.toLocaleString("tr-TR", { maximumFractionDigits: 1, minimumFractionDigits: 1 }), detail: `${s.review_count} değerlendirme`, tone: tone(rating, 4.5, 3.5), tip: rating < 4.5 ? "İş bitince kapsamı müşteriyle birlikte kontrol et, teslim kodunu sonra iste." : undefined },
    { id: "disputes", label: "Açık uyuşmazlık", value: String(s.disputed_count), detail: s.disputed_count ? "Sipariş ekranından yanıtla." : "Sorun bildirimi yok.", tone: s.disputed_count ? "risk" : "good" },
  ];
}
