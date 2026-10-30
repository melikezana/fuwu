import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@/services/auth/server", () => ({ getServerAuthContext: vi.fn() }));
vi.mock("@/lib/security/rateLimitRedis", () => ({ checkRateLimitWithRedis: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/services/storage/providerVerificationDocuments", () => ({ uploadProviderVerificationDocument: vi.fn() }));
import { getServerAuthContext } from "@/services/auth/server";
import { checkRateLimitWithRedis } from "@/lib/security/rateLimitRedis";
import { revalidatePath } from "next/cache";
import { getPrelaunchSnapshot } from "@/services/admin/prelaunch";
import { getPartnerReadiness } from "@/services/providers/partner";
import { savePartnerProfile } from "@/app/provider-dashboard/profile/partner-actions";
import { POST as saveStore } from "@/app/api/commerce/store/route";

const auth = vi.mocked(getServerAuthContext);
const limit = vi.mocked(checkRateLimitWithRedis);
const id = "ac000000-0000-4000-8000-000000000004";
const snapshot = { version: 2, network: { applications: 0, pending: 0, unclassified: 0, published: 0, verified: 0, stores: 0, calendars: 0 }, interest: 0, pilot: [], capacity: [], readiness: { pending_real_applications: 0, ready: 0, incomplete: 0, missing_verification: 0 }, settings: {} };
function context(rpc: unknown, role = "admin", extra: Record<string, unknown> = {}) {
  auth.mockResolvedValue({ user: { id, email_confirmed_at: "2026-10-30" }, profile: { role }, supabase: { rpc, ...extra } } as unknown as Awaited<ReturnType<typeof getServerAuthContext>>);
}
beforeEach(() => { auth.mockReset(); limit.mockReset(); vi.mocked(revalidatePath).mockClear(); });

describe("operations and partner failure boundaries", () => {
  it("denies nonadmin aggregates before calling the database", async () => {
    const rpc = vi.fn(); context(rpc, "provider");
    expect(await getPrelaunchSnapshot()).toBeNull(); expect(rpc).not.toHaveBeenCalled();
  });
  it("keeps a real empty snapshot distinguishable from failed reads", async () => {
    context(vi.fn(() => ({ abortSignal: vi.fn().mockResolvedValue({ data: snapshot, error: null }) })));
    expect(await getPrelaunchSnapshot()).toEqual(snapshot);
    context(vi.fn(() => ({ abortSignal: vi.fn().mockRejectedValue(new Error("transport")) })));
    expect(await getPrelaunchSnapshot()).toBeNull();
  });
  it.each([
    { ...snapshot, version: 3 }, { ...snapshot, version: "2" },
    { ...snapshot, network: { ...snapshot.network, published: -1 } },
    { ...snapshot, readiness: { ...snapshot.readiness, ready: "0" } },
    { ...snapshot, settings: { launch_security_blockers: {} } },
    { ...snapshot, capacity: [{ district: "TEST", stores: 1 }] },
    { ...snapshot, version: 1, capacity: "invalid legacy extension" },
  ])("rejects incompatible or partial operational evidence", async data => {
    context(vi.fn(() => ({ abortSignal: vi.fn().mockResolvedValue({ data, error: null }) })));
    expect(await getPrelaunchSnapshot()).toBeNull();
  });
  it("retains legacy metrics without manufacturing new readiness counts", async () => {
    const legacy = { network: snapshot.network, interest: 0, pilot: [], settings: {} };
    context(vi.fn(() => ({ abortSignal: vi.fn().mockResolvedValue({ data: { ...legacy, version: 1 }, error: null }) })));
    expect((await getPrelaunchSnapshot())?.readiness).toBeUndefined();
  });
  it("does not report an incomplete partner payload as a completed profile", async () => {
    context(vi.fn(() => ({ abortSignal: vi.fn().mockResolvedValue({ data: { published: true, service_count: 1, districts: [] }, error: null }) })));
    expect(await getPartnerReadiness(id)).toBeNull();
  });
  it("does not mutate a store when the persistent limiter denies the request", async () => {
    const rpc = vi.fn(); context(rpc, "provider"); limit.mockResolvedValue({ allowed: false } as Awaited<ReturnType<typeof checkRateLimitWithRedis>>);
    const response = await saveStore(new NextRequest("https://fuwu.test/api/commerce/store", { method: "POST", headers: { origin: "https://fuwu.test", "content-type": "application/json" }, body: JSON.stringify({ providerId: id, offerings: [], hours: [], daysOff: [] }) }));
    expect(response.status).toBe(429); expect(rpc).not.toHaveBeenCalled();
  });
  it("does not invalidate caches or claim profile success after a rejected transaction", async () => {
    context(vi.fn().mockRejectedValue(new Error("sensitive SQL error")), "provider", { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id }, error: null }) }) }) }) });
    limit.mockResolvedValue({ allowed: true } as Awaited<ReturnType<typeof checkRateLimitWithRedis>>);
    const form = new FormData(); form.set("name", "TEST Partner"); form.set("description", "TEST sufficiently long factual service description.");
    const result = await savePartnerProfile({ ok: false, message: "" }, form);
    expect(result.ok).toBe(false); expect(result.message).not.toContain("sensitive SQL error"); expect(revalidatePath).not.toHaveBeenCalled();
  });
  it.each(["store", "calendar"])("routes a focused %s update without writing the other form snapshot", async mode => {
    const rpc = vi.fn().mockResolvedValue({ error: null }); context(rpc, "provider");
    limit.mockResolvedValue({ allowed: true } as Awaited<ReturnType<typeof checkRateLimitWithRedis>>);
    const body = { providerId: id, mode, offerings: [], hours: [], daysOff: [] };
    const response = await saveStore(new NextRequest("https://fuwu.test/api/commerce/store", { method: "POST", headers: { origin: "https://fuwu.test", "content-type": "application/json" }, body: JSON.stringify(body) }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledExactlyOnceWith(mode === "calendar" ? "partner_save_calendar" : "partner_save_services", mode === "calendar" ? { p_provider_id: id, p_hours: [], p_days_off: [] } : { p_provider_id: id, p_offerings: [] });
  });
});
