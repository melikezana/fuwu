import { describe, expect, it } from "vitest";
import { buildHomeLedger, classifyJob, customerPrep, kindFromCategorySlug, prepProgress, providerKit, revisitMonths, type JobKind } from "@/lib/jobs/job-kit";
import { seasonSignals } from "@/lib/jobs/season-signals";

describe("iş kiti · tür tanıma", () => {
  it.each<[string, JobKind]>([
    ["Ev temizliği", "temizlik"],
    ["Detaylı ev temizliği", "temizlik"],
    ["Koltuk yıkama", "hali"],
    ["Halı yıkama", "hali"],
    ["Oda boyama", "boya"],
    ["Kapı açma", "cilingir"],
    ["Kilit değişimi", "cilingir"],
    ["Havuz temizliği ve bakımı", "havuz"],
    ["Çim biçme", "bahce"],
    ["Eşya taşıma yardımı", "nakliye"],
    ["Musluk değişimi", "tesisat"],
    ["Priz ve sigorta kontrolü", "elektrik"],
    ["TV ünitesi montajı", "montaj"],
    ["Avize takılması", "elektrik"],
    ["Klima bakımı", "klima"],
    ["Bilinmeyen iş", "genel"],
  ])("%s → %s", (name, kind) => expect(classifyJob(name)).toBe(kind));

  it("adı belirsizse kapsama bakar, ama ad kapsamın önündedir", () => {
    // Boya kapsamı "iş sonu kaba temizlik" içerir; ad boya olduğu için temizlik sayılmamalı.
    expect(classifyJob("Oda boyama", null, "iki kat boya, iş sonu kaba temizlik")).toBe("boya");
    // Temizlik kapsamı "lavabo" içerir; tesisat sayılmamalı.
    expect(classifyJob("Ev temizliği", "3+1", "mutfak tezgâhı, lavabo, klozet")).toBe("temizlik");
    expect(classifyJob("Paket A", null, "Lavabo gideri açma")).toBe("tesisat");
  });

  it("kategori slug'ını türe çevirir", () => {
    expect(kindFromCategorySlug("elektrik-hizmeti")).toBe("elektrik");
    expect(kindFromCategorySlug("havuz-bahce-bakimi")).toBe("havuz");
    expect(kindFromCategorySlug(null)).toBe("genel");
  });
});

describe("iş kiti · rehberler", () => {
  const kinds: JobKind[] = ["temizlik", "hali", "tesisat", "elektrik", "boya", "cilingir", "klima", "montaj", "nakliye", "bahce", "havuz", "tadilat", "genel"];

  it("her türde müşteri listesi benzersiz kimlikli ve ortak maddeleri içerir", () => {
    for (const kind of kinds) {
      const items = customerPrep(kind);
      expect(items.length).toBeGreaterThanOrEqual(3);
      expect(new Set(items.map(item => item.id)).size).toBe(items.length);
      expect(items.some(item => item.id === "pets")).toBe(true);
    }
  });

  it("her türde usta kitinde kapsam kuralı bir kez bulunur", () => {
    for (const kind of kinds) {
      const kit = providerKit(kind);
      expect(kit.bring.length).toBeGreaterThan(0);
      expect(kit.askAtDoor.length).toBeGreaterThan(0);
      expect(kit.safety.filter(rule => rule.includes("Kapsam dışı ek iş"))).toHaveLength(1);
    }
  });

  it("rehber metinleri telefon, bağlantı ya da fiyat içermez", () => {
    const text = kinds.flatMap(kind => [...customerPrep(kind).flatMap(item => [item.title, item.why]), ...Object.values(providerKit(kind)).flat()]).join(" ");
    expect(text).not.toMatch(/https?:|www\.|\b0?5\d{2}\s?\d{3}|₺|\bTL\b/);
  });

  it("gazlı cihaz bakımını kapsam dışı olarak belirtir", () => {
    expect(providerKit("klima").safety.join(" ")).toMatch(/yetkili servis/);
  });

  it("hazırlık ilerlemesini hesaplar, bilinmeyen kimlikleri saymaz", () => {
    const items = customerPrep("tesisat");
    expect(prepProgress(items, [])).toBe(0);
    expect(prepProgress(items, items.map(item => item.id))).toBe(100);
    expect(prepProgress(items, ["uydurma", items[0].id])).toBe(Math.round(100 / items.length));
    expect(prepProgress([], ["x"])).toBe(0);
  });
});

describe("Ev Karnesi", () => {
  const now = new Date("2026-11-13T12:00:00Z");
  const order = (id: string, service_name: string, starts_at: string, provider = "p1") => ({ id, service_name, starts_at, provider_id: provider, provider_name: `Usta ${provider}`, variant_name: null, scope: null });

  it("türe göre gruplar, en son işi ve sayıyı tutar", () => {
    const ledger = buildHomeLedger([
      order("a", "Ev temizliği", "2026-05-01T09:00:00Z", "p1"),
      order("b", "Detaylı ev temizliği", "2026-10-01T09:00:00Z", "p2"),
      order("c", "Musluk değişimi", "2025-09-01T09:00:00Z", "p3"),
    ], now);
    const clean = ledger.find(entry => entry.kind === "temizlik")!;
    expect(clean.count).toBe(2);
    expect(clean.last.id).toBe("b");
    expect(clean.monthsSince).toBe(1);
    expect(clean.due).toBe(false);
  });

  it("zamanı gelen bakımı başa alır", () => {
    const ledger = buildHomeLedger([
      order("a", "Ev temizliği", "2026-10-20T09:00:00Z"),
      order("c", "Musluk değişimi", "2025-09-01T09:00:00Z"),
    ], now);
    expect(ledger[0].kind).toBe("tesisat");
    expect(ledger[0].due).toBe(true);
  });

  it("tek seferlik işlere öneri tarihi koymaz ve sona alır", () => {
    const ledger = buildHomeLedger([order("k", "Kapı açma", "2026-11-01T09:00:00Z"), order("a", "Ev temizliği", "2026-10-20T09:00:00Z")], now);
    expect(revisitMonths("cilingir")).toBeNull();
    expect(ledger.at(-1)!.kind).toBe("cilingir");
    expect(ledger.at(-1)!.suggestedAt).toBeNull();
    expect(ledger.at(-1)!.due).toBe(false);
  });

  it("bozuk tarihli kayıtları atlar", () => {
    expect(buildHomeLedger([order("x", "Ev temizliği", "geçersiz")], now)).toEqual([]);
  });
});

describe("usta mevsim radarı", () => {
  it("kasımda elektrikçiye ısıtıcı yükü hatırlatmasını gösterir", () => {
    const signals = seasonSignals(["elektrik"], new Date("2026-11-13T12:00:00Z"));
    expect(signals.some(signal => !signal.upcoming && /ısıtıcı/i.test(signal.title))).toBe(true);
  });

  it("aralıkta temizlikçiye sonraki ayları da gösterir", () => {
    const signals = seasonSignals(["temizlik"], new Date("2026-12-05T12:00:00Z"));
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.every(signal => signal.title.length > 0)).toBe(true);
  });

  it("genel tür için sinyal üretmez", () => {
    expect(seasonSignals(["genel"])).toEqual([]);
  });
});
