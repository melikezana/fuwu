import { afterEach, beforeEach, vi } from "vitest";

// All Node unit/security suites are offline. Any unmocked fetch is a failure.
beforeEach(() => {
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "IYZICO_API_KEY", "IYZICO_SECRET_KEY", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]) vi.stubEnv(key, "");
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden in offline tests"); }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
