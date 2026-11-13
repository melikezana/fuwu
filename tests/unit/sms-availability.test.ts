import { describe, expect, it } from "vitest";
import { isAuthSmsConfigured } from "@/lib/sms/availability";

const full = { NODE_ENV: "production", SMS_PROVIDER: "netgsm", NETGSM_USERCODE: "u", NETGSM_PASSWORD: "p", NETGSM_HEADER: "FUWU", SUPABASE_SEND_SMS_HOOK_SECRET: "v1,whsec_x" };

describe("auth SMS availability", () => {
  it("is on in development and E2E, where local Supabase handles phone codes", () => {
    expect(isAuthSmsConfigured({ NODE_ENV: "development" })).toBe(true);
  });
  it("requires NetGSM and the Send SMS hook secret in production", () => {
    expect(isAuthSmsConfigured(full)).toBe(true);
    for (const key of ["SMS_PROVIDER", "NETGSM_USERCODE", "NETGSM_PASSWORD", "NETGSM_HEADER", "SUPABASE_SEND_SMS_HOOK_SECRET"] as const)
      expect(isAuthSmsConfigured({ ...full, [key]: " " })).toBe(false);
    expect(isAuthSmsConfigured({ ...full, SMS_PROVIDER: "mock" })).toBe(false);
  });
});
