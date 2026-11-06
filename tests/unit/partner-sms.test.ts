import { describe, expect, it } from "vitest";
import { adminNewApplicationText, applicantApprovedText } from "@/services/notifications/partner-sms";

// NetGSM Türkçe karakterli tek SMS sınırı: 155 karakter.
describe("partner SMS texts", () => {
  it("approval SMS fits a single Turkish SMS", () => {
    expect(applicantApprovedText.length).toBeLessThanOrEqual(155);
  });

  it("admin alert fits a single SMS even with long names and carries no personal data", () => {
    const text = adminNewApplicationText("Klima ve Beyaz Eşya Servis ve Bakım Hizmetleri", "Küçükçekmece Merkez Mahallesi");
    expect(text.length).toBeLessThanOrEqual(155);
    expect(text).toContain("fuwu.com.tr/admin/provider-applications");
  });
});
