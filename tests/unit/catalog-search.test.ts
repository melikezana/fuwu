import { describe, expect, it } from "vitest";
import { matchesCatalogQuery, resolveCatalogQueryIntent, searchCatalogServices } from "@/lib/commerce/catalog-navigation";
import type { CatalogService } from "@/lib/commerce/types";

const service = (id: string, name: string, category: string, description = "", scope = "") =>
  ({ id, slug: id, name, description, scope, category_id: category, is_active: true, pricing_type: "FIXED_PRICE" }) as unknown as CatalogService;

const services = [
  service("musluk-montaji", "Musluk montajı", "c-tesisat", "Eski bataryayı sök, yenisini tak.", "Bir adet musluk değişimi."),
  service("priz-degisimi", "Priz ve anahtar değişimi", "c-elektrik", "Bozuk prizler yenilensin.", "Priz sökme ve takma."),
  service("ev-temizligi", "Ev temizliği", "c-temizlik", "Eve döndüğünüzde her yer tertemiz.", "Genel temizlik."),
  service("kapi-acma", "Kapı açma", "c-cilingir", "Kapıda kalmayın.", "Kilitli kapının açılması."),
];
const names: Record<string, string> = { "c-tesisat": "Tesisat", "c-elektrik": "Elektrik Hizmeti", "c-temizlik": "Temizlik", "c-cilingir": "Çilingir" };
const slugs: Record<string, string> = { "c-tesisat": "tesisat", "c-elektrik": "elektrik-hizmeti", "c-temizlik": "temizlik", "c-cilingir": "cilingir" };
const run = (query: string) => searchCatalogServices(services, query, item => names[item.category_id], item => slugs[item.category_id]);

describe("katalog araması: insanların yazdığı gibi bulur", () => {
  it("meslek adlarını ve Türkçe ekleri tanır", () => {
    expect(run("tesisatçı").services.map(item => item.id)).toEqual(["musluk-montaji"]);
    expect(run("elektrikçi").services.map(item => item.id)).toEqual(["priz-degisimi"]);
    expect(run("musluklar").services.map(item => item.id)).toEqual(["musluk-montaji"]);
    expect(run("çilingire").services.map(item => item.id)).toEqual(["kapi-acma"]);
  });

  it("sorun anlatımından doğru kategoriyi çıkarır", () => {
    const result = run("lavabonun altından su damlatıyor");
    expect(result.services.map(item => item.id)).toEqual(["musluk-montaji"]);
    expect(result.byIntent).toBe(true);
    expect(run("kapıda kaldım anahtar içeride").services.map(item => item.id)).toContain("kapi-acma");
    expect(run("prizden ses geliyor").services.map(item => item.id)).toContain("priz-degisimi");
  });

  it("dolgu sözcükleri sonucu boşaltmaz", () => {
    expect(run("acil temizlik lazım").services.map(item => item.id)).toEqual(["ev-temizligi"]);
    expect(matchesCatalogQuery(services[2], "  ", "Temizlik")).toBe(true);
  });

  it("acil durumu tanır", () => {
    expect(resolveCatalogQueryIntent("mutfakta gaz kokusu var").emergency).toBe(true);
    expect(resolveCatalogQueryIntent("prizden kıvılcım çıktı").emergency).toBe(true);
    expect(resolveCatalogQueryIntent("ev temizliği").emergency).toBe(false);
  });

  it("anlamsız aramada uydurma sonuç döndürmez", () => {
    expect(run("qwerty zxcv").services).toEqual([]);
    expect(run("").services).toHaveLength(services.length);
  });
});
