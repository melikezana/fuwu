/**
 * Sağlayıcıdan bağımsız yapay zekâ kapısı.
 *
 * FUWU'nun yapay zekâ özellikleri tek bir sağlayıcıya bağlı kalmaz: hangi anahtar ve model
 * tanımlıysa o kullanılır, ikisi de tanımlıysa ilki düşerse diğeri denenir, hiçbiri yoksa
 * çağıran taraf kural tabanlı yedeğe geçer. Model adı koda gömülmez; ortam değişkeninden gelir.
 *
 * Yalnızca sunucuda çalışır. Anahtarlar asla istemciye ya da günlüklere yazılmaz.
 */

export type AiProviderName = "anthropic" | "openai";

export type AiProviderConfig = {
  apiKey: string;
  model: string;
  provider: AiProviderName;
};

export type StructuredJsonRequest = {
  /** data:image/(jpeg|png|webp);base64,... biçiminde isteğe bağlı görsel. */
  imageDataUrl?: string | null;
  instructions: string;
  maxOutputTokens: number;
  schema: Record<string, unknown>;
  schemaDescription: string;
  schemaName: string;
  timeoutMs?: number;
  userText: string;
};

export type StructuredJsonResult = {
  json: unknown;
  provider: AiProviderName;
  requestId: string | null;
};

type Env = Record<string, string | undefined>;
type FetchLike = typeof fetch;

export class AiGatewayError extends Error {
  code: string;
  httpStatus: number | null;
  provider: AiProviderName | null;
  requestId: string | null;

  constructor(code: string, details: { httpStatus?: number | null; provider?: AiProviderName | null; requestId?: string | null } = {}) {
    super(code);
    this.name = "AiGatewayError";
    this.code = code;
    this.httpStatus = details.httpStatus ?? null;
    this.provider = details.provider ?? null;
    this.requestId = details.requestId ?? null;
  }
}

const providerEnv: Record<AiProviderName, { key: string; model: string }> = {
  anthropic: { key: "ANTHROPIC_API_KEY", model: "ANTHROPIC_MODEL" },
  openai: { key: "OPENAI_API_KEY", model: "OPENAI_VISION_MODEL" },
};

const defaultOrder: AiProviderName[] = ["anthropic", "openai"];
const imageDataUrlPattern = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

function configFor(provider: AiProviderName, env: Env): AiProviderConfig | null {
  const apiKey = env[providerEnv[provider].key]?.trim();
  const model = env[providerEnv[provider].model]?.trim();
  return apiKey && model ? { apiKey, model, provider } : null;
}

/**
 * Kullanılabilir sağlayıcılar, deneme sırasıyla. AI_PROVIDER tanımlıysa o sağlayıcı öne alınır;
 * anahtarı ya da modeli eksik sağlayıcı listeye girmez.
 */
export function resolveAiProviders(env: Env = process.env): AiProviderConfig[] {
  const preferred = env.AI_PROVIDER?.trim().toLowerCase();
  const order = preferred === "openai" || preferred === "anthropic"
    ? [preferred, ...defaultOrder.filter(name => name !== preferred)]
    : defaultOrder;
  return order.map(name => configFor(name as AiProviderName, env)).filter((config): config is AiProviderConfig => Boolean(config));
}

export function hasAiProvider(env: Env = process.env) {
  return resolveAiProviders(env).length > 0;
}

function safeRequestId(value: string | null) {
  return value && /^[A-Za-z0-9_-]{1,120}$/.test(value) ? value : null;
}

export function buildAnthropicPayload(config: AiProviderConfig, request: StructuredJsonRequest) {
  const content: Array<Record<string, unknown>> = [];
  const image = request.imageDataUrl ? imageDataUrlPattern.exec(request.imageDataUrl) : null;
  if (request.imageDataUrl && !image) throw new AiGatewayError("ai-image-unsupported", { provider: "anthropic" });
  if (image) content.push({ type: "image", source: { type: "base64", media_type: image[1], data: image[2] } });
  content.push({ type: "text", text: request.userText });
  return {
    model: config.model,
    max_tokens: request.maxOutputTokens,
    system: request.instructions,
    messages: [{ role: "user", content }],
    // Yapılandırılmış çıktı: model tek bir aracı çağırmaya zorlanır, aracın girdisi şemaya uyan JSON'dur.
    tools: [{ name: request.schemaName, description: request.schemaDescription, input_schema: request.schema }],
    tool_choice: { type: "tool", name: request.schemaName },
  };
}

