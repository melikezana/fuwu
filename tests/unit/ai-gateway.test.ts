import { describe, expect, it, vi } from "vitest";
import { AiGatewayError, buildAnthropicPayload, buildOpenAiPayload, extractAnthropicJson, extractOpenAiJson, requestStructuredJson, resolveAiProviders, type AiProviderConfig, type StructuredJsonRequest } from "@/lib/ai/model-gateway";

const request: StructuredJsonRequest = {
  instructions: "sistem",
  maxOutputTokens: 100,
  schema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"], additionalProperties: false },
  schemaDescription: "test",
  schemaName: "fuwu_test",
  userText: "merhaba",
};
const anthropic: AiProviderConfig = { apiKey: "anthropic-SECRET", model: "model-a", provider: "anthropic" };
const openai: AiProviderConfig = { apiKey: "openai-SECRET", model: "model-o", provider: "openai" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "request-id": "req_1", "x-request-id": "req_1" } });

describe("yapay zekâ kapısı · sağlayıcı seçimi", () => {
  it("anahtarı ve modeli birlikte tanımlı olmayan sağlayıcıyı kullanmaz", () => {
    expect(resolveAiProviders({})).toEqual([]);
    expect(resolveAiProviders({ OPENAI_API_KEY: "k" })).toEqual([]);
    expect(resolveAiProviders({ ANTHROPIC_MODEL: "m" })).toEqual([]);
    expect(resolveAiProviders({ OPENAI_API_KEY: " k ", OPENAI_VISION_MODEL: " m " })).toEqual([{ apiKey: "k", model: "m", provider: "openai" }]);
  });

  it("ikisi de tanımlıysa AI_PROVIDER sırayı belirler, diğeri yedek kalır", () => {
    const env = { ANTHROPIC_API_KEY: "a", ANTHROPIC_MODEL: "ma", OPENAI_API_KEY: "o", OPENAI_VISION_MODEL: "mo" };
    expect(resolveAiProviders(env).map(item => item.provider)).toEqual(["anthropic", "openai"]);
    expect(resolveAiProviders({ ...env, AI_PROVIDER: "OpenAI" }).map(item => item.provider)).toEqual(["openai", "anthropic"]);
    expect(resolveAiProviders({ ...env, AI_PROVIDER: "bilinmeyen" }).map(item => item.provider)).toEqual(["anthropic", "openai"]);
  });
});

describe("yapay zekâ kapısı · istek ve yanıt biçimi", () => {
  const image = "data:image/png;base64,AAAA";

  it("Anthropic isteğinde şemayı zorunlu araç olarak, görseli base64 bloğu olarak gönderir", () => {
    const payload = buildAnthropicPayload(anthropic, { ...request, imageDataUrl: image });
    expect(payload.tool_choice).toEqual({ type: "tool", name: "fuwu_test" });
    expect(payload.tools[0].input_schema).toBe(request.schema);
    expect(payload.messages[0].content[0]).toEqual({ type: "image", source: { type: "base64", media_type: "image/png", data: "AAAA" } });
    expect(payload.system).toBe("sistem");
  });

  it("desteklenmeyen görsel adresini sağlayıcıya göndermez", () => {
    expect(() => buildAnthropicPayload(anthropic, { ...request, imageDataUrl: "https://example.com/a.png" })).toThrow(AiGatewayError);
    expect(() => buildOpenAiPayload(openai, { ...request, imageDataUrl: "data:text/html;base64,AAAA" })).toThrow(AiGatewayError);
  });

  it("OpenAI isteğinde katı JSON şeması kullanır ve yanıtı saklatmaz", () => {
    const payload = buildOpenAiPayload(openai, request);
    expect(payload.store).toBe(false);
    expect(payload.text.format).toMatchObject({ type: "json_schema", strict: true, name: "fuwu_test" });
  });

  it("yanıttan yalnızca beklenen yapıdaki JSON'u çıkarır", () => {
    expect(extractAnthropicJson({ content: [{ type: "text", text: "x" }, { type: "tool_use", name: "fuwu_test", input: { ok: true } }] }, "fuwu_test")).toEqual({ ok: true });
    expect(extractAnthropicJson({ content: [{ type: "tool_use", name: "baska_arac", input: { ok: true } }] }, "fuwu_test")).toBeUndefined();
    expect(extractOpenAiJson({ output_text: '{"ok":true}' })).toEqual({ ok: true });
    expect(extractOpenAiJson({ output: [{ content: [{ type: "output_text", text: '{"ok":false}' }] }] })).toEqual({ ok: false });
    expect(extractOpenAiJson({ output_text: "json değil" })).toBeUndefined();
  });
});

describe("yapay zekâ kapısı · yedekleme", () => {
  it("sağlayıcı yoksa çağrı yapmadan hata verir", async () => {
    const fetchImpl = vi.fn();
    await expect(requestStructuredJson(request, { fetchImpl, providers: [] })).rejects.toMatchObject({ code: "ai-provider-not-configured" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("ilk sağlayıcı düşerse ikincisini dener", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => String(url).includes("anthropic") ? json({ error: {} }, 401) : json({ output_text: '{"ok":true}' }));
    const result = await requestStructuredJson(request, { fetchImpl: fetchImpl as unknown as typeof fetch, providers: [anthropic, openai] });
    expect(result).toMatchObject({ json: { ok: true }, provider: "openai", requestId: "req_1" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("hata nesnesi anahtarı ya da sağlayıcı yanıt gövdesini taşımaz", async () => {
    const fetchImpl = vi.fn(async () => json({ error: { message: "anthropic-SECRET sızdı" } }, 400));
    const error = await requestStructuredJson(request, { fetchImpl: fetchImpl as unknown as typeof fetch, providers: [anthropic] }).catch(value => value);
    expect(error).toBeInstanceOf(AiGatewayError);
    expect(JSON.stringify({ ...error, message: error.message })).not.toContain("SECRET");
    expect(error).toMatchObject({ code: "ai-request-failed", httpStatus: 400, provider: "anthropic" });
  });

  it("ağ hatasında ayrıntı sızdırmadan sıradaki sağlayıcıya geçer", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => { if (String(url).includes("anthropic")) throw new Error("ECONNRESET anthropic-SECRET"); return json({ output_text: '{"ok":true}' }); });
    const result = await requestStructuredJson(request, { fetchImpl: fetchImpl as unknown as typeof fetch, providers: [anthropic, openai] });
    expect(result.provider).toBe("openai");
  });

  it("şemaya uymayan çıktıyı geçerli saymaz", async () => {
    const fetchImpl = vi.fn(async () => json({ content: [{ type: "text", text: "özür dilerim" }] }));
    await expect(requestStructuredJson(request, { fetchImpl: fetchImpl as unknown as typeof fetch, providers: [anthropic] })).rejects.toMatchObject({ code: "ai-output-invalid" });
  });
});
