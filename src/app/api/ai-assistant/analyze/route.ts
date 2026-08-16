import { createHash } from "crypto";
import { type NextRequest, NextResponse } from "next/server";
import {
  assistantAnalysisJsonSchema,
  parseAssistantAnalysis,
  type AssistantAnalysis,
  type AssistantAnalyzeResponse,
} from "@/lib/ai/assistant-schema";
import { fuwuAssistantSystemPrompt } from "@/lib/ai/assistant-prompt";
import {
  aiAssistantRateLimitConfig,
  getCachedAssistantResponse,
  setCachedAssistantResponse,
} from "@/lib/ai/rate-limit";
import { searchProviders } from "@/lib/ai/provider-tools";
import { logWarn } from "@/lib/logger";
import { checkApiRateLimit, getApiRateLimitHeaders } from "@/lib/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { detectImageMagicByteMimeType } from "@/lib/validations/imageMagicBytes";
import { sanitizeText } from "@/lib/validations";
import { writeAuditLog } from "@/services/audit";

export const runtime = "nodejs";
export const maxDuration = 60;

const maxImageBytes = 10 * 1024 * 1024;
const maxMessageLength = 2_000;
const openAiTimeoutMs = 25_000;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const auditTrackedOpenAiFailureCodes = new Set([
  "billing_hard_limit_reached",
  "insufficient_quota",
  "invalid_api_key",
  "openai-key-missing",
  "openai-model-missing",
  "quota_exceeded",
]);
const supportedImageDataUrlPattern =
  /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

type ConversationContextMessage = {
  role: "assistant" | "user";
  content: string;
};

type ParsedAssistantRequest = {
  category: string | null;
  conversationId: string | null;
  district: string | null;
  history: ConversationContextMessage[];
  imageDataUrl: string | null;
  imageHash: string | null;
  imageReference: string | null;
  latitude: number | null;
  longitude: number | null;
  message: string;
};

type OpenAiResponsePayload = {
  id?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
    type?: string;
  }>;
  output_text?: string;
};

type OpenAiErrorBody = {
  error?: {
    code?: unknown;
    message?: unknown;
    type?: unknown;
  };
};

type OpenAiInputContent =
  | {
      text: string;
      type: "input_text";
    }
  | {
      detail: "auto";
      image_url: string;
      type: "input_image";
    };

type OpenAiInputMessage = {
  content: OpenAiInputContent[];
  role: "user";
};

type OpenAiResponsesPayload = {
  input: OpenAiInputMessage[];
  instructions: string;
  max_output_tokens: number;
  model: string;
  store: false;
  text: {
    format: {
      description: string;
      name: string;
      schema: typeof assistantAnalysisJsonSchema;
      strict: true;
      type: "json_schema";
    };
  };
};

type OpenAiRequestResult = {
  payload: OpenAiResponsePayload;
  requestId: string | null;
};

class OpenAiRequestError extends Error {
  code: string | null;
  httpStatus: number;
  requestId: string | null;
  type: string | null;

  constructor(
    message: string,
    details: {
      code: string | null;
      httpStatus: number;
      requestId: string | null;
      type: string | null;
    },
  ) {
    super(message);
    this.name = "OpenAiRequestError";
    this.code = details.code;
    this.httpStatus = details.httpStatus;
    this.requestId = details.requestId;
    this.type = details.type;
  }
}

class AssistantStructuredOutputError extends Error {
  causeError: unknown;
  httpStatus: number;
  requestId: string | null;

  constructor(message: string, requestId: string | null, causeError?: unknown) {
    super(message);
    this.name = "AssistantStructuredOutputError";
    this.causeError = causeError;
    this.httpStatus = 200;
    this.requestId = requestId;
  }
}

type AssistantPersistenceClient = {
  auth: {
    getUser: () => Promise<{
      data: {
        user: {
          id: string;
        } | null;
      };
      error: unknown;
    }>;
  };
  from: (table: string) => {
    insert: (value: Record<string, unknown> | Array<Record<string, unknown>>) => {
      select: (columns?: string) => {
        single: () => Promise<{
          data: Record<string, unknown> | null;
          error: unknown;
        }>;
      };
    };
  };
};

