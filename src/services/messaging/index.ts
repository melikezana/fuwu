import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicErrorMessage, handleServiceError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/types";
import { isUuid } from "@/lib/utils/validation";
import {
  createServiceFailure,
  createServiceSuccess,
  type ServiceResponse,
} from "@/services/serviceResponse";

export type RequestMessage =
  Database["public"]["Tables"]["request_messages"]["Row"];
export type RequestMessageInsert =
  Database["public"]["Tables"]["request_messages"]["Insert"];
export type RequestMessageSenderRole = RequestMessage["sender_role"];

export type SendRequestMessageInput = {
  message: string;
  requestId: string;
  senderRole: RequestMessageSenderRole;
};

const requestMessageLoadErrorMessage =
  "Mesajlar şu anda yüklenemedi. Lütfen tekrar deneyin.";
const requestMessageSendErrorMessage =
  "Mesaj gönderilemedi. Lütfen tekrar deneyin.";
const requestMessageLoginRequiredMessage =
  "Mesaj göndermek için giriş yapmalısın.";
const requestMessageValidationMessage =
  "Mesaj 1-2000 karakter arasında olmalı.";

function isRequestMessageSenderRole(
  value: string,
): value is RequestMessageSenderRole {
  return value === "customer" || value === "provider";
}

function getIncomingSenderRole(
  viewerRole: RequestMessageSenderRole,
): RequestMessageSenderRole {
  return viewerRole === "customer" ? "provider" : "customer";
}

function normalizeRequestMessage(value: string) {
  return value.trim();
}

function createMessagingFailure<T>({
  error,
  logContext,
  publicMessage,
}: {
  error: unknown;
  logContext: string;
  publicMessage: string;
}): ServiceResponse<T> {
  const appError = handleServiceError(error, {
    logContext,
    publicMessage,
  });

  return createServiceFailure<T>(
    getPublicErrorMessage(appError, publicMessage),
  );
}

export async function getRequestMessages(
  requestId: string,
  supabase: SupabaseClient<Database>,
): Promise<ServiceResponse<RequestMessage[]>> {
  if (!isUuid(requestId)) {
    return createServiceFailure<RequestMessage[]>("Talep kimliği geçerli değil.");
  }

  const { data, error } = await supabase
    .from("request_messages")
    .select("id, request_id, sender_id, sender_role, message, read_at, created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    return createMessagingFailure<RequestMessage[]>({
      error,
      logContext: "Request messages read failed.",
      publicMessage: requestMessageLoadErrorMessage,
    });
  }

  return createServiceSuccess((data ?? []) as RequestMessage[]);
}

export async function sendRequestMessage(
  { message, requestId, senderRole }: SendRequestMessageInput,
  supabase: SupabaseClient<Database>,
): Promise<ServiceResponse<RequestMessage>> {
  const normalizedMessage = normalizeRequestMessage(message);

  if (
    !isUuid(requestId) ||
    !isRequestMessageSenderRole(senderRole) ||
    normalizedMessage.length === 0 ||
    normalizedMessage.length > 2000
  ) {
    return createServiceFailure<RequestMessage>(requestMessageValidationMessage);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return createMessagingFailure<RequestMessage>({
      error: userError ?? new Error("Request message sender session missing."),
      logContext: "Request message auth lookup failed.",
      publicMessage: requestMessageLoginRequiredMessage,
    });
  }

  const payload: RequestMessageInsert = {
    message: normalizedMessage,
    request_id: requestId,
    sender_role: senderRole,
    sender_id: user.id,
  };

  const { data, error } = await supabase
    .from("request_messages")
    .insert(payload)
    .select("id, request_id, sender_id, sender_role, message, read_at, created_at")
    .single();

  if (error) {
    return createMessagingFailure<RequestMessage>({
      error,
      logContext: "Request message insert failed.",
      publicMessage: requestMessageSendErrorMessage,
    });
  }

  return createServiceSuccess(data as RequestMessage);
}

export async function getUnreadRequestMessageCount(
  requestId: string,
  viewerRole: RequestMessageSenderRole,
  supabase: SupabaseClient<Database>,
) {
  if (!isUuid(requestId)) {
    return 0;
  }

  const { count, error } = await supabase
    .from("request_messages")
    .select("id", { count: "exact", head: true })
    .eq("request_id", requestId)
    .eq("sender_role", getIncomingSenderRole(viewerRole))
    .is("read_at", null);

  if (error) {
    handleServiceError(error, {
      logContext: "Unread request message count failed.",
      publicMessage: requestMessageLoadErrorMessage,
    });
    return 0;
  }

  return count ?? 0;
}

export async function getUnreadRequestMessageCounts(
  requestIds: string[],
  viewerRole: RequestMessageSenderRole,
  supabase: SupabaseClient<Database>,
) {
  const uniqueRequestIds = Array.from(
    new Set(requestIds.filter((requestId) => isUuid(requestId))),
  );

  if (uniqueRequestIds.length === 0) {
    return {};
  }

  const entries = await Promise.all(
    uniqueRequestIds.map(async (requestId) => [
      requestId,
      await getUnreadRequestMessageCount(requestId, viewerRole, supabase),
    ] as const),
  );

  return Object.fromEntries(entries);
}

export async function markRequestMessagesAsRead(
  requestId: string,
  viewerRole: RequestMessageSenderRole,
  supabase: SupabaseClient<Database>,
) {
  if (!isUuid(requestId)) {
    return false;
  }

  const { error } = await supabase
    .from("request_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("request_id", requestId)
    .eq("sender_role", getIncomingSenderRole(viewerRole))
    .is("read_at", null);

  if (error) {
    handleServiceError(error, {
      logContext: "Request messages mark-as-read failed.",
      publicMessage: requestMessageLoadErrorMessage,
    });
    return false;
  }

  return true;
}
