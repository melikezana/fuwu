import { describe, expect, it } from "vitest";
import { parseWeeklyLaunchMetrics, WEEKLY_METRIC_KEYS } from "@/services/admin/launch-metrics";

const week = (start: string) => ({ week_start: start, ...Object.fromEntries(WEEKLY_METRIC_KEYS.map(key => [key, 0])) });
const valid = () => ({
  version: 1, timezone: "Europe/Istanbul", weeks: [week("2026-11-02"), week("2026-11-09")],
  totals: { published_providers: 0, published_stores: 0, consented_interest: 0, open_support: 1 },
  applications: { total: 10, linked: 2, unlinked: { pending: 3, approved: 1, rejected: 4 } },
  unauthorized_actions: [{ day: "2026-10-30", entity_type: "provider", total: 23, anonymous: 0, distinct_accounts: 1 }],
});

describe("weekly launch metrics (9 Kasım 2026 denetimi · izleme)", () => {
  it("accepts the admin RPC contract", () => {
    const parsed = parseWeeklyLaunchMetrics(valid());
    expect(parsed?.weeks).toHaveLength(2);
    expect(parsed?.applications.unlinked.rejected).toBe(4);
  });
  it("fails closed instead of showing unknown values as zero", () => {
    expect(parseWeeklyLaunchMetrics(null)).toBeNull();
    expect(parseWeeklyLaunchMetrics({ ...valid(), version: 2 })).toBeNull();
    expect(parseWeeklyLaunchMetrics({ ...valid(), weeks: [{ ...week("2026-11-02"), orders_created: -1 }] })).toBeNull();
    expect(parseWeeklyLaunchMetrics({ ...valid(), weeks: [{ ...week("2026-11-02"), support_resolved: undefined }] })).toBeNull();
    expect(parseWeeklyLaunchMetrics({ ...valid(), weeks: [week("02.11.2026")] })).toBeNull();
    expect(parseWeeklyLaunchMetrics({ ...valid(), applications: { total: 10, linked: 2, unlinked: { pending: "3" } } })).toBeNull();
    expect(parseWeeklyLaunchMetrics({ ...valid(), unauthorized_actions: [{ day: "2026-10-30", entity_type: "provider", total: 23 }] })).toBeNull();
  });
});
