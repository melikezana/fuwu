import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { notifyProviderAfterResponse, notifyProviderOfConfirmedOrder, providerNewOrderText } from "@/services/commerce/provider-order-sms";

type State = { claims: Set<string>; order: Record<string, unknown> | null; provider: Record<string, unknown> | null };
const orderId = "7f0c3b2e-4d1a-4c55-9a0e-1b2c3d4e5f60";

function fakeDb(state: State) {
  const single = (data: unknown) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data, error: null }) }) }) });
  return {
    from(table: string) {
      if (table === "order_sms_dispatches") return {
        insert: async (row: { order_id: string }) => {
          if (state.claims.has(row.order_id)) return { error: { code: "23505", message: "duplicate key" } };
          state.claims.add(row.order_id);
          return { error: null };
        },
        delete: () => ({ eq: (_c: string, id: string) => ({ eq: async () => { state.claims.delete(id); return { error: null }; } }) }),
      };
      if (table === "commerce_orders") return single(state.order);
      if (table === "providers") return single(state.provider);
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as SupabaseClient<Database>;
}

const confirmedOrder = { status: "CONFIRMED", provider_id: "p1", service_name: "Klima bakımı", starts_at: "2026-11-05T11:00:00Z", district_name: "Kadıköy" };

describe("ustaya yeni randevu SMS'i", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let state: State;
  beforeEach(() => {
    vi.stubEnv("SMS_PROVIDER", "netgsm");
    vi.stubEnv("NETGSM_USERCODE", "test-user");
    vi.stubEnv("NETGSM_PASSWORD", "test-pass");
    vi.stubEnv("NETGSM_HEADER", "FUWU");
    vi.stubEnv("ORDER_SMS_ENABLED", "");
    fetchMock = vi.fn(async () => new Response("00 99"));
    vi.stubGlobal("fetch", fetchMock);
    state = { claims: new Set(), order: { ...confirmedOrder }, provider: { phone: "+90 555 123 45 67" } };
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("onaylanan siparişte ustaya bir kez gönderir; müşterinin kişisel bilgisini yazmaz", async () => {
    expect(await notifyProviderOfConfirmedOrder(fakeDb(state), orderId)).toBe("sent");
    expect(await notifyProviderOfConfirmedOrder(fakeDb(state), orderId)).toBe("skipped");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sent = new URLSearchParams(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(sent.get("gsmno")).toBe("5551234567");
    expect(sent.get("message")).toContain("Yeni randevun var");
    expect(sent.get("message")).toContain("Klima bakımı");
    expect(sent.get("message")).toContain("Kadıköy");
    expect(sent.get("message")).toContain("14:00");
  });

  it("NetGSM kapalıyken veya ORDER_SMS_ENABLED=false iken göndermez", async () => {
    vi.stubEnv("SMS_PROVIDER", "mock");
    expect(await notifyProviderOfConfirmedOrder(fakeDb(state), orderId)).toBe("skipped");
    vi.stubEnv("SMS_PROVIDER", "netgsm");
    vi.stubEnv("ORDER_SMS_ENABLED", "false");
    expect(await notifyProviderOfConfirmedOrder(fakeDb(state), orderId)).toBe("skipped");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(state.claims.size).toBe(0);
  });

  it("onaylanmamış siparişte göndermez ve kaydı geri bırakır", async () => {
    state.order = { ...confirmedOrder, status: "PAYMENT_FAILED" };
    expect(await notifyProviderOfConfirmedOrder(fakeDb(state), orderId)).toBe("skipped");
    expect(state.claims.size).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("yurt dışı veya geçersiz usta numarasına göndermez", async () => {
    state.provider = { phone: "+447700900123" };
    expect(await notifyProviderOfConfirmedOrder(fakeDb(state), orderId)).toBe("skipped");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("NetGSM hatasında kaydı geri bırakır; sonraki bildirim yeniden dener", async () => {
    fetchMock.mockResolvedValueOnce(new Response("30"));
    expect(await notifyProviderOfConfirmedOrder(fakeDb(state), orderId)).toBe("failed");
    expect(state.claims.size).toBe(0);
    expect(await notifyProviderOfConfirmedOrder(fakeDb(state), orderId)).toBe("sent");
  });

  it("uzun hizmet ve ilçe adlarında bile tek SMS'e sığar", () => {
    const text = providerNewOrderText({ service_name: "Çok uzun bir hizmet adı: kombi bakımı, petek temizliği ve kaçak testi", starts_at: "2026-12-31T21:30:00Z", district_name: "Büyükçekmece Çok Uzun İlçe Adı" });
    expect(text.length).toBeLessThanOrEqual(155);
  });

  it("istek bağlamı dışında çağrıldığında hata fırlatmaz", async () => {
    expect(() => notifyProviderAfterResponse(fakeDb(state), orderId)).not.toThrow();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});
