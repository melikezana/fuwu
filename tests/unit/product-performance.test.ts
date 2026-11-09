import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
import { getPublicDiscovery } from "@/services/commerce/discovery";
describe("P1 mobile discovery and payload regression", () => {
  it("keeps all five shipped font weights within a 120 KB combined budget", () => {
    const files = fs.readdirSync("src/fonts").filter(f => /^Inter-.*\.woff2$/.test(f));
    expect(files).toHaveLength(5);
    expect(files.reduce((sum, f) => sum + fs.statSync(path.join("src/fonts", f)).size, 0)).toBeLessThanOrEqual(120000);
  });
  it("loads real categories and districts concurrently without waiting for commerce tables", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fixture.invalid"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fixture-anon");
    const started: string[] = [];
    const resolves: (() => void)[] = [];
    vi.stubGlobal("fetch", vi.fn((url: string) => new Promise<Response>(resolve => {
      const category = url.includes("service_categories"); const interest = url.includes("launch_interest_health"); started.push(category ? "categories" : interest ? "interest" : "districts");
      resolves.push(() => resolve(new Response(JSON.stringify(interest ? { version: 1, available: false } : category ? [{ id: "c", name: "Tesisat", slug: "tesisat", is_visible: true }, { id: "hidden", is_visible: false }] : [{ id: "d", name: "Kadıköy" }]), { status: 200 })));
    })));
    const pending = getPublicDiscovery();
    expect(started).toEqual(["categories", "districts", "interest"]);
    resolves.forEach(resolve => resolve());
    // Active discovery is independent of the separate purchase visibility setting.
    expect(await pending).toMatchObject({ unavailable: false, launchInterestOpen: false, categories: [{ id: "c" }, { id: "hidden" }], districts: [{ id: "d" }] });
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it("shows unavailable discovery instead of inventing categories on backend errors", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fixture.invalid"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fixture-anon");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
    expect(await getPublicDiscovery()).toEqual({ unavailable: true, launchInterestOpen: false, categories: [], districts: [] });
  });
  it("links the waitlist only when the launch-interest switch is verifiably open", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fixture.invalid"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fixture-anon");
    const respond = (interest: Response) => vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("launch_interest_health") ? interest.clone() : new Response("[]", { status: 200 })));
    respond(new Response(JSON.stringify({ version: 1, available: true }), { status: 200 }));
    expect((await getPublicDiscovery()).launchInterestOpen).toBe(true);
    respond(new Response("{}", { status: 503 }));
    expect(await getPublicDiscovery()).toMatchObject({ unavailable: false, launchInterestOpen: false });
    respond(new Response(JSON.stringify({ version: 2, available: true }), { status: 200 }));
    expect((await getPublicDiscovery()).launchInterestOpen).toBe(false);
  });
});
