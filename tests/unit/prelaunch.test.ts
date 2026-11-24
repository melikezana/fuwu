import { describe, expect, it } from "vitest";
import { CONFIRMED_TEST_PROVIDER_IDS, isRealPublishedProvider, SEEDED_PROVIDER_IDS } from "@/lib/providers/provenance";
import fs from "node:fs";
import { cardCheckoutEnabled, directPurchaseEnabled, publicAnnouncement, STOREFRONT_COPY } from "@/lib/prelaunch";
describe("prelaunch public trust boundaries",()=>{
  it("blocks every repository seed ID even if it is mistakenly classified real",()=>{
    expect(SEEDED_PROVIDER_IDS).toHaveLength(13);
    for(const id of SEEDED_PROVIDER_IDS)expect(isRealPublishedProvider({id,record_kind:'real'})).toBe(false);
  });
  it("requires explicit real classification and fails closed on an older RPC response",()=>{
    const id='ac000000-0000-4000-8000-000000000001';
    expect(isRealPublishedProvider({id})).toBe(false);
    expect(isRealPublishedProvider({id,record_kind:'test'})).toBe(false);
    expect(isRealPublishedProvider({id,record_kind:'unclassified'})).toBe(false);
    expect(isRealPublishedProvider({id,record_kind:'real'})).toBe(true);
  });
  it("suppresses the legacy development message while retaining operational announcements",()=>{
    expect(publicAnnouncement('FUWU’yu GELİŞTİRİYORUZ')).toBe('');
    expect(publicAnnouncement('  Kadıköy operasyon saatleri güncellendi.  ')).toBe('Kadıköy operasyon saatleri güncellendi.');
  });
  it("hides owner-confirmed test profiles even when an RPC classifies them real",()=>{
    expect(CONFIRMED_TEST_PROVIDER_IDS).toHaveLength(4);
    for(const id of CONFIRMED_TEST_PROVIDER_IDS) {
      expect(isRealPublishedProvider({id,record_kind:'real'})).toBe(false);
      expect(isRealPublishedProvider({id:id.toUpperCase(),record_kind:'real'})).toBe(false);
    }
  });
  it("sells the service directly without verified-provider claims or waitlist CTAs", ()=>{
    // 24 Kasım 2026: hizmet doğrudan satın alınır. Yayımlı gerçek usta olmadan "doğrulanmış usta" vaadi yine verilmez.
    const verifiedClaim=/ustası doğrulanmış|doğrulanmış usta/i;
    for(const text of Object.values(STOREFRONT_COPY)) expect(text).not.toMatch(verifiedClaim);
    expect(STOREFRONT_COPY.heroStage).toMatch(/satın al/);
    expect(STOREFRONT_COPY.seoDescription).toMatch(/kapıda/);
    for(const file of ["src/components/home/HeroSection.tsx","src/components/home/HomePremiumPanels.tsx","src/components/home/HeroSearch.tsx","src/app/services/page.tsx","src/app/services/[slug]/page.tsx","src/components/commerce/CustomerHub.tsx","src/app/sss/page.tsx"]) {
      const source=fs.readFileSync(file,"utf8");
      expect(source,file).not.toMatch(verifiedClaim);
      expect(source,file).not.toMatch(/Talep Bırak|talep bırak|href="\/waitlist"|henüz açılmadı/);
    }
    expect(fs.readFileSync("src/components/home/HeroSection.tsx","utf8")).toContain("STOREFRONT_COPY.heroStage");
    expect(fs.readFileSync("src/app/guven/page.tsx","utf8")).toContain("STOREFRONT_COPY.journeyStage");
    expect(fs.readFileSync("src/components/trust/TrustPromise.tsx","utf8")).toContain("STOREFRONT_COPY.trustStage");
    expect(fs.readFileSync("src/app/sitemap.ts","utf8")).not.toContain("appRoutes.waitlist");
  });
  it("keeps the kill switch server-side and card checkout behind the sandbox switch", ()=>{
    const previous={ disabled: process.env.FUWU_DIRECT_PURCHASE_DISABLED, sandbox: process.env.FUWU_SANDBOX_CHECKOUT_ENABLED };
    try {
      delete process.env.FUWU_DIRECT_PURCHASE_DISABLED; delete process.env.FUWU_SANDBOX_CHECKOUT_ENABLED;
      expect(directPurchaseEnabled()).toBe(true); expect(cardCheckoutEnabled()).toBe(false);
      process.env.FUWU_DIRECT_PURCHASE_DISABLED="true"; process.env.FUWU_SANDBOX_CHECKOUT_ENABLED="true";
      expect(directPurchaseEnabled()).toBe(false); expect(cardCheckoutEnabled()).toBe(true);
    } finally {
      if (previous.disabled === undefined) delete process.env.FUWU_DIRECT_PURCHASE_DISABLED; else process.env.FUWU_DIRECT_PURCHASE_DISABLED=previous.disabled;
      if (previous.sandbox === undefined) delete process.env.FUWU_SANDBOX_CHECKOUT_ENABLED; else process.env.FUWU_SANDBOX_CHECKOUT_ENABLED=previous.sandbox;
    }
  });
});
