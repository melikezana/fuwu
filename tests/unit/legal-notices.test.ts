import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LAUNCH_INTEREST_NOTICE, LAUNCH_MARKETING_CONSENT, LAUNCH_MARKETING_VERSION, LAUNCH_NOTICE_VERSION, PROVIDER_APPLICATION_NOTICE, PROVIDER_APPLICATION_NOTICE_VERSION } from "@/lib/legal/notices";

const migrations = fs.readdirSync("supabase/migrations").filter(file => file.endsWith(".sql")).sort();
const latestMention = (version: string) => migrations.filter(file => fs.readFileSync(path.join("supabase/migrations", file), "utf8").includes(`'${version}'`));

describe("legal notice versions", () => {
  it.each([LAUNCH_NOTICE_VERSION, LAUNCH_MARKETING_VERSION, PROVIDER_APPLICATION_NOTICE_VERSION])("%s is the version the database enforces", version => {
    // Metin sürümü değişip veritabanı fonksiyonu güncellenmezse tüm kayıtlar reddedilir; bu test o kaymayı yakalar.
    expect(latestMention(version).length).toBeGreaterThan(0);
  });

  it("keeps the information notices free of consent wording (KVKK İlke Kararı 2026/347)", () => {
    for (const notice of [LAUNCH_INTEREST_NOTICE, PROVIDER_APPLICATION_NOTICE]) {
      const text = notice.sections.flatMap(section => section.body).join(" ").toLocaleLowerCase("tr");
      expect(text).not.toMatch(/onaylıyorum|kabul ediyorum|rıza gösteriyorum/);
    }
  });

  it("names the data controller, legal basis, retention and rights in every notice", () => {
    for (const notice of [LAUNCH_INTEREST_NOTICE, PROVIDER_APPLICATION_NOTICE]) {
      const titles = notice.sections.map(section => section.title);
      expect(titles).toEqual(expect.arrayContaining(["Veri sorumlusu", "Amaç ve hukuki sebep", "Ne kadar saklanır", "Hakların", "Kimlere aktarılır"]));
    }
  });

  it("keeps the marketing consent optional and withdrawable in its own text", () => {
    const text = LAUNCH_MARKETING_CONSENT.body.join(" ");
    expect(text).toContain("isteğe bağlıdır");
    expect(text).toContain("geri çekebilirsin");
    expect(LAUNCH_MARKETING_CONSENT.statement).toContain("onay veriyorum");
  });
});
