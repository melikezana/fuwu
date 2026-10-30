import { beforeEach, describe, expect, it, vi } from "vitest";
import { providerControlError } from "@/lib/providers/control";
import { assessPartnerReadiness, type PartnerReadiness } from "@/lib/providers/readiness";
const { auth, rpc, select } = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), select: vi.fn() }));
vi.mock("@/services/auth/server", () => ({ getServerAuthContext: auth }));
import { runProviderControl } from "@/services/admin/provider-control";
const id = "ac000000-0000-4000-8000-000000000004";
const input = { providerId: id, action: "unpublish", reason: "TEST profile withdrawn", expectedVersion: "a".repeat(32), requestId: "ac000000-0000-4000-8000-000000000008" };
function answer(value: unknown) { return { abortSignal: vi.fn().mockResolvedValue(value) }; }
beforeEach(() => { auth.mockResolvedValue({ supabase: { rpc, from: select }, user: { id }, profile: { role: "admin" } }); });
describe("provider control boundaries", () => {
 it.each(["PGRST202", "42883", "42P01", "42703"])("identifies missing schema %s", code => { expect(providerControlError({ code, message: "private SQL" })).toMatchObject({ code: "schema_missing", ok: false }); expect(JSON.stringify(providerControlError({ code, message: "private SQL" }))).not.toContain("private SQL"); });
 it.each([["40001", "", "conflict"], ["42501", "", "forbidden"], ["P0001", "rate_limited", "rate_limited"], ["22023", "verification_evidence_required", "evidence_required"], ["22023", "provider_not_found", "not_found"]])("maps safe diagnostics", (code, message, result) => expect(providerControlError({ code, message }).code).toBe(result));
 it("rejects nonadmin before RPC", async () => { auth.mockResolvedValue({ supabase: { rpc }, user: { id }, profile: { role: "provider" } }); expect((await runProviderControl(input)).code).toBe("forbidden"); expect(rpc).not.toHaveBeenCalled(); });
 it("rejects malformed serialized action input without throwing", async () => { expect((await runProviderControl(null as unknown as typeof input)).code).toBe("invalid"); expect((await runProviderControl({ ...input, reason: 7 } as unknown as typeof input)).code).toBe("invalid"); expect(rpc).not.toHaveBeenCalled(); });
 it.each([{ providerId: "bad" }, { requestId: "bad" }, { action: "delete" }, { expectedVersion: "bad" }, { reason: "short" }])("rejects invalid intent", async patch => { expect((await runProviderControl({ ...input, ...patch })).code).toBe("invalid"); expect(rpc).not.toHaveBeenCalled(); });
 it("reports missing RPC without falling back to a direct UPDATE", async () => { rpc.mockReturnValue(answer({ data: null, error: { code: "PGRST202" } })); expect((await runProviderControl(input)).code).toBe("schema_missing"); expect(select).not.toHaveBeenCalled(); });
 it("does not report success until committed state is read", async () => { rpc.mockReturnValueOnce(answer({ data: { ok: true, provider_id: id, action: "unpublish", published: false, version: "b".repeat(32) }, error: null })).mockReturnValueOnce(answer({ data: null, error: { code: "08006" } })); expect((await runProviderControl(input)).code).toBe("verification_unavailable"); });
 it("rejects a superseded receipt", async () => { rpc.mockReturnValueOnce(answer({ data: { ok: true, provider_id: id, action: "unpublish", published: false, version: "b".repeat(32) } })).mockReturnValueOnce(answer({ data: { state: { version: "c".repeat(32), published: true } } })); expect((await runProviderControl(input)).code).toBe("conflict"); });
 it("confirms publication and version after transaction", async () => { rpc.mockReturnValueOnce(answer({ data: { ok: true, provider_id: id, action: "unpublish", published: false, version: "b".repeat(32) } })).mockReturnValueOnce(answer({ data: { state: { version: "b".repeat(32), published: false, status: "hidden" } } })); expect(await runProviderControl(input)).toMatchObject({ ok: true, published: false, message: "Usta yayından kaldırıldı." }); });
 it("handles connection loss safely", async () => { rpc.mockImplementationOnce(() => { throw new Error("connection lost with credentials"); }); const result = await runProviderControl(input); expect(result.ok).toBe(false); expect(result.message).not.toContain("credentials"); });
});
describe("partner readiness is independent of trust and performance", () => {
 const complete: PartnerReadiness = { status: "approved", published: true, active: true, approved: true, record_kind: "real", identity_verified: false, phone_verified: false, professional_verified: false, description: "Factual service description that is long enough.", phone: "+905550000001", photo: "/test.png", category_id: id, district_id: id, service_count: 1, calendar_days: 5, districts: ["Kadıköy"], has_document: true };
 it("100% profile does not imply verified identity", () => { expect(assessPartnerReadiness(complete)).toMatchObject({ completion: 100, verified: false, ready: false, stage: 2 }); });
 it("verification does not imply publication", () => { expect(assessPartnerReadiness({ ...complete, identity_verified: true, phone_verified: true, published: false })).toMatchObject({ verified: true, ready: false, stage: 3 }); });
 it("requires services and calendar before stage 4", () => { expect(assessPartnerReadiness({ ...complete, identity_verified: true, phone_verified: true, calendar_days: 0 }).ready).toBe(false); });
 it("computes readiness only from the supplied facts", () => { expect(assessPartnerReadiness({ ...complete, identity_verified: true, phone_verified: true })).toMatchObject({ completion: 100, verified: true, ready: true, stage: 4 }); });
});
