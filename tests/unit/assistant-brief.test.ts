import { describe, expect, it } from "vitest";
import { buildJobBrief, explainProviderMatch } from "@/lib/ai/job-brief";
import type { AssistantAnalysis, RecommendedProvider } from "@/lib/ai/assistant-schema";

const analysis: AssistantAnalysis = {
  summary: "Musluk altından sızıntı olabilir.", likelyIssue: "Lavabo altı bağlantıda sızıntı", category: "plumbing", urgency: "medium", confidence: 0.6,
  safeFirstSteps: [], avoidDoing: [], professionalNeeded: true, emergencyMessage: null, followUpQuestions: ["Sızıntı ne zamandır var?"], providerSearchRecommended: true,
};
const provider: RecommendedProvider = {
  id: "p1", name: "Deneme Usta", category: "Tesisat", district: "Kadıköy", rating: 4.8, reviewCount: 12, verified: true, availability: "müsait",
  responseTime: "30 dk içinde", startingPrice: null, distanceKm: null, profileImageUrl: null, profileHref: "/providers/p1", bookingHref: "/providers/p1",
};

describe("usta dilinde iş özeti", () => {
  it("müşterinin anlatımını, ilçeyi ve netleşmesi gerekenleri tek özette toplar", () => {
    const brief = buildJobBrief({ analysis, customerMessages: ["Lavabonun altı   ıslak <script>"], district: "Kadıköy", hasPhoto: true });
    expect(brief?.lines.map(line => line.label)).toEqual(["Hizmet", "Olası sorun", "Öncelik", "İlçe", "Müşterinin anlatımı", "Fotoğraf", "Netleşmesi gerekenler"]);
    expect(brief?.text).toContain("Hizmet: Tesisat");
    expect(brief?.text).toContain("teşhis değildir");
    expect(brief?.text).not.toMatch(/[<>]/);
  });

  it("acil durumda, usta gerekmeyen durumda ve belirsiz kategoride özet üretmez", () => {
    expect(buildJobBrief({ analysis: { ...analysis, urgency: "emergency" } })).toBeNull();
    expect(buildJobBrief({ analysis: { ...analysis, professionalNeeded: false } })).toBeNull();
    expect(buildJobBrief({ analysis: { ...analysis, category: "unknown" } })).toBeNull();
  });
});

describe("neden bu usta", () => {
  it("yalnızca kartta gerçekten bulunan verilerden en fazla üç gerekçe üretir", () => {
    const reasons = explainProviderMatch(provider, { category: "plumbing", district: "kadıköy", urgency: "medium" });
    expect(reasons).toEqual(["Tesisat işi yapıyor", "Kadıköy bölgesinde çalışıyor", "Doğrulanmış profil"]);
  });

  it("veri yoksa gerekçe uydurmaz", () => {
    const bare = { ...provider, verified: false, rating: null, reviewCount: null, availability: null, responseTime: null, district: "Beşiktaş" };
    expect(explainProviderMatch(bare, { category: "unknown", district: "Kadıköy" })).toEqual([]);
    expect(explainProviderMatch({ ...provider, rating: 5, reviewCount: 1, verified: false, district: "Beşiktaş", responseTime: null }, { category: "unknown" })).toEqual([]);
  });

  it("yakınlık bilgisi varsa ilçe yerine mesafeyi gösterir", () => {
    expect(explainProviderMatch({ ...provider, distanceKm: 2.34 }, { category: "plumbing", district: "Kadıköy" })[1]).toBe("2.3 km uzağında");
  });
});
