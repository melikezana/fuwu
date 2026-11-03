import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { authChecks, contentChecks, environmentChecks, supabaseDashboardUrl } from "@/services/admin/setup-status";

const secrets = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-SECRET-VALUE-1",
  SUPABASE_SERVICE_ROLE_KEY: "service-SECRET-VALUE-2",
  NEXT_PUBLIC_SITE_URL: "https://www.fuwu.com.tr",
  CRON_SECRET: "cron-SECRET-VALUE-3-xxxxxxxxxxxxxxxxxxxxxxxx",
  UPSTASH_REDIS_REST_URL: "https://redis.example",
  UPSTASH_REDIS_REST_TOKEN: "redis-SECRET-VALUE-4",
  NEXT_PUBLIC_SENTRY_DSN: "https://dsn.example/1",
  SMS_PROVIDER: "netgsm",
  NETGSM_USERCODE: "netgsm-SECRET-VALUE-5",
  NETGSM_PASSWORD: "netgsm-SECRET-VALUE-6",
  NETGSM_HEADER: "FUWU",
  SUPABASE_SEND_SMS_HOOK_SECRET: "v1,whsec_SECRET-VALUE-7",
  IYZICO_API_KEY: "iyzico-SECRET-VALUE-8",
  IYZICO_SECRET_KEY: "iyzico-SECRET-VALUE-9",
  IYZICO_BASE_URL: "https://sandbox-api.iyzipay.com",
  OPENAI_API_KEY: "openai-SECRET-VALUE-10",
};

describe("kurulum durumu: ortam ayarları", () => {
  it("hiçbir gizli değeri ekrana taşımaz", () => {
    const output = JSON.stringify(environmentChecks(secrets));
    expect(output).not.toMatch(/SECRET-VALUE/);
    expect(output).not.toContain("redis.example");
  });

  it("tam kurulumda kritik eksik göstermez", () => {
    const checks = environmentChecks(secrets);
    expect(checks.filter(check => check.status === "fail")).toEqual([]);
    expect(checks.find(check => check.id === "sms")?.status).toBe("ok");
  });

  it("eksik ayarları ad ad söyler", () => {
    const checks = environmentChecks({});
    for (const id of ["supabase", "service-role", "cron", "sms", "payment"]) expect(checks.find(check => check.id === id)?.status).toBe("fail");
    const sms = checks.find(check => check.id === "sms")!;
    expect(sms.detail).toContain("SMS_PROVIDER=netgsm");
    expect(sms.detail).toContain("SUPABASE_SEND_SMS_HOOK_SECRET");
  });

  it("Vercel'in Upstash entegrasyonu adlarını da hazır sayar", () => {
    const { UPSTASH_REDIS_REST_URL: _url, UPSTASH_REDIS_REST_TOKEN: _token, ...rest } = secrets;
    void _url; void _token;
    expect(environmentChecks({ ...rest, KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "kv-SECRET" }).find(check => check.id === "rate-limit")?.status).toBe("ok");
    expect(environmentChecks(rest).find(check => check.id === "rate-limit")?.status).toBe("warn");
  });

  it("kısa cron anahtarını uyarır", () => {
    expect(environmentChecks({ ...secrets, CRON_SECRET: "kisa" }).find(check => check.id === "cron")?.status).toBe("warn");
  });
});

describe("kurulum durumu: giriş ayarları", () => {
  it("telefon girişi kapalıysa kritik eksik sayar", () => {
    const checks = authChecks({ external: { email: true, google: true, phone: false } }, null);
    expect(checks.find(check => check.id === "phone")?.status).toBe("fail");
    expect(checks.find(check => check.id === "anonymous")?.status).toBe("ok");
  });
  it("okunamayan ayarları ve paneldeki kancaları elle kontrol ettirir", () => {
    const checks = authChecks(null, supabaseDashboardUrl(secrets));
    expect(checks[0].status).toBe("warn");
    expect(checks.filter(check => check.status === "manual").length).toBeGreaterThanOrEqual(3);
    expect(checks.find(check => check.id === "sms-hook")?.href).toBe("https://supabase.com/dashboard/project/abcdefghijklmnopqrst");
  });
});

function fakeDb(options: { trustCode?: string; providers?: { id: string; record_kind: string }[]; offers?: { service_id: string }[] }) {
  const counted = (count: number) => ({ eq: () => Promise.resolve({ count, error: null }), in: () => ({ is: () => Promise.resolve({ count, error: null }) }), then: (resolve: (value: unknown) => void) => resolve({ count: 0, error: { code: "42501" } }) });
  return {
    rpc(name: string) {
      if (name === "commerce_order_trust") return Promise.resolve({ data: null, error: { code: options.trustCode ?? "42501" } });
      if (name === "provider_publication_gate") return Promise.resolve({ data: options.providers ?? [], error: null });
      if (name === "commerce_offers") return Promise.resolve({ data: options.offers ?? [], error: null });
      throw new Error(name);
    },
    from(table: string) {
      if (table === "service_categories") return { select: () => ({ eq: () => Promise.resolve({ data: [{ id: "c1", name: "Temizlik", is_visible: true }, { id: "c2", name: "Tesisat", is_visible: true }, { id: "c3", name: "Gizli", is_visible: false }], error: null }) }) };
      if (table === "service_catalog") return { select: () => ({ eq: () => Promise.resolve({ data: [{ id: "s1", category_id: "c2" }], error: null }) }) };
      return { select: () => counted(table === "provider_applications" ? 2 : table === "provider_document_rules" ? 2 : 0) };
    },
  } as unknown as SupabaseClient<Database>;
}

describe("kurulum durumu: içerik", () => {
  it("yayında usta yoksa, boş kategori ve satılamayan hizmetleri gösterir", async () => {
    const checks = await contentChecks(fakeDb({}));
    expect(checks.find(check => check.id === "migrations")?.status).toBe("ok");
    expect(checks.find(check => check.id === "published")?.status).toBe("fail");
    const catalog = checks.find(check => check.id === "catalog")!;
    expect(catalog.status).toBe("warn");
    expect(catalog.detail).toContain("Temizlik");
    expect(catalog.detail).not.toContain("Gizli");
    expect(checks.find(check => check.id === "sellable")?.status).toBe("fail");
    expect(checks.find(check => check.id === "applications")?.detail).toContain("2 başvuru");
    expect(checks.find(check => check.id === "rules")?.status).toBe("info");
  });
  it("migration eksikse veritabanı güncelliğini kritik eksik sayar", async () => {
    const checks = await contentChecks(fakeDb({ trustCode: "PGRST202" }));
    expect(checks.find(check => check.id === "migrations")?.status).toBe("fail");
  });
  it("gerçek ustalar ve teklifler varsa hazır gösterir", async () => {
    const checks = await contentChecks(fakeDb({ providers: [{ id: "p1", record_kind: "real" }, { id: "p2", record_kind: "test" }], offers: [{ service_id: "s1" }] }));
    expect(checks.find(check => check.id === "published")?.detail).toBe("1 usta yayında.");
    expect(checks.find(check => check.id === "sellable")?.status).toBe("ok");
  });
});
