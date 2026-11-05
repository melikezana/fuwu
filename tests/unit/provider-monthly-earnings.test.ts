import { describe, expect, it } from "vitest";
import { buildMonthlyEarnings } from "@/services/providers/stats";

describe("buildMonthlyEarnings", () => {
  const now = new Date("2026-11-05T12:00:00Z");

  it("returns the last six Istanbul months oldest first, with empty months", () => {
    const points = buildMonthlyEarnings([], 6, now);
    expect(points.map(point => point.month)).toEqual(["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]);
    expect(points.every(point => point.earnings === 0 && point.completed === 0)).toBe(true);
  });

  it("buckets by Istanbul time and ignores months outside the window", () => {
    const points = buildMonthlyEarnings([
      { created_at: "2026-10-31T22:30:00Z", offered_price: 500 }, // 1 Nov 01:30 Istanbul
      { created_at: "2026-10-10T09:00:00Z", offered_price: 250 },
      { created_at: "2026-10-12T09:00:00Z", offered_price: null },
      { created_at: "2025-01-01T09:00:00Z", offered_price: 9999 },
    ], 6, now);
    const byMonth = Object.fromEntries(points.map(point => [point.month, point]));
    expect(byMonth["2026-11"]).toMatchObject({ completed: 1, earnings: 500 });
    expect(byMonth["2026-10"]).toMatchObject({ completed: 2, earnings: 250 });
    expect(points.reduce((sum, point) => sum + point.earnings, 0)).toBe(750);
  });

  it("crosses year boundaries", () => {
    const points = buildMonthlyEarnings([], 3, new Date("2027-01-15T12:00:00Z"));
    expect(points.map(point => point.month)).toEqual(["2026-11", "2026-12", "2027-01"]);
  });
});
