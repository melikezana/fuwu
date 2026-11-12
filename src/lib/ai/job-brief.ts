import type { AssistantAnalysis, AssistantCategory, RecommendedProvider } from "@/lib/ai/assistant-schema";

/**
 * Müşterinin kendi cümleleriyle anlattığı sorunu, ustanın tek bakışta anlayacağı kısa bir iş özetine çevirir.
 * Yapay zekâ çağrısı yapmaz: asistanın (ya da kural tabanlı yedeğin) ürettiği değerlendirmeyi yeniden düzenler.
 * Özet bir teşhis değildir; ustanın yerinde yapacağı incelemenin yerini tutmaz.
 */

export const assistantCategoryLabels: Record<AssistantCategory, string> = {
  cleaning: "Temizlik",
  electric: "Elektrik",
  furniture: "Mobilya Montajı",
  locksmith: "Çilingir",
  moving: "Nakliye",
  painting: "Boya Badana",
  plumbing: "Tesisat",
  pool_garden: "Havuz ve Bahçe Bakımı",
  renovation: "Ev Tadilatı",
  unknown: "Netleştirilecek",
  white_goods: "Beyaz Eşya",
};

const urgencyLabels: Record<AssistantAnalysis["urgency"], string> = {
  emergency: "Acil",
  high: "Yüksek · bugün bakılmalı",
  low: "Düşük · uygun bir zamanda",
  medium: "Orta · birkaç gün içinde",
};

export type JobBrief = {
  lines: { label: string; value: string }[];
  /** Panoya kopyalanan ya da destek mesajına eklenen düz metin. */
  text: string;
};

const clean = (value: string, max: number) => value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);

export function buildJobBrief(input: {
  analysis: AssistantAnalysis;
  customerMessages?: string[];
  district?: string | null;
  hasPhoto?: boolean;
}): JobBrief | null {
  const { analysis } = input;
  // Acil durumda randevu özeti hazırlanmaz: doğru yönlendirme acil hizmettir.
  if (analysis.urgency === "emergency" || !analysis.professionalNeeded || analysis.category === "unknown") return null;

  const said = (input.customerMessages ?? []).map(item => clean(item, 280)).filter(Boolean).slice(-3);
  const district = input.district ? clean(input.district, 60) : "";
  const lines: JobBrief["lines"] = [
    { label: "Hizmet", value: assistantCategoryLabels[analysis.category] },
    { label: "Olası sorun", value: analysis.likelyIssue },
    { label: "Öncelik", value: urgencyLabels[analysis.urgency] },
  ];
  if (district) lines.push({ label: "İlçe", value: district });
  if (said.length) lines.push({ label: "Müşterinin anlatımı", value: said.join(" · ") });
  lines.push({ label: "Fotoğraf", value: input.hasPhoto ? "Var" : "Yok" });
  if (analysis.followUpQuestions.length) lines.push({ label: "Netleşmesi gerekenler", value: analysis.followUpQuestions.join(" ") });

  return {
    lines,
    text: [
      "FUWU iş özeti (ilk değerlendirme, teşhis değildir)",
      ...lines.map(line => `${line.label}: ${line.value}`),
    ].join("\n"),
  };
}

/**
 * “Neden bu usta?” — karttaki gerçek verilerden türetilen kısa gerekçeler. Veri yoksa gerekçe uydurulmaz.
 */
export function explainProviderMatch(
  provider: RecommendedProvider,
  context: { category: AssistantCategory; district?: string | null; urgency?: AssistantAnalysis["urgency"] },
): string[] {
  const reasons: string[] = [];
  const normalize = (value: string) => value.toLocaleLowerCase("tr-TR").trim();
  const district = context.district ? normalize(context.district) : "";

  if (context.category !== "unknown") reasons.push(`${assistantCategoryLabels[context.category]} işi yapıyor`);
  if (typeof provider.distanceKm === "number" && provider.distanceKm > 0 && provider.distanceKm <= 5) reasons.push(`${provider.distanceKm.toFixed(1)} km uzağında`);
  else if (district && normalize(provider.district).includes(district)) reasons.push(`${provider.district} bölgesinde çalışıyor`);
  if (provider.verified) reasons.push("Doğrulanmış profil");
  if (typeof provider.rating === "number" && typeof provider.reviewCount === "number" && provider.reviewCount >= 3 && provider.rating >= 4.5) {
    reasons.push(`${provider.reviewCount} yorumda ${provider.rating.toFixed(1)} puan`);
  }
  if (context.urgency === "high" && provider.availability) reasons.push(`Müsaitlik: ${provider.availability}`);
  if (provider.responseTime) reasons.push(`Yanıt süresi: ${provider.responseTime}`);

  return reasons.slice(0, 3);
}
