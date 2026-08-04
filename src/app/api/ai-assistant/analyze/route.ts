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
import { logError, logWarn } from "@/lib/logger";
import { checkApiRateLimit, getApiRateLimitHeaders } from "@/lib/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { detectImageMagicByteMimeType } from "@/lib/validations/imageMagicBytes";
import { sanitizeText } from "@/lib/validations";

export const runtime = "nodejs";

const maxImageBytes = 10 * 1024 * 1024;
const maxMessageLength = 2_000;
const openAiTimeoutMs = 35_000;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

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
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
    type?: string;
  }>;
  output_text?: string;
};

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

function buildOpenAiInput(parsedRequest: ParsedAssistantRequest) {
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
  const content: Array<Record<string, unknown>> = [
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

async function callOpenAi(payload: Record<string, unknown>) {
  const apiKey = process.env.OPENAI_API_KEY;

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

      if (response.ok) {
        return (await response.json()) as OpenAiResponsePayload;
      }

      if (attempt === 1 && (response.status === 429 || response.status >= 500)) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        continue;
      }

      logWarn("OpenAI assistant response failed.", {
        status: response.status,
      });
      throw new Error("openai-request-failed");
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

function getClientError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message === "image-too-large") {
    return {
      message: "Fotoğraf en fazla 10 MB olabilir.",
      status: 400,
    };
  }

  if (message === "image-type-invalid") {
    return {
      message: "Yalnızca JPG, JPEG, PNG veya WEBP fotoğraf yükleyebilirsin.",
      status: 400,
    };
  }

  if (message === "empty-request") {
    return {
      message: "Sorunu birkaç cümleyle anlat veya fotoğraf yükle.",
      status: 400,
    };
  }

  if (message === "openai-key-missing") {
    return {
      message: "Akıllı Asistan için server ortamında OPENAI_API_KEY tanımlanmalı.",
      status: 503,
    };
  }

  return {
    message: "İlk değerlendirme şu anda hazırlanamadı. Lütfen biraz sonra tekrar dene.",
    status: 502,
  };
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
    const model = process.env.OPENAI_VISION_MODEL;

    if (!model) {
      return assistantJson(
        {
          message: "Akıllı Asistan için server ortamında OPENAI_VISION_MODEL tanımlanmalı.",
        },
        { status: 503 },
      );
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
    const outputText = extractOutputText(openAiResponse);
    const parsedAnalysis = parseAssistantAnalysis(JSON.parse(outputText));

    if (!parsedAnalysis) {
      throw new Error("assistant-schema-invalid");
    }

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
    const clientError = getClientError(error);

    if (clientError.status >= 500) {
      logError(error, {
        context: "AI assistant analyze failed.",
      });
    }

    return assistantJson(
      {
        message: clientError.message,
      },
      {
        status: clientError.status,
      },
    );
  }
}