function assistantJson(body: Record<string, unknown>, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNumberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function redactOpenAiApiKey(value: string | null) {
  if (!value) {
    return value;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  return apiKey ? value.split(apiKey).join("[redacted]") : value;
}

function getHeaderValue(headers: unknown, headerName: string) {
  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    return getStringValue(headers.get(headerName));
  }

  if (!isRecord(headers)) {
    return null;
  }

  const normalizedHeaderName = headerName.toLocaleLowerCase("en-US");

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLocaleLowerCase("en-US") === normalizedHeaderName) {
      return Array.isArray(value) ? getStringValue(value[0]) : getStringValue(value);
    }
  }

  return null;
}

function getSafeRequestId(value: unknown) {
  const requestId = getStringValue(value);

  return requestId && /^[A-Za-z0-9._:-]{1,200}$/.test(requestId) ? requestId : null;
}

function getNestedErrorRecord(error: unknown) {
  if (!isRecord(error)) {
    return null;
  }

  return isRecord(error.error) ? error.error : null;
}

function getErrorName(error: unknown) {
  if (error instanceof Error) {
    return error.name;
  }

  if (isRecord(error)) {
    return getStringValue(error.name) ?? "NonError";
  }

  return "NonError";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return redactOpenAiApiKey(error.message) ?? "";
  }

  const recordMessage = isRecord(error) ? getStringValue(error.message) : null;
  const nestedMessage = getStringValue(getNestedErrorRecord(error)?.message);

  return redactOpenAiApiKey(recordMessage ?? nestedMessage ?? String(error)) ?? "";
}

function getHttpStatus(error: unknown) {
  if (!isRecord(error)) {
    return null;
  }

  const response = isRecord(error.response) ? error.response : null;

  return (
    getNumberValue(error.httpStatus) ??
    getNumberValue(error.status) ??
    getNumberValue(error.statusCode) ??
    getNumberValue(response?.status)
  );
}

function getOpenAiErrorCode(error: unknown) {
  if (!isRecord(error)) {
    return null;
  }

  return (
    getStringValue(error.code) ??
    getStringValue(error.error_code) ??
    getStringValue(getNestedErrorRecord(error)?.code)
  );
}

function getOpenAiErrorType(error: unknown) {
  if (!isRecord(error)) {
    return null;
  }

  return getStringValue(error.type) ?? getStringValue(getNestedErrorRecord(error)?.type);
}

function getErrorRequestId(error: unknown) {
  if (!isRecord(error)) {
    return null;
  }

  return (
    getSafeRequestId(error.requestId) ??
    getSafeRequestId(error.request_id) ??
    getSafeRequestId(error._request_id) ??
    getSafeRequestId(getHeaderValue(error.headers, "x-request-id")) ??
    getSafeRequestId(getHeaderValue(error.headers, "request-id")) ??
    getSafeRequestId(getNestedErrorRecord(error)?.request_id)
  );
}

function getErrorStack(error: unknown) {
  const stack = error instanceof Error ? error.stack ?? null : isRecord(error) ? getStringValue(error.stack) : null;

  return redactOpenAiApiKey(stack);
}

function getAssistantErrorLogPayload(error: unknown) {
  return {
    name: getErrorName(error),
    message: getErrorMessage(error),
    httpStatus: getHttpStatus(error),
    openAiErrorCode: getOpenAiErrorCode(error),
    openAiErrorType: getOpenAiErrorType(error),
    requestId: getErrorRequestId(error),
    stackTrace: getErrorStack(error),
  };
}

function getTrackedOpenAiFailureCode(error: unknown) {
  const message = getErrorMessage(error);
  const code = getOpenAiErrorCode(error);

  for (const value of [code, message]) {
    if (value && auditTrackedOpenAiFailureCodes.has(value)) {
      return value;
    }
  }

  return null;
}

async function writeOpenAiFailureAuditLog(error: unknown) {
  const trackedCode = getTrackedOpenAiFailureCode(error);

  if (!trackedCode) {
    return;
  }

  try {
    await writeAuditLog({
      action: "ai_assistant.openai_failure",
      actorUserId: null,
      entityId: null,
      entityType: "ai_assistant",
      metadata: {
        code: trackedCode,
        httpStatus: getHttpStatus(error),
        name: getErrorName(error),
        openAiErrorCode: getOpenAiErrorCode(error),
        openAiErrorType: getOpenAiErrorType(error),
        requestId: getErrorRequestId(error),
        route: "/api/ai-assistant/analyze",
      } satisfies Json,
    });
  } catch (auditError) {
    logWarn("AI assistant OpenAI failure audit log failed.", {
      auditError,
      trackedCode,
    });
  }
}

