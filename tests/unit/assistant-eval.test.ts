import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { scoreEvaluation, type EvalCase } from "@/lib/ai/evaluation";
import { buildFallbackAnalysis, hasEmergencySignal } from "@/lib/ai/fallback-analysis";
import { recommendServices } from "@/lib/ai/service-recommendations";

const { cases } = JSON.parse(fs.readFileSync("evals/assistant-cases.json", "utf8")) as { cases: EvalCase[] };
const score = scoreEvaluation(cases.map(item => ({ case: item, predicted: buildFallbackAnalysis({ message: item.text }) })));

describe("asistan değerlendirme kümesi · kural tabanlı yedek", () => {
  it("kümedeki hiçbir acil durumu kaçırmaz", () => {
    expect(score.emergencyTotal).toBeGreaterThanOrEqual(12);
    expect(score.emergencyMissed).toEqual([]);
  });

  it("acil olmayan talebi acil diye işaretlemez", () => {
    expect(score.emergencyFalseAlarms).toBe(0);
    for (const text of ["Şofben alev almıyor", "Kurutma makinesi hata kodu veriyor", "Çocuk odasının kapısı kilitli kaldı", "Lamba yanıyor ama cızırtı var", "Su basıncı düşük"]) expect(hasEmergencySignal(text)).toBe(false);
  });

  it("kategori doğruluğu ölçülen tabanın altına düşmez", () => {
    // 12 Kasım 2026 ölçümü: 58/62. Taban, gerileme olursa testin kırılması içindir; hedef değildir.
    expect(score.categoryTotal).toBe(62);
    expect(score.categoryCorrect).toBeGreaterThanOrEqual(58);
  });

  it("yanıt alınamayan soruyu doğru saymaz", () => {
    const partial = scoreEvaluation([{ case: cases[0], predicted: null }, { case: cases[1], predicted: { category: cases[1].category!, urgency: "medium" } }]);
    expect(partial).toMatchObject({ failed: 1, total: 2, categoryTotal: 1, categoryCorrect: 1 });
  });
});

describe("hizmet ve usta paketi karşılaştırması", () => {
  const catalog = {
    categories: [{ id: "c1", slug: "tesisat", name: "Tesisat" }] as never,
    services: [{ id: "s1", category_id: "c1", slug: "musluk-montaji", name: "Musluk montajı", description: "d", scope: "Tek musluğun   sökülmesi ve takılması.", exclusions: "Musluk bedeli dahil değildir.", image_url: "", pricing_type: "FIXED_PRICE" as const, is_active: true }],
    offers: [
      { id: "o1", provider_id: "p1", service_id: "s1", variant_id: null, price_minor: 120000, customer_price_minor: 126000, duration_minutes: 90, district_ids: [], variant_name: null, provider_name: "Usta A", profile_image_url: null, rating: 4.9, review_count: 7 },
      { id: "o2", provider_id: "p2", service_id: "s1", variant_id: "v1", price_minor: 90000, customer_price_minor: 94500, duration_minutes: 60, district_ids: [], variant_name: "Tek musluk", provider_name: "Usta B", profile_image_url: null, rating: 5, review_count: 0 },
    ],
  };

  it("dahil olanları, olmayanları ve paketleri müşteri fiyatına göre sıralı verir", () => {
    const [service] = recommendServices("plumbing", catalog);
    expect(service.scope).toBe("Tek musluğun sökülmesi ve takılması.");
    expect(service.exclusions).toBe("Musluk bedeli dahil değildir.");
    expect(service.offers?.map(offer => [offer.providerName, offer.priceMinor])).toEqual([["Usta B", 94500], ["Usta A", 126000]]);
    expect(service.offers?.[0].href).toBe("/services/musluk-montaji?provider=p2&variant=v1");
  });

  it("yorumu olmayan ustaya puan göstermez", () => {
    const [service] = recommendServices("plumbing", catalog);
    expect(service.offers?.[0]).toMatchObject({ rating: null, reviewCount: 0 });
    expect(service.offers?.[1]).toMatchObject({ rating: 4.9, reviewCount: 7 });
  });
});
