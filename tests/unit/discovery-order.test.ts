import { describe, expect, it } from "vitest";
import { sortByTurkishName, sortCategories, sortDistricts } from "@/lib/commerce/discovery-order";
import { getServiceDisplayLabel } from "@/lib/constants/services";

const names = (rows: { name: string }[]) => rows.map(row => row.name);

describe("public list ordering", () => {
  it("sorts districts with Turkish letters in their alphabetical place", () => {
    const input = ["Üsküdar", "Sancaktepe", "Çatalca", "Şişli", "Beykoz", "Ataşehir", "Şile", "Cihangir", "Ümraniye"].map(name => ({ id: name, name }));
    expect(names(sortDistricts(input))).toEqual(["Ataşehir", "Beykoz", "Cihangir", "Çatalca", "Sancaktepe", "Şile", "Şişli", "Ümraniye", "Üsküdar"]);
  });

  it("does not mutate the input", () => {
    const input = [{ name: "Şişli" }, { name: "Adalar" }];
    sortByTurkishName(input);
    expect(names(input)).toEqual(["Şişli", "Adalar"]);
  });

  it("orders categories by admin sort order first, then by Turkish name", () => {
    const input = [
      { name: "Temizlik", sort_order: 0 },
      { name: "Tesisat", sort_order: 2 },
      { name: "Çilingir" },
      { name: "Elektrik Hizmeti", sort_order: 1 },
      { name: "Boya Badana", sort_order: 0 },
    ];
    expect(names(sortCategories(input))).toEqual(["Elektrik Hizmeti", "Tesisat", "Boya Badana", "Çilingir", "Temizlik"]);
  });
});

describe("category labels match database names", () => {
  it.each([
    ["Elektrik Hizmeti", "Elektrik Hizmeti"],
    ["elektrik-hizmeti", "Elektrik Hizmeti"],
    ["Klima & Beyaz Eşya", "Klima & Beyaz Eşya"],
    ["klima-beyaz-esya", "Klima & Beyaz Eşya"],
    ["Beyaz Eşya", "Klima & Beyaz Eşya"],
    ["Mobilya Montaj", "Mobilya Montaj"],
    ["Mobilya Montajı", "Mobilya Montaj"],
    ["Nakliye Yardımı", "Nakliye Yardımı"],
    ["Nakliye", "Nakliye Yardımı"],
    ["Tesisat", "Tesisat"],
  ])("%s → %s", (value, label) => {
    expect(getServiceDisplayLabel(value)).toBe(label);
  });
});

describe("malformed rows", () => {
  it("keeps rows without a name at the end instead of throwing", () => {
    const input = [{ id: "x" } as unknown as { name: string }, { name: "Tesisat" }, { name: "Boya Badana" }];
    expect(() => sortCategories(input)).not.toThrow();
    expect(names(sortCategories(input)).slice(0, 2)).toEqual(["Boya Badana", "Tesisat"]);
  });
});