function logAssistantAnalyzeError(error: unknown) {
  const payload = getAssistantErrorLogPayload(error);

  if (error instanceof AssistantStructuredOutputError) {
    console.error("AI assistant structured output parse failed.", {
      ...payload,
      cause: error.causeError ? getAssistantErrorLogPayload(error.causeError) : null,
    });
    return;
  }

  console.error("AI assistant analyze failed.", payload);
}

function getAssistantFailureStatus(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (error instanceof AssistantStructuredOutputError) {
    return 500;
  }

  if (
    message === "empty-request" ||
    message === "image-too-large" ||
    message === "image-type-invalid" ||
    message === "image-url-invalid"
  ) {
    return 400;
  }

  if (message === "openai-key-missing" || message === "openai-model-missing") {
    return 503;
  }

  return 502;
}

function hashValue(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function isFile(value: FormDataEntryValue | null): value is File {
  return Boolean(value && typeof value === "object" && "arrayBuffer" in value && "size" in value);
}

function parseNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseHistory(value: FormDataEntryValue | null): ConversationContextMessage[] {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map((entry): ConversationContextMessage | null => {
        if (!entry || typeof entry !== "object") {
          return null;
        }

        const record = entry as Record<string, unknown>;
        const role = record.role === "assistant" ? "assistant" : record.role === "user" ? "user" : null;
        const content = sanitizeText(String(record.content ?? ""), 500);

        return role && content ? { role, content } : null;
      })
      .filter((entry): entry is ConversationContextMessage => Boolean(entry))
      .slice(-6);
  } catch {
    return [];
  }
}

async function parseAssistantRequest(request: NextRequest): Promise<ParsedAssistantRequest> {
  const formData = await request.formData();
  const message = sanitizeText(String(formData.get("message") ?? ""), maxMessageLength);
  const imageFile = formData.get("image");
  let imageDataUrl: string | null = null;
  let imageHash: string | null = null;
  let imageReference: string | null = null;

  if (isFile(imageFile) && imageFile.size > 0) {
    if (imageFile.size > maxImageBytes) {
      throw new Error("image-too-large");
    }

    if (!allowedImageTypes.has(imageFile.type)) {
      throw new Error("image-type-invalid");
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const detectedMimeType = detectImageMagicByteMimeType(new Uint8Array(buffer.subarray(0, 12)));

    if (!detectedMimeType || !allowedImageTypes.has(detectedMimeType)) {
      throw new Error("image-type-invalid");
    }

    imageHash = hashValue(buffer);
    imageReference = `assistant-upload:${imageHash.slice(0, 16)}`;
    imageDataUrl = `data:${detectedMimeType};base64,${buffer.toString("base64")}`;
  }

  if (!message && !imageDataUrl) {
    throw new Error("empty-request");
  }

  return {
    category: sanitizeText(String(formData.get("category") ?? ""), 120) || null,
    conversationId: sanitizeText(String(formData.get("conversationId") ?? ""), 80) || null,
    district: sanitizeText(String(formData.get("district") ?? ""), 120) || null,
    history: parseHistory(formData.get("history")),
    imageDataUrl,
    imageHash,
    imageReference,
    latitude: parseNumber(formData.get("latitude")),
    longitude: parseNumber(formData.get("longitude")),
    message,
  };
}

function getCacheKey(parsedRequest: ParsedAssistantRequest) {
  return hashValue(
    JSON.stringify({
      category: parsedRequest.category,
      district: parsedRequest.district,
      history: parsedRequest.history,
      imageHash: parsedRequest.imageHash,
      latitude: parsedRequest.latitude,
      longitude: parsedRequest.longitude,
      message: parsedRequest.message,
    }),
  );
}

function isSupportedImageInputUrl(value: string) {
  if (supportedImageDataUrlPattern.test(value)) {
    return true;
  }

  try {
    const url = new URL(value);

    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function buildOpenAiInput(parsedRequest: ParsedAssistantRequest): OpenAiInputMessage[] {
  const contextPayload = {
    category: parsedRequest.category,
    conversationContext: parsedRequest.history,
    location: {
      district: parsedRequest.district,
      latitude: parsedRequest.latitude,
      longitude: parsedRequest.longitude,
    },
    message: parsedRequest.message,
  };
  const content: OpenAiInputContent[] = [
    {
      type: "input_text",
      text: `Aşağıdaki kullanıcı talebini JSON structured output ile değerlendir:\n${JSON.stringify(
        contextPayload,
        null,
        2,
      )}`,
    },
  ];

  if (parsedRequest.imageDataUrl) {
    if (!isSupportedImageInputUrl(parsedRequest.imageDataUrl)) {
      throw new Error("image-url-invalid");
    }

    content.push({
      detail: "auto",
      image_url: parsedRequest.imageDataUrl,
      type: "input_image",
    });
  }

  return [
    {
      content,
      role: "user",
    },
  ];
}

async function readOpenAiErrorBody(response: Response) {
  try {
    const body = (await response.json()) as unknown;

    return isRecord(body) && isRecord(body.error) ? (body as OpenAiErrorBody).error ?? null : null;
  } catch {
    return null;
  }
}

async function callOpenAi(payload: OpenAiResponsesPayload): Promise<OpenAiRequestResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("openai-key-missing");
  }

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), openAiTimeoutMs);

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        body: JSON.stringify(payload),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: controller.signal,
      });
      const requestId = getSafeRequestId(response.headers.get("x-request-id"));

      if (response.ok) {
        try {
          return {
            payload: (await response.json()) as OpenAiResponsePayload,
            requestId,
          };
        } catch (error) {
          throw new AssistantStructuredOutputError("openai-response-json-invalid", requestId, error);
        }
      }

      if (attempt === 1 && (response.status === 429 || response.status >= 500)) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        continue;
      }

      const openAiError = await readOpenAiErrorBody(response);

      throw new OpenAiRequestError(
        getStringValue(openAiError?.message) ?? "openai-request-failed",
        {
          code: getStringValue(openAiError?.code),
          httpStatus: response.status,
          requestId,
          type: getStringValue(openAiError?.type),
        },
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("openai-request-failed");
}