export function buildOpenAiPayload(config: AiProviderConfig, request: StructuredJsonRequest) {
  const content: Array<Record<string, unknown>> = [{ type: "input_text", text: request.userText }];
  if (request.imageDataUrl) {
    if (!imageDataUrlPattern.test(request.imageDataUrl)) throw new AiGatewayError("ai-image-unsupported", { provider: "openai" });
    content.push({ type: "input_image", image_url: request.imageDataUrl, detail: "auto" });
  }
  return {
    model: config.model,
    instructions: request.instructions,
    input: [{ role: "user", content }],
    max_output_tokens: request.maxOutputTokens,
    store: false,
    text: { format: { type: "json_schema", name: request.schemaName, description: request.schemaDescription, schema: request.schema, strict: true } },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function extractAnthropicJson(payload: unknown, schemaName: string): unknown {
  if (!isRecord(payload) || !Array.isArray(payload.content)) return undefined;
  const block = payload.content.find(item => isRecord(item) && item.type === "tool_use" && item.name === schemaName);
  return isRecord(block) && isRecord(block.input) ? block.input : undefined;
}

export function extractOpenAiJson(payload: unknown): unknown {
  if (!isRecord(payload)) return undefined;
  let text = typeof payload.output_text === "string" ? payload.output_text : "";
  if (!text.trim() && Array.isArray(payload.output)) {
    for (const item of payload.output) {
      if (!isRecord(item) || !Array.isArray(item.content)) continue;
      const part = item.content.find(entry => isRecord(entry) && entry.type === "output_text" && typeof entry.text === "string");
      if (isRecord(part)) { text = String(part.text); break; }
    }
  }
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function callProvider(config: AiProviderConfig, request: StructuredJsonRequest, fetchImpl: FetchLike): Promise<StructuredJsonResult> {
  const anthropic = config.provider === "anthropic";
  const url = anthropic ? "https://api.anthropic.com/v1/messages" : "https://api.openai.com/v1/responses";
  const headers: Record<string, string> = anthropic
    ? { "content-type": "application/json", "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" }
    : { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` };
  const body = JSON.stringify(anthropic ? buildAnthropicPayload(config, request) : buildOpenAiPayload(config, request));

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let response: Response;
    try {
      response = await fetchImpl(url, { method: "POST", headers, body, signal: AbortSignal.timeout(request.timeoutMs ?? 25_000) });
    } catch {
      // Ağ hatası ya da zaman aşımı; ayrıntı (anahtar içerebilecek başlıklar) taşınmaz.
      throw new AiGatewayError("ai-network-error", { provider: config.provider });
    }
    const requestId = safeRequestId(response.headers.get(anthropic ? "request-id" : "x-request-id"));
    if (response.ok) {
      const payload: unknown = await response.json().catch(() => null);
      const json = anthropic ? extractAnthropicJson(payload, request.schemaName) : extractOpenAiJson(payload);
      if (json === undefined) throw new AiGatewayError("ai-output-invalid", { provider: config.provider, requestId });
      return { json, provider: config.provider, requestId };
    }
    if (attempt === 1 && (response.status === 429 || response.status >= 500)) {
      await new Promise(resolve => setTimeout(resolve, 600));
      continue;
    }
    throw new AiGatewayError("ai-request-failed", { httpStatus: response.status, provider: config.provider, requestId });
  }
  throw new AiGatewayError("ai-request-failed", { provider: config.provider });
}

/**
 * Şemaya uyan JSON ister. Sağlayıcılar sırayla denenir; hepsi başarısız olursa son hata fırlatılır.
 * Çağıran taraf dönen JSON'u kendi doğrulayıcısından geçirmek zorundadır: model çıktısı güvenilmez veridir.
 */
export async function requestStructuredJson(
  request: StructuredJsonRequest,
  options: { fetchImpl?: FetchLike; providers?: AiProviderConfig[] } = {},
): Promise<StructuredJsonResult> {
  const providers = options.providers ?? resolveAiProviders();
  if (!providers.length) throw new AiGatewayError("ai-provider-not-configured");
  let lastError: unknown = null;
  for (const config of providers) {
    try {
      return await callProvider(config, request, options.fetchImpl ?? fetch);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new AiGatewayError("ai-request-failed");
}
