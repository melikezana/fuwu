import type {
  RequestMessage,
  RequestMessageSenderRole,
  SendRequestMessageInput,
} from "../../src/services/messaging";
import {
  createServiceSuccess,
  type ServiceResponse,
} from "../../src/services/serviceResponse";

const storybookRequestId = "11111111-1111-4111-8111-111111111111";

function createMessage({
  createdAt,
  id,
  message,
  readAt = null,
  requestId = storybookRequestId,
  senderRole,
}: {
  createdAt: string;
  id: string;
  message: string;
  readAt?: string | null;
  requestId?: string;
  senderRole: RequestMessageSenderRole;
}): RequestMessage {
  return {
    created_at: createdAt,
    id,
    message,
    read_at: readAt,
    request_id: requestId,
    sender_id: `${senderRole}-storybook`,
    sender_role: senderRole,
  };
}

const sampleMessages: RequestMessage[] = [
  createMessage({
    createdAt: "2026-08-17T08:42:00.000Z",
    id: "message-1",
    message: "Merhaba, servis adresine 20 dakika icinde geciyorum.",
    readAt: "2026-08-17T08:43:00.000Z",
    senderRole: "provider",
  }),
  createMessage({
    createdAt: "2026-08-17T08:45:00.000Z",
    id: "message-2",
    message: "Tesekkurler, apartman girisinde guvenlige bilgi verdim.",
    readAt: "2026-08-17T08:46:00.000Z",
    senderRole: "customer",
  }),
  createMessage({
    createdAt: "2026-08-17T08:51:00.000Z",
    id: "message-3",
    message: "Fotograftaki parcayi da yanima aliyorum.",
    senderRole: "provider",
  }),
];

export type {
  RequestMessage,
  RequestMessageInsert,
  RequestMessageSenderRole,
  SendRequestMessageInput,
} from "../../src/services/messaging";

export async function getRequestMessages(
  requestId: string,
): Promise<ServiceResponse<RequestMessage[]>> {
  return createServiceSuccess(
    sampleMessages.map((message) => ({
      ...message,
      request_id: requestId,
    })),
  );
}

export async function markRequestMessagesAsRead() {
  return true;
}

export async function sendRequestMessage({
  message,
  requestId,
  senderRole,
}: SendRequestMessageInput): Promise<ServiceResponse<RequestMessage>> {
  return createServiceSuccess(
    createMessage({
      createdAt: new Date().toISOString(),
      id: `storybook-message-${Date.now()}`,
      message,
      readAt: null,
      requestId,
      senderRole,
    }),
  );
}

export async function getUnreadRequestMessageCount() {
  return 1;
}

export async function getUnreadRequestMessageCounts() {
  return {
    [storybookRequestId]: 1,
  };
}