function extractOutputText(response: OpenAiResponsePayload) {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }

  for (const outputItem of response.output ?? []) {
    for (const contentItem of outputItem.content ?? []) {
      if (contentItem.type === "output_text" && typeof contentItem.text === "string") {
        return contentItem.text;
      }
    }
  }

  return "";
}

function parseAssistantAnalysisResponse(response: OpenAiRequestResult) {
  const outputText = extractOutputText(response.payload);

  if (!outputText.trim()) {
    throw new AssistantStructuredOutputError("assistant-output-empty", response.requestId);
  }

  let outputJson: unknown;

  try {
    outputJson = JSON.parse(outputText);
  } catch (error) {
    throw new AssistantStructuredOutputError("assistant-output-json-invalid", response.requestId, error);
  }

  const parsedAnalysis = parseAssistantAnalysis(outputJson);

  if (!parsedAnalysis) {
    throw new AssistantStructuredOutputError("assistant-schema-invalid", response.requestId);
  }

  return parsedAnalysis;
}

function includesEmergencySignal(parsedRequest: ParsedAssistantRequest) {
  const haystack = [parsedRequest.message, ...parsedRequest.history.map((item) => item.content)]
    .join(" ")
    .toLocaleLowerCase("tr");

  return [
    "gaz kokusu",
    "yanık kokusu",
    "yanik kokusu",
    "kıvılcım",
    "kivilcim",
    "pano yangın",
    "pano yangin",
    "su baskını",
    "su baskini",
    "çökme",
    "cokme",
    "çocuk kilitli",
    "cocuk kilitli",
    "duman",
  ].some((signal) => haystack.includes(signal));
}

function applySafetyOverrides(
  analysis: AssistantAnalysis,
  parsedRequest: ParsedAssistantRequest,
): AssistantAnalysis {
  if (!includesEmergencySignal(parsedRequest)) {
    return analysis;
  }

  return {
    ...analysis,
    emergencyMessage:
      analysis.emergencyMessage ||
      "Güvenliyse enerji veya su kaynağını kapat, bölgeden uzaklaş ve uygun acil hizmete başvur. Normal rezervasyon bu durum için ana çözüm değildir.",
    professionalNeeded: true,
    providerSearchRecommended: false,
    urgency: "emergency",
  };
}

