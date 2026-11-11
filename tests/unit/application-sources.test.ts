import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { APPLICATION_SOURCE_KINDS, APPLICATION_SOURCE_LABELS, parseApplicationSources } from "@/services/admin/application-sources";

const id = "ae000000-0000-4000-8000-000000000001";
const row = { linked: false, has_provider: false, source_kind: "unclassified", note: null, reviewed_at: null };

describe("application source review (10 Kasım 2026 denetimi · P0/3)", () => {
  it("accepts the admin RPC contract and labels every kind in Turkish", () => {
    expect(parseApplicationSources({ [id]: row })?.[id].linked).toBe(false);
    expect(parseApplicationSources({})).toEqual({});
    for (const kind of ["unclassified", ...APPLICATION_SOURCE_KINDS] as const) expect(APPLICATION_SOURCE_LABELS[kind].length).toBeGreaterThan(5);
  });
  it("fails closed so an unreadable record is never shown as linked or real", () => {
    expect(parseApplicationSources(null)).toBeNull();
    expect(parseApplicationSources([])).toBeNull();
    expect(parseApplicationSources({ "not-a-uuid": row })).toBeNull();
    expect(parseApplicationSources({ [id]: { ...row, linked: "true" } })).toBeNull();
    expect(parseApplicationSources({ [id]: { ...row, source_kind: "demo" } })).toBeNull();
    expect(parseApplicationSources({ [id]: { ...row, note: 5 } })).toBeNull();
  });
});

describe("customer-first prelaunch screens (10 Kasım 2026 denetimi · frontend)", () => {
  const read = (file: string) => fs.readFileSync(file, "utf8");
  it("offers a customer action, not only a partner invitation, when no provider is published", () => {
    const list = read("src/components/providers/ProviderList.tsx");
    expect(list).toContain("Hizmetleri Keşfet");
    expect(list).toContain("Usta mısın? Başvur");
    expect(list).not.toMatch(/\? "Hizmetleri Keşfet" : "Usta Ol"/);
  });
  it("tells catalog visitors that services are not yet on sale and links the waitlist only when it is open", () => {
    const page = read("src/app/services/page.tsx");
    expect(page).toContain("PRELAUNCH_COPY.catalogStage");
    expect(page).not.toMatch(/henüz açılmadı\. <Link href="\/waitlist">/);
    expect(page.match(/discovery\.launchInterestOpen &&/g)).toHaveLength(2);
  });
  it("addresses the customer consistently in the informal singular", () => {
    for (const file of ["src/lib/commerce/display.ts", "src/components/commerce/CustomerHub.tsx", "src/components/commerce/CustomerSpotlight.tsx"]) expect(read(file), file).not.toMatch(/Ustanız|MY FUWU/);
  });
});
