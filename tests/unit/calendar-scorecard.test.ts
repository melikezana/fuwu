import { describe, expect, it } from "vitest";
import { buildOrderIcs, directionsUrl } from "@/lib/commerce/calendar";
import { isQualitySnapshot, qualityMetrics } from "@/lib/providers/scorecard";

const order = { id: "1b4e28ba-2fa1-11d2-883f-0016d3cca427", service_name: "Musluk değişimi; acil, hızlı", provider_name: "Ahmet Usta", district_name: "Kadıköy", address: "Caferağa Mah. Moda Cad. No:5", starts_at: "2026-11-05T07:00:00.000Z", ends_at: "2026-11-05T08:00:00.000Z" };

describe("randevu takvim dosyası", () => {
  const ics = buildOrderIcs(order, "https://fuwu.com.tr", new Date("2026-11-03T00:00:00Z"));
  it("UTC saatleri ve hatırlatmayı içerir", () => {
    expect(ics).toContain("DTSTART:20261105T070000Z");
    expect(ics).toContain("DTEND:20261105T080000Z");
    expect(ics).toContain("TRIGGER:-PT1H");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  });
  it("özel karakterleri RFC 5545'e göre kaçışlar", () => {
    expect(ics.replace(/\r\n /g, "")).toContain("SUMMARY:FUWU · Musluk değişimi\\; acil\\, hızlı");
  });
  it("satırları 75 oktetten uzun bırakmaz", () => {
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
  it("yol tarifi adresi kodlar", () => {
    expect(directionsUrl(order)).toBe(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent("Caferağa Mah. Moda Cad. No:5, Kadıköy, İstanbul")}`);
  });
});

describe("usta güven karnesi", () => {
  const base = { window_days: 90, completed_count: 9, cancelled_count: 1, disputed_count: 0, arrival_checked_count: 10, on_time_count: 7, rating_avg: 4.8, review_count: 5 };
  it("oranları ve tonları hesaplar", () => {
    const m = Object.fromEntries(qualityMetrics(base).map(x => [x.id, x]));
    expect(m.completion.value).toBe("%90");
    expect(m.completion.tone).toBe("good");
    expect(m.on_time.value).toBe("%70");
    expect(m.on_time.tone).toBe("watch");
    expect(m.on_time.tip).toBeDefined();
    expect(m.rating.tone).toBe("good");
    expect(m.disputes.tone).toBe("good");
  });
  it("veri yoksa yargılamaz", () => {
    const m = qualityMetrics({ ...base, completed_count: 0, cancelled_count: 0, arrival_checked_count: 0, on_time_count: 0, rating_avg: null, review_count: 0 });
    expect(m.filter(x => x.tone === "empty").length).toBe(3);
  });
  it("PostgreSQL numeric metin döndürse de kabul eder", () => {
    expect(isQualitySnapshot({ ...base, rating_avg: "4.50" })).toBe(true);
    expect(isQualitySnapshot({ ...base, completed_count: "9" })).toBe(false);
  });
});
