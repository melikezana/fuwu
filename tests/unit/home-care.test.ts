import { describe, expect, it } from "vitest";
import { getHomeCareMonth, getHomeCarePlan, istanbulMonth } from "@/lib/home-care/seasonal-plan";
import { serviceCategories } from "@/lib/constants/services";

describe("ev bakım takvimi", () => {
  it("her ay için en az iki iş içerir ve iş kimlikleri benzersizdir", () => {
    const ids = new Set<string>();
    for (let month = 1; month <= 12; month += 1) {
      const plan = getHomeCareMonth(month);
      expect(plan.tasks.length).toBeGreaterThanOrEqual(2);
      for (const task of plan.tasks) { expect(ids.has(task.id)).toBe(false); ids.add(task.id); }
    }
  });

  it("bağlantı verdiği her kategori FUWU'da gerçekten var", () => {
    const slugs = new Set<string>(serviceCategories.map(category => category.slug));
    for (let month = 1; month <= 12; month += 1) for (const task of getHomeCareMonth(month).tasks) if (task.categorySlug) expect(slugs.has(task.categorySlug)).toBe(true);
  });

  it("FUWU'nun sunmadığı gazlı cihaz bakımına hizmet bağlantısı vermez", () => {
    const boiler = getHomeCareMonth(9).tasks.find(task => task.id === "boiler");
    expect(boiler?.categorySlug).toBeNull();
    expect(boiler?.why).toContain("yetkili servis");
  });

  it("ayı İstanbul saatine göre belirler ve yıl sonunda ocağa sarar", () => {
    // 31 Aralık 22:30 UTC, İstanbul'da 1 Ocak 01:30'dur.
    expect(istanbulMonth(new Date("2026-12-31T22:30:00Z"))).toBe(1);
    expect(getHomeCarePlan(new Date("2026-12-15T09:00:00Z"), 1).map(item => item.label)).toEqual(["Aralık", "Ocak"]);
    expect(getHomeCareMonth(99).month).toBe(1);
  });
});
