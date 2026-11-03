import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/sms-hook/route";
import { GET as health } from "@/app/api/health/route";
import { normalizeTurkishMobile, smsHookRecipient, verifyStandardWebhook } from "@/lib/sms/authHook";

const key = crypto.randomBytes(32);
const secret = `v1,whsec_${key.toString("base64")}`;
let counter = 0;

function signed(payload: unknown, options: { timestamp?: number; signWith?: Buffer } = {}) {
  const body = JSON.stringify(payload);
  const id = `msg_${++counter}`;
  const timestamp = String(options.timestamp ?? Math.floor(Date.now() / 1000));
  const signature = crypto.createHmac("sha256", options.signWith ?? key).update(`${id}.${timestamp}.${body}`).digest("base64");
  return new NextRequest("https://fuwu.test/api/auth/sms-hook", {
    method: "POST",
    headers: { "content-type": "application/json", "webhook-id": id, "webhook-timestamp": timestamp, "webhook-signature": `v1,${signature}` },
    body,
  });
}

const payload = (phone: string, extra: Record<string, unknown> = {}) => ({ user: { id: crypto.randomUUID(), phone, ...extra }, sms: { otp: "482915" } });

describe("Supabase SMS kancası (NetGSM)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.stubEnv("SUPABASE_SEND_SMS_HOOK_SECRET", secret);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SMS_PROVIDER", "netgsm");
    vi.stubEnv("NETGSM_USERCODE", "test-user");
    vi.stubEnv("NETGSM_PASSWORD", "test-pass");
    vi.stubEnv("NETGSM_HEADER", "FUWU");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    fetchMock = vi.fn(async () => new Response("00 1234567890"));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("imzasız, yanlış anahtarla imzalı veya bayat isteği reddeder; SMS göndermez", async () => {
    const unsigned = new NextRequest("https://fuwu.test/api/auth/sms-hook", { method: "POST", body: JSON.stringify(payload("+905551110001")) });
    expect((await POST(unsigned)).status).toBe(401);
    expect((await POST(signed(payload("+905551110001"), { signWith: crypto.randomBytes(32) }))).status).toBe(401);
    expect((await POST(signed(payload("+905551110001"), { timestamp: Math.floor(Date.now() / 1000) - 600 }))).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("anahtar tanımlı değilse hiçbir isteği kabul etmez", async () => {
    vi.stubEnv("SUPABASE_SEND_SMS_HOOK_SECRET", "");
    expect((await POST(signed(payload("+905551110002")))).status).toBe(503);
  });

  it("yalnızca Türkiye cep numaralarına gönderir (SMS pompalama koruması)", async () => {
    for (const phone of ["+447700900123", "+12025550123", "+902121234567"]) {
      const response = await POST(signed(payload(phone)));
      expect(response.status).toBe(400);
      expect((await response.json()).error.http_code).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("geçerli istekte NetGSM'e Türkçe kodlu mesaj gönderir ve Supabase'e 200 döner", async () => {
    const response = await POST(signed(payload("+905551110003")));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({});
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("api.netgsm.com.tr");
    const sent = new URLSearchParams(String(init.body));
    expect(sent.get("gsmno")).toBe("5551110003");
    expect(sent.get("dil")).toBe("TR");
    expect(sent.get("msgheader")).toBe("FUWU");
    expect(sent.get("message")).toContain("482915");
    expect(sent.get("message")).toContain("kimseyle paylaşma");
  });

  it("telefon değişikliğinde kodu yeni numaraya gönderir", async () => {
    const response = await POST(signed(payload("", { new_phone: "905551110004" })));
    expect(response.status).toBe(200);
    expect(new URLSearchParams(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body)).get("gsmno")).toBe("5551110004");
  });

  it("canlıda sahte sağlayıcıyla gönderilmiş gibi davranmaz", async () => {
    vi.stubEnv("SMS_PROVIDER", "mock");
    expect((await POST(signed(payload("+905551110005")))).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("NetGSM hata kodunda Supabase'e hata döner", async () => {
    fetchMock.mockResolvedValueOnce(new Response("30"));
    expect((await POST(signed(payload("+905551110006")))).status).toBe(502);
  });

  it("aynı numaraya kısa sürede 5'ten fazla kod gönderilmez", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await POST(signed(payload("+905551110007")))).status);
    expect(statuses.slice(0, 5).every(status => status === 200)).toBe(true);
    expect(statuses[5]).toBe(429);
  });

  it("geçersiz kod biçimini reddeder", async () => {
    const request = signed({ user: { phone: "+905551110008" }, sms: { otp: "12ab" } });
    expect((await POST(request)).status).toBe(400);
  });
});

describe("SMS kancası yardımcıları", () => {
  it("Türkiye cep numarasını tek biçime getirir", () => {
    expect(normalizeTurkishMobile("+90 555 111 22 33")).toBe("905551112233");
    expect(normalizeTurkishMobile("05551112233")).toBe("905551112233");
    expect(normalizeTurkishMobile("5551112233")).toBe("905551112233");
    expect(normalizeTurkishMobile("00905551112233")).toBe("905551112233");
    expect(normalizeTurkishMobile("+902121112233")).toBeNull();
    expect(normalizeTurkishMobile("+447700900123")).toBeNull();
  });
  it("yeni numara yabancıysa eski numaraya geri düşmez", () => {
    expect(smsHookRecipient({ user: { phone: "905551112233", new_phone: "+447700900123" } })).toBeNull();
  });
  it("anahtar değişiminde iki anahtardan biri yeterlidir", () => {
    const body = "{}", id = "msg_x", ts = String(Math.floor(Date.now() / 1000));
    const signature = `v1,${crypto.createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64")}`;
    const other = `v1,whsec_${crypto.randomBytes(32).toString("base64")}`;
    expect(verifyStandardWebhook(`${other}|${secret}`, { id, timestamp: ts, signature }, body)).toBe(true);
    expect(verifyStandardWebhook(other, { id, timestamp: ts, signature }, body)).toBe(false);
  });
});

describe("sağlık ucu", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  it("veritabanına ulaşılamazsa 503 döner ve iç ayrıntı vermez", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    const response = await health(new NextRequest("https://fuwu.test/api/health", { headers: { "x-vercel-forwarded-for": "198.51.100.7" } }));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.status).toBe("degraded");
    expect(body.database).toBe("fail");
    expect(JSON.stringify(body)).not.toMatch(/network down|supabase|key/i);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