async function persistAssistantExchange(
  payload: {
    analysis: AssistantAnalysis;
    imageReference: string | null;
    parsedRequest: ParsedAssistantRequest;
  },
) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  try {
    const client = supabase as unknown as AssistantPersistenceClient;
    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) {
      return null;
    }

    const conversation = await client
      .from("ai_conversations")
      .insert({
        district: payload.parsedRequest.district,
        selected_category: payload.parsedRequest.category,
        title: payload.analysis.likelyIssue,
        user_id: user.id,
      })
      .select("id")
      .single();

    if (conversation.error || !conversation.data?.id) {
      return null;
    }

    const conversationId = String(conversation.data.id);
    const userMessage = await client
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        image_path: payload.imageReference,
        message: payload.parsedRequest.message,
        role: "user",
        user_id: user.id,
      })
      .select("id")
      .single();

    await client.from("ai_messages").insert({
      conversation_id: conversationId,
      image_path: null,
      message: payload.analysis.summary,
      role: "assistant",
      user_id: user.id,
    });

    await client.from("ai_analyses").insert({
      analysis_json: payload.analysis,
      conversation_id: conversationId,
      image_path: payload.imageReference,
      message_id: userMessage.data?.id ?? null,
      user_id: user.id,
    });

    return conversationId;
  } catch (error) {
    logWarn("AI assistant persistence skipped.", {
      reason: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function POST(request: NextRequest) {
  const rateLimit = await checkApiRateLimit(request, aiAssistantRateLimitConfig);

  if (!rateLimit.allowed) {
    return assistantJson(
      {
        message: "Çok fazla analiz isteği gönderildi. Lütfen biraz sonra tekrar dene.",
      },
      {
        headers: getApiRateLimitHeaders(rateLimit),
        status: 429,
      },
    );
  }

  try {
    const model = process.env.OPENAI_VISION_MODEL?.trim();

    console.info("AI model:", model);

    if (!model) {
      throw new Error("openai-model-missing");
    }

    const parsedRequest = await parseAssistantRequest(request);
    const cacheKey = getCacheKey(parsedRequest);
    const cachedResponse = getCachedAssistantResponse(cacheKey);

    if (cachedResponse) {
      return assistantJson(cachedResponse);
    }

    const openAiResponse = await callOpenAi({
      input: buildOpenAiInput(parsedRequest),
      instructions: fuwuAssistantSystemPrompt,
      max_output_tokens: 1200,
      model,
      store: false,
      text: {
        format: {
          description: "Fuwu ev hizmeti ilk değerlendirme sonucu.",
          name: "fuwu_ai_assistant_analysis",
          schema: assistantAnalysisJsonSchema,
          strict: true,
          type: "json_schema",
        },
      },
    });
    const parsedAnalysis = parseAssistantAnalysisResponse(openAiResponse);

    const analysis = applySafetyOverrides(parsedAnalysis, parsedRequest);
    const providers =
      analysis.providerSearchRecommended &&
      analysis.professionalNeeded &&
      analysis.urgency !== "emergency"
        ? await searchProviders({
            availableNow: analysis.urgency === "high",
            category: analysis.category,
            district: parsedRequest.district,
            latitude: parsedRequest.latitude,
            longitude: parsedRequest.longitude,
            urgency: analysis.urgency,
            verifiedOnly: false,
          })
        : [];
    const conversationId = await persistAssistantExchange({
      analysis,
      imageReference: parsedRequest.imageReference,
      parsedRequest,
    });
    const response = {
      analysis,
      cached: false,
      conversationId,
      imageReference: parsedRequest.imageReference,
      providers,
    } satisfies AssistantAnalyzeResponse;

    setCachedAssistantResponse(cacheKey, response);

    return assistantJson(response);
  } catch (error) {
    logAssistantAnalyzeError(error);
    await writeOpenAiFailureAuditLog(error);

    return assistantJson(
      {
        ok: false,
        error: "assistant_analysis_failed",
        message: "İlk değerlendirme şu anda hazırlanamadı.",
        requestId: getErrorRequestId(error),
      },
      {
        status: getAssistantFailureStatus(error),
      },
    );
  }
}
