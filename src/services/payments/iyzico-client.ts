import crypto from "node:crypto";

export type IyzicoLocale = "tr" | "en";

export type IyzicoApiResponse = {
  conversationId?: string;
  errorCode?: string;
  errorMessage?: string;
  errorGroup?: string;
  locale?: string;
  status?: "success" | "failure" | string;
  systemTime?: number;
};

type IyzicoConfig = {
  apiKey: string;
  baseUrl: string;
  secretKey: string;
};

export class IyzicoIntegrationError extends Error {
  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "IyzicoIntegrationError";
  }
}

function getIyzicoConfig(): IyzicoConfig {
  const apiKey = process.env.IYZICO_API_KEY?.trim();
  const secretKey = process.env.IYZICO_SECRET_KEY?.trim();
  const baseUrl =
    process.env.IYZICO_BASE_URL?.trim() || "https://sandbox-api.iyzipay.com";

  if (!apiKey || !secretKey) {
    throw new IyzicoIntegrationError("iyzico credentials are not configured.");
  }

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    secretKey,
  };
}

function createRandomKey() {
  return `${Date.now()}${crypto.randomBytes(8).toString("hex")}`;
}

function createAuthorizationHeader({
  apiKey,
  body,
  path,
  randomKey,
  secretKey,
}: {
  apiKey: string;
  body: string;
  path: string;
  randomKey: string;
  secretKey: string;
}) {
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(`${randomKey}${path}${body}`)
    .digest("hex");
  const authorization = Buffer.from(
    `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`,
    "utf8",
  ).toString("base64");

  return `IYZWSv2 ${authorization}`;
}

export async function iyzicoRequest<TResponse extends IyzicoApiResponse>({
  body,
  method = "POST",
  path,
}: {
  body: Record<string, unknown>;
  method?: "POST" | "PUT";
  path: string;
}): Promise<TResponse> {
  const config = getIyzicoConfig();
  const bodyJson = JSON.stringify(body);
  const randomKey = createRandomKey();
  const response = await fetch(`${config.baseUrl}${path}`, {
    body: bodyJson,
    cache: "no-store",
    headers: {
      Authorization: createAuthorizationHeader({
        apiKey: config.apiKey,
        body: bodyJson,
        path,
        randomKey,
        secretKey: config.secretKey,
      }),
      "Content-Type": "application/json",
      "x-iyzi-rnd": randomKey,
    },
    method,
  });

  const responseText = await response.text();
  let responseBody: TResponse;

  try {
    responseBody = JSON.parse(responseText || "{}") as TResponse;
  } catch {
    throw new IyzicoIntegrationError("iyzico returned a non-JSON response.", {
      path,
      status: response.status,
    });
  }

  if (!response.ok || responseBody.status === "failure") {
    throw new IyzicoIntegrationError(
      responseBody.errorMessage || "iyzico request failed.",
      {
        errorCode: responseBody.errorCode,
        errorGroup: responseBody.errorGroup,
        path,
        status: response.status,
      },
    );
  }

  return responseBody;
}

export function verifyIyzicoWebhookSignature({
  payload,
  signature,
}: {
  payload: Record<string, unknown>;
  signature: string | null;
}) {
  const secretKey = process.env.IYZICO_SECRET_KEY?.trim();

  if (!secretKey || !signature) {
    return false;
  }

  const status = String(payload.status ?? "");
  const eventType = String(payload.iyziEventType ?? "");
  const paymentConversationId = String(payload.paymentConversationId ?? "");
  const paymentId = String(payload.paymentId ?? "");
  const iyziPaymentId = String(payload.iyziPaymentId ?? "");
  const token = String(payload.token ?? "");
  const candidates = [
    eventType && paymentId && paymentConversationId && status
      ? `${secretKey}${eventType}${paymentId}${paymentConversationId}${status}`
      : "",
    eventType && iyziPaymentId && token && paymentConversationId && status
      ? `${secretKey}${eventType}${iyziPaymentId}${token}${paymentConversationId}${status}`
      : "",
  ].filter(Boolean);

  return candidates.some((candidate) => {
    const digest = crypto
      .createHmac("sha256", secretKey)
      .update(candidate)
      .digest("hex");
    const digestBuffer = Buffer.from(digest, "utf8");
    const signatureBuffer = Buffer.from(signature, "utf8");

    return (
      digestBuffer.length === signatureBuffer.length &&
      crypto.timingSafeEqual(digestBuffer, signatureBuffer)
    );
  });
}
