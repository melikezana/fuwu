import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { DISTANCE_CONTRACT_VERSION, distanceContractSections, preInformationSections, startsWithinWithdrawalPeriod, withdrawalFormSection, type ContractInput } from "@/lib/legal/distance-contract";

const provider = { name: "TEST Ahmet Usta", display_name: "Ahmet Usta", tax_id: "11111111110", tax_office: "Kadıköy", address: "TEST Caferağa Mah. Örnek Sok. No 1 Kadıköy", phone: "+90 555 000 33 33" };
const intermediary = { name: "Melike Dağkesen (FUWU)", tax_id: "22222222220", tax_office: null, address: "TEST FUWU Adresi Mah. Sok. No 2 İstanbul", phone: "+90 850 000 00 00", email: "fuwuhizmet@gmail.com" };
const input = (over: Partial<ContractInput> = {}): ContractInput => ({
  provider, intermediary, service: { name: "Ev temizliği", variant: "2+1 ev", scope: "Tüm odaların temizliği", exclusions: "Dış cephe camları" },
  addons: [{ name: "Fırın içi temizliği", quantity: 1, total_minor: 35000 }, { name: "Cam silme", quantity: 2, total_minor: 30000 }],
  basePriceMinor: 150000, addonsMinor: 65000, totalMinor: 215000, durationMinutes: 240, startsAt: "2026-11-26T08:00:00.000Z",
  address: "TEST Moda Mah. No 3 D 4", district: "Kadıköy", paymentMethod: "PAY_AT_DOOR", withinWithdrawalPeriod: true, ...over,
});
const text = (sections: { title: string; body: string[] }[]) => sections.map(section => [section.title, ...section.body].join("\n")).join("\n");

describe("pre-contract information and distance service contract", () => {
  it("contains every item Mesafeli Sözleşmeler Yönetmeliği m.5/1 requires for a home service", () => {
    const form = text(preInformationSections(input()));
    for (const required of [
      "Ev temizliği", "Tüm odaların temizliği", "Dış cephe camları", "Fırın içi temizliği", // (a) temel nitelikler
      "TEST Ahmet Usta", "11111111110", "Melike Dağkesen (FUWU)", "22222222220", // (b) ad/unvan + vergi kimlik no (usta ve aracı)
      "TEST Caferağa Mah.", "+90 555 000 33 33", "TEST FUWU Adresi", "+90 850 000 00 00", // (c) açık adres ve telefon
      "fuwuhizmet@gmail.com", // (ç)/(ğ) şikâyet ve cayma bildirimi adresi
      "₺2.150", "tüm vergiler", "ek masraf alınmaz", // (d) toplam fiyat ve ek masraflar
      "Kapıda ödeme", "Usta hizmete başlamadan ödeme isteyemez", // ödeme yöntemi (m.6/2-b)
      "14 gün", "Siparişi İptal Et", // (g) cayma koşulları, süresi ve usulü
      "m.15/1-h", "cayma hakkın sona erer", // (h) cayma istisnası
      "teminat", // (ı)
      "Tüketici Hakem Heyetine", "73/A", "zorunlu arabuluculuğa", // (k)
      "ödeme yükümlülüğü", // m.8
    ]) expect(form, required).toContain(required);
    expect(form).not.toContain("[siparişte doldurulur]");
  });
  it("explains the withdrawal exception according to the appointment date", () => {
    expect(text(preInformationSections(input({ withinWithdrawalPeriod: true })))).toContain("Randevun cayma süresi içinde");
    expect(text(preInformationSections(input({ withinWithdrawalPeriod: false })))).toContain("cayma süresinden sonra");
    const now = Date.parse("2026-11-24T12:00:00Z");
    expect(startsWithinWithdrawalPeriod("2026-12-07T12:00:00Z", now)).toBe(true);
    expect(startsWithinWithdrawalPeriod("2026-12-09T12:00:00Z", now)).toBe(false);
  });
  it("itemizes the FUWU service fee and explains escrowed card payment", () => {
    const card = text(preInformationSections(input({ paymentMethod: "CARD", basePriceMinor: 150000, addonsMinor: 65000, customerFeeMinor: 10750, totalMinor: 225750 })));
    expect(card).toContain("FUWU hizmet bedeli: ₺107,50");
    expect(card).toContain("₺2.257,50");
    expect(card).toContain("hizmet tamamlanıp sen onaylayınca ustaya aktarılır");
    expect(text(distanceContractSections(input({ paymentMethod: "CARD", customerFeeMinor: 10750, totalMinor: 225750 })))).toContain("usta komisyonu ayrılarak");
    expect(text(preInformationSections(input({ customerFeeMinor: 0 })))).not.toContain("FUWU hizmet bedeli:");
  });
  it("describes card refunds only for card orders and keeps pay-at-door free of refunds", () => {
    expect(text(preInformationSections(input({ paymentMethod: "CARD" })))).toContain("14 gün içinde, ödediğin araçla");
    expect(text(preInformationSections(input()))).toContain("iade gerekmez");
  });
  it("builds a contract with the parties, the accepted version and the model withdrawal form", () => {
    const contract = text([...distanceContractSections(input({ orderRef: "AB12CD34", acceptedAt: "2026-11-24T13:00:00Z", version: DISTANCE_CONTRACT_VERSION, customer: { name: "Test Müşteri", email: "musteri@example.invalid" } })), withdrawalFormSection(input({ orderRef: "AB12CD34" }))]);
    for (const required of ["Madde 1 – Taraflar", "Test Müşteri", "TEST Ahmet Usta", "Melike Dağkesen (FUWU)", "AB12CD34", DISTANCE_CONTRACT_VERSION, "15. maddesi", "Ek – Cayma Formu", "cayma hakkımı kullandığımı bildiririm"]) expect(contract, required).toContain(required);
  });
  it("marks missing data instead of inventing it on the public template", () => {
    const template = text(preInformationSections({ provider: null, intermediary: null, service: null, addons: [], basePriceMinor: null, addonsMinor: 0, totalMinor: null, paymentMethod: null, withinWithdrawalPeriod: null }));
    expect(template).toContain("[siparişte doldurulur]");
  });
  it("uses the same contract version as the database gate", () => {
    const sql = fs.readFileSync("supabase/migrations/20261124000200_distance_contract_legal.sql", "utf8");
    expect(sql.match(new RegExp(DISTANCE_CONTRACT_VERSION, "g"))?.length).toBeGreaterThanOrEqual(3);
  });
  it("shows legal text at 12 pt or larger and asks for confirmation before ordering", () => {
    const css = fs.readFileSync("src/styles/premium.css", "utf8");
    expect(css).toMatch(/\.legal-doc \{ font-size: 16px;/);
    expect(css).toMatch(/\.legal-doc p \{ font-size: 16px;/);
    const booking = fs.readFileSync("src/components/commerce/ServiceBooking.tsx", "utf8");
    expect(booking).toContain("legalAccepted: consent");
    expect(booking).toContain("ödeme yükümlülüğü doğan bir sipariş");
  });
});
