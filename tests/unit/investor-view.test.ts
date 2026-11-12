import { describe, expect, it } from "vitest";
import { buildInvestorFacts, buildLaunchMilestones, projectUnitEconomics } from "@/lib/admin/investor-view";
import type { PrelaunchSnapshot } from "@/services/admin/prelaunch";

const snapshot: PrelaunchSnapshot = {
  version: 2, active_categories: 10, network: { applications: 10, pending: 3, unclassified: 4, published: 0, verified: 0, stores: 0, calendars: 0 },
  interest: 0, pilot: [], capacity: [], readiness: { pending_real_applications: 2, ready: 0, incomplete: 0, missing_verification: 0 },
  settings: { launch_interest_enabled: "false", launch_company_status: "Ocak 2027 hedefleniyor", commission_rate: "10" },
};

describe("yatırımcı görünümü", () => {
  it("okunamayan değeri sıfır değil bilinmiyor (null) bırakır", () => {
    expect(buildInvestorFacts(null, null).every(fact => fact.value === null)).toBe(true);
    const facts = buildInvestorFacts(snapshot, null);
    expect(facts[0]).toMatchObject({ label: "Yayındaki doğrulanmış gerçek usta", value: 0 });
    expect(facts.at(-1)?.value).toBeNull();
  });

  it("lansman adımlarını gerçek duruma göre işaretler; şirketleşme ve ödemeyi tamam göstermez", () => {
    const milestones = buildLaunchMilestones(snapshot);
    const state = Object.fromEntries(milestones.map(item => [item.title, item.done]));
    expect(state["İlk doğrulanmış gerçek usta yayında"]).toBe(false);
    expect(state["İzinli müşteri ön kaydı açık"]).toBe(false);
    expect(state["Şirketleşme"]).toBe(false);
    expect(state["Gerçek ödeme"]).toBe(false);
    expect(milestones.find(item => item.title === "Şirketleşme")?.detail).toBe("Ocak 2027 hedefleniyor");
    expect(buildLaunchMilestones(null).find(item => item.title === "İlk doğrulanmış gerçek usta yayında")?.done).toBeNull();
  });

  it("senaryo hesabı sipariş fiyatlamasıyla aynı kuralı kullanır", () => {
    const result = projectUnitEconomics({ averageBasketTl: 1500, customerFeePercent: "5", monthlyOrders: 300, providerCommissionPercent: "10" });
    // 1.500 TL hizmet: 150 TL usta komisyonu + 75 TL müşteri payı = 225 TL; müşteri 1.575 TL öder.
    expect(result).toEqual({ gmvMinor: 157_500 * 300, perOrderRevenueMinor: 22_500, providerPayoutMinor: 135_000 * 300, revenueMinor: 22_500 * 300, takeRatePercent: 14.3 });
  });

  it("geçersiz varsayımda sonuç üretmez", () => {
    expect(projectUnitEconomics({ averageBasketTl: 0, customerFeePercent: "0", monthlyOrders: 10, providerCommissionPercent: "10" })).toBeNull();
    expect(projectUnitEconomics({ averageBasketTl: 1000, customerFeePercent: "0", monthlyOrders: 1.5, providerCommissionPercent: "10" })).toBeNull();
    expect(projectUnitEconomics({ averageBasketTl: 1000, customerFeePercent: "abc", monthlyOrders: 10, providerCommissionPercent: "10" })).toBeNull();
  });
});
