import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEMO_DISCLAIMER, demoProviders, getDemoProvidersForCategory, isDemoProviderSlug } from "@/lib/demo/providers";

const activeCategories = ["bahce-bakimi", "boya-badana", "cilingir", "elektrik-hizmeti", "hali-yikama", "havuz-bakimi", "klima-beyaz-esya", "mobilya-montaj", "nakliye-yardimi", "temizlik", "tesisat"];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe("örnek usta profilleri", () => {
  it("her aktif kategoride tam bir örnek profil var", () => {
    for (const category of activeCategories) expect(demoProviders.filter(item => item.categorySlug === category), category).toHaveLength(1);
    expect(new Set(demoProviders.map(item => item.slug)).size).toBe(demoProviders.length);
    expect(getDemoProvidersForCategory("havuz-bahce-bakimi").map(item => item.categorySlug).sort()).toEqual(["bahce-bakimi", "havuz-bakimi"]);
  });

  it("puan, yorum, tamamlanan iş ya da fiyat taşımaz (sahte değerlendirme yasağı)", () => {
    for (const provider of demoProviders) {
      for (const key of Object.keys(provider)) expect(key).not.toMatch(/rating|review|yorum|puan|completed|price|fiyat|phone|whatsapp|email/i);
      expect(JSON.stringify(provider)).not.toMatch(/\b\d+[.,]?\d*\s*(TL|₺)|★|\d\.\d\s*puan/);
    }
  });

  it("her görsel dosyası var, WebP ve makul boyutta; açıklamalar örnek olduğunu söyler", () => {
    for (const provider of demoProviders) {
      for (const src of [provider.portrait, ...provider.work.map(item => item.src)]) {
        const file = path.join("public", src);
        expect(existsSync(file), file).toBe(true);
        expect(src).toMatch(/^\/images\/demo\/[a-z]+-(portrait|work-\d)\.webp$/);
        expect(statSync(file).size).toBeLessThan(320_000);
      }
      expect(provider.portraitAlt).toMatch(/Örnek .* yapay zekâ ile üretilmiş/);
      expect(provider.slug.startsWith("ornek-")).toBe(true);
      expect(isDemoProviderSlug(provider.slug)).toBe(true);
    }
    expect(readFileSync("scripts/prepare-demo-photos.mjs", "utf8")).toContain("ÖRNEK · Yapay zekâ görseli");
    expect(DEMO_DISCLAIMER).toMatch(/Gerçek bir usta değildir/);
  });

  it("belgeler yalnızca tür gösterir: numara, seri ya da kurum logosu içermez", () => {
    for (const provider of demoProviders) for (const document of provider.documents) {
      expect(document.title + document.issuer).not.toMatch(/\d{4,}(?! sayılı)|No[:.]|Seri|logo/i);
    }
    const thumb = readFileSync("src/components/demo/DemoDocumentThumb.tsx", "utf8");
    expect(thumb).toContain("ÖRNEK");
    expect(thumb).not.toMatch(/<image|href=/);
  });

  it("örnekler gerçek usta akışlarına girmez: servis katmanı, eşleştirme, Fuwi önerisi, sitemap", () => {
    const allowed = new Set(["src/app/ornek-profiller/page.tsx", "src/app/ornek-profiller/[slug]/page.tsx", "src/components/home/MarketplaceHome.tsx", "src/app/providers/page.tsx"]);
    const importers = walk("src").filter(file => /\.(ts|tsx)$/.test(file) && readFileSync(file, "utf8").includes("@/lib/demo/providers")).map(file => file.split(path.sep).join("/"));
    for (const file of importers) expect(allowed.has(file) || file.startsWith("src/components/demo/"), file).toBe(true);
    for (const dir of ["src/services", "src/lib/ai", "src/app/api"]) for (const file of walk(dir)) expect(readFileSync(file, "utf8"), file).not.toContain("@/lib/demo");
    expect(readFileSync("src/app/sitemap.ts", "utf8")).not.toMatch(/ornek|demo/i);
  });

  it("örnek sayfaları arama motorlarına kapalıdır ve randevu almaz", () => {
    for (const file of ["src/app/ornek-profiller/page.tsx", "src/app/ornek-profiller/[slug]/page.tsx"]) {
      const source = readFileSync(file, "utf8");
      expect(source).toContain("noIndex: true");
      expect(source).not.toMatch(/checkout|\/orders|createOrder|bookingHref/);
    }
    expect(readFileSync("src/app/ornek-profiller/[slug]/page.tsx", "utf8")).toContain("dynamicParams = false");
  });
});
