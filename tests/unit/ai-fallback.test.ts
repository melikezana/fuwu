import { describe, expect, it } from "vitest";
import { buildFallbackAnalysis, detectCategory, hasEmergencySignal } from "@/lib/ai/fallback-analysis";
import { parseAssistantAnalysis } from "@/lib/ai/assistant-schema";
import { recommendServices } from "@/lib/ai/service-recommendations";

describe("AI fallback analysis", () => {
  it("detects categories from everyday Turkish, with or without diacritics", () => {
    expect(detectCategory("Mutfaktaki musluk damlatıyor")).toBe("plumbing");
    expect(detectCategory("salondaki priz kivilcim cikariyor")).toBe("electric");
    expect(detectCategory("Klima soğutmuyor")).toBe("white_goods");
    expect(detectCategory("kapıda kaldım anahtar içeride")).toBe("locksmith");
    expect(detectCategory("merhaba")).toBe("unknown");
  });

  it("prioritizes the requested service over overlapping generic keywords", () => {
    expect(detectCategory("Klima içinden su damlatıyor bakım lazım")).toBe("white_goods");
    expect(detectCategory("Tavanda nem lekesi var boya döküldü")).toBe("painting");
    expect(detectCategory("Televizyonu duvara astırmak istiyorum")).toBe("furniture");
    expect(detectCategory("Bir koltuk takımını başka adrese taşıtacağım")).toBe("moving");
  });

  it("does not confuse nearby cleaning or plumbing requests with those intents", () => {
    expect(detectCategory("Koltuk yıkama hizmeti arıyorum")).toBe("cleaning");
    expect(detectCategory("Taşınma sonrası boş ev temizliği")).toBe("cleaning");
    expect(detectCategory("Banyo gideri tıkandı su gitmiyor")).toBe("plumbing");
    expect(detectCategory("Klima soğutmuyor")).toBe("white_goods");
  });

  it("always escalates emergencies and never recommends a booking for them", () => {
    expect(hasEmergencySignal("Evde DOĞALGAZ KOKUSU var")).toBe(true);
    const analysis = buildFallbackAnalysis({ message: "Banyoda su baskını oldu, prizlere yaklaşıyor" });
    expect(analysis.urgency).toBe("emergency");
    expect(analysis.providerSearchRecommended).toBe(false);
    expect(analysis.emergencyMessage).toMatch(/112/);
  });

  it("produces output that satisfies the strict assistant schema", () => {
    for (const message of ["Lavabo tıkandı", "duvar boyası döküldü", "ne yapacağımı bilmiyorum"]) {
      expect(parseAssistantAnalysis(buildFallbackAnalysis({ message }))).not.toBeNull();
    }
  });
});

describe("service recommendations", () => {
  const catalog = {
    categories: [{ id: "c1", name: "Tesisat", slug: "tesisat" }, { id: "c2", name: "Temizlik", slug: "temizlik" }],
    services: [
      { id: "s1", category_id: "c1", slug: "musluk-montaji", name: "Musluk montajı", description: "d", scope: "", exclusions: "", image_url: "", pricing_type: "FIXED_PRICE" as const, is_active: true },
      { id: "s2", category_id: "c1", slug: "gider-acma", name: "Gider açma", description: "d", scope: "", exclusions: "", image_url: "", pricing_type: "FIXED_PRICE" as const, is_active: false },
      { id: "s3", category_id: "c2", slug: "ev-temizligi", name: "Ev temizliği", description: "d", scope: "", exclusions: "", image_url: "", pricing_type: "FIXED_PRICE" as const, is_active: true },
    ],
    offers: [{ id: "o1", provider_id: "p1", service_id: "s1", variant_id: null, price_minor: 90000, customer_price_minor: 95000, duration_minutes: 60, district_ids: [], variant_name: null, provider_name: "Usta", profile_image_url: null, rating: null, review_count: 0 }],
  };

  it("returns only active services in the matched category with the lowest customer price", () => {
    const result = recommendServices("plumbing", catalog);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ href: "/services/musluk-montaji", startingPriceMinor: 95000, offerCount: 1 });
  });

  it("returns nothing for unknown category", () => {
    expect(recommendServices("unknown", catalog)).toEqual([]);
  });
});
