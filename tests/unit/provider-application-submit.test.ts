import { beforeEach, describe, expect, it, vi } from "vitest";

// Sahte Supabase: her sorgu zinciri tabloya göre sonuçlanır; yapılan insert'ler kaydedilir.
const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];
let user: Record<string, unknown> | null = null;
let insertError: { message: string; code?: string } | null = null;
function builder(table: string) {
  let inserting: Record<string, unknown> | null = null;
  const result = () => {
    if (inserting && table === "provider_applications") return insertError ? { data: null, error: insertError } : { data: { id: "ac000000-0000-4000-8000-000000000001" }, error: null };
    if (table === "service_categories" || table === "districts") return { data: { id: "lookup" }, error: null };
    if (table === "profiles") return { data: { id: user?.id, full_name: "Usta Aday", phone: null, avatar_url: null }, error: null };
    return { data: null, error: null };
  };
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "limit", "order", "update", "upsert", "abortSignal"]) chain[method] = () => chain;
  chain.insert = (row: Record<string, unknown>) => { inserting = row; inserts.push({ table, row }); return chain; };
  chain.single = async () => result();
  chain.maybeSingle = async () => result();
  chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result()).then(resolve, reject);
  return chain;
}
const supabase = {
  auth: { getUser: async () => ({ data: { user }, error: null }) },
  from: (table: string) => builder(table),
  rpc: () => ({ abortSignal: async () => ({ data: { allowed: true, remaining: 4, resetAt: Date.now() + 1000 }, error: null }), then: (r: (v: unknown) => unknown) => Promise.resolve({ data: { allowed: true, remaining: 4, resetAt: Date.now() + 1000 }, error: null }).then(r) }),
};
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => supabase, isSupabaseServerConfigured: true }));
vi.mock("@/lib/security/rateLimitRedis", () => ({ checkRateLimitWithRedis: async () => ({ allowed: true, remaining: 4, resetAt: Date.now() + 1000 }) }));
vi.mock("@/services/notifications/partner-sms", () => ({ notifyAdminOfNewApplication: () => undefined }));
vi.mock("@/services/notifications", () => ({ notifyProviderApplicationSubmitted: async () => undefined }));
vi.mock("@/services/audit", () => ({ writeAuditLog: async () => undefined }));

import { submitProviderApplication } from "@/services/providers/applications";
import { PROVIDER_APPLICATION_NOTICE_VERSION } from "@/lib/legal/notices";

const input = { fullName: "Usta Aday", phone: "05370000000", categoryId: "30000000-0000-4000-8000-000000000001", districtId: "40000000-0000-4000-8000-000000000001", availability: "", hasEquipment: "", experienceYears: "", introduction: "", portfolioUrl: "", privacyNoticeVersion: PROVIDER_APPLICATION_NOTICE_VERSION };

beforeEach(() => { inserts.length = 0; insertError = null; user = { id: "ab000000-0000-4000-8000-000000000001", email: "aday@example.invalid", phone: "", phone_confirmed_at: null, user_metadata: {} }; });

describe("provider application submit without SMS", () => {
  it("accepts a signed-in applicant whose phone was never verified by SMS", async () => {
    const result = await submitProviderApplication(input);
    expect(result.mode).toBe("live");
    const application = inserts.find(entry => entry.table === "provider_applications")?.row;
    expect(application).toMatchObject({ status: "pending", phone: "+905370000000", privacy_notice_version: PROVIDER_APPLICATION_NOTICE_VERSION });
    // Doğrulama bayrağını istemci/servis yazmaz; veritabanı tetikleyicisi belirler.
    expect(application).not.toHaveProperty("phone_verified_on_submit");
  });

  it("still requires a signed-in account and the privacy notice acknowledgement", async () => {
    user = null;
    await expect(submitProviderApplication(input)).rejects.toMatchObject({ publicMessage: "Giriş yaparak devam etmelisin." });
    user = { id: "ab000000-0000-4000-8000-000000000001", user_metadata: {} };
    await expect(submitProviderApplication({ ...input, privacyNoticeVersion: "" })).rejects.toBeTruthy();
    expect(inserts.filter(entry => entry.table === "provider_applications")).toHaveLength(0);
  });

  it("explains database rule refusals in plain Turkish", async () => {
    for (const [message, expected] of [["phone_belongs_to_other_account", "başka bir FUWU hesabında"], ["mobile_phone_required", "cep telefonu"], ["privacy_notice_required", "aydınlatma metnini"]]) {
      insertError = { message, code: "42501" };
      await expect(submitProviderApplication(input)).rejects.toMatchObject({ publicMessage: expect.stringContaining(expected) });
    }
  });
});
