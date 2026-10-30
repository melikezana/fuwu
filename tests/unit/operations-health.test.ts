import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { getOperationsHealth } from "@/services/health/operations";
import { evidenceState, type HealthEvidence } from "@/lib/commerce/operations-health";

const now = Date.parse("2026-10-30T12:00:00Z");
const valid = { checked_at: "2026-10-30T11:00:00Z", contract_ok: true, missing_contracts: [], audit_last_event_at: null, probes: [] };
function database(value: unknown, rejected = false) {
  const response = vi.fn();
  if (rejected) response.mockRejectedValue(new Error("private transport failure"));
  else response.mockResolvedValue({ data: value, error: null });
  return { rpc: () => ({ abortSignal: response }) } as unknown as SupabaseClient<Database>;
}
describe("health evidence integrity", () => {
  it.each([[], {}, { ...valid, probes: null }, { ...valid, checked_at: "invalid" }, { ...valid, probes: [{ name: "google", passed: true }] }])("does not render partial or incompatible RPC results as successful controls", async value => {
    expect(await getOperationsHealth(database(value))).toBeNull();
  });
  it("preserves valid empty evidence and catches network rejection", async () => {
    expect(await getOperationsHealth(database(valid))).toEqual(valid);
    expect(await getOperationsHealth(database(null, true))).toBeNull();
  });
  it("does not turn invalid or future timestamps into a successful control", () => {
    const evidence: HealthEvidence = { name: "schema", passed: true, detail: "TEST", checked_at: "invalid", last_success_at: null };
    expect(evidenceState(evidence, now)).toBe("Kontrol tarihi doğrulanamadı");
    expect(evidenceState({ ...evidence, checked_at: "2026-10-31T12:00:00Z" }, now)).toBe("Kontrol tarihi doğrulanamadı");
    expect(evidenceState({ ...evidence, checked_at: valid.checked_at }, now)).toBe("Kontrol başarılı");
  });
});
