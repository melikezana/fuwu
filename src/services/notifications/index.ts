import type { SupabaseClient } from "@supabase/supabase-js";
import { logInfo, logWarn } from "@/lib/logger";
import type { Database, Json } from "@/lib/supabase/types";

export type NotificationEvent =
  | "emergency_request_dispatched"
  | "provider_application_submitted"
  | "provider_application_approved"
  | "provider_application_rejected"
  | "service_request_created"
  | "service_request_assigned"
  | "service_request_accepted"
  | "service_request_rejected";

export type NotificationMockResult = {
  event: NotificationEvent;
  mode: "mock";
  ok: true;
  sent: false;
};

export type ProviderApplicationSubmittedNotification = {
  applicationCode?: string;
  applicationId?: string | null;
  source?: "demo" | "live";
};

export type ProviderApplicationDecisionNotification = {
  applicationId: string;
  providerId?: string;
};

export type ServiceRequestCreatedNotification = {
  eligibleProviderCount?: number;
  notificationChannels?: Array<"provider_dashboard" | "push" | "sms" | "whatsapp">;
  requestCode?: string;
  requestId?: string | null;
};

export type ServiceRequestLifecycleNotification = {
  actorUserId?: string | null;
  customerUserId?: string | null;
  providerId?: string | null;
  providerUserId?: string | null;
  requestCode?: string;
  requestId?: string | null;
  supabaseClient?: SupabaseClient<Database> | null;
};

type NotificationMetadata =
  | ProviderApplicationSubmittedNotification
  | ProviderApplicationDecisionNotification
  | ServiceRequestCreatedNotification
  | ServiceRequestLifecycleNotification;

type NotificationRecordInput = {
  actorUserId?: string | null;
  body: string;
  event: NotificationEvent;
  metadata?: Record<string, Json | undefined>;
  providerId?: string | null;
  recipientUserId?: string | null;
  requestId?: string | null;
  supabaseClient?: SupabaseClient<Database> | null;
  title: string;
};

type NotificationPayload = {
  actor_user_id: string | null;
  body: string;
  entity_id: string | null;
  entity_type: "service_request";
  event: NotificationEvent;
  is_read: boolean;
  message: string;
  metadata: Record<string, Json | undefined>;
  provider_id: string | null;
  recipient_user_id: string;
  request_id: string | null;
  title: string;
  type: NotificationEvent;
  user_id: string;
};

type NotificationInsertError = {
  code?: unknown;
  details?: unknown;
  hint?: unknown;
  message?: unknown;
};

type NotificationInsertClient = {
  from: (table: "notifications") => {
    insert: (payload: NotificationPayload) => Promise<{ error: NotificationInsertError | null }>;
  };
};

const isDevelopment = process.env.NODE_ENV !== "production";

function createMockNotificationResult(
  event: NotificationEvent,
  metadata?: NotificationMetadata,
): NotificationMockResult {
  if (isDevelopment) {
    logInfo("Mock notification prepared.", {
      event,
      metadata,
      sent: false,
    });
  }

  return {
    event,
    mode: "mock",
    ok: true,
    sent: false,
  };
}

function isMissingNotificationsTable(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as {
    code?: unknown;
    details?: unknown;
    hint?: unknown;
    message?: unknown;
  };
  const errorText = [record.code, record.details, record.hint, record.message]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase("tr");

  return (
    errorText.includes("notifications") &&
    (errorText.includes("does not exist") ||
      errorText.includes("could not find") ||
      errorText.includes("pgrst205") ||
      errorText.includes("42p01"))
  );
}

function getLifecycleNotificationMetadata(
  metadata: ServiceRequestLifecycleNotification,
): Record<string, Json | undefined> {
  return {
    actorUserId: metadata.actorUserId ?? null,
    customerUserId: metadata.customerUserId ?? null,
    providerId: metadata.providerId ?? null,
    providerUserId: metadata.providerUserId ?? null,
    requestCode: metadata.requestCode,
    requestId: metadata.requestId ?? null,
  };
}

async function createNotificationRecordIfTableExists({
  actorUserId,
  body,
  event,
  metadata,
  providerId,
  recipientUserId,
  requestId,
  supabaseClient,
  title,
}: NotificationRecordInput) {
  if (!supabaseClient || !recipientUserId) {
    return;
  }

  try {
    const notificationPayload: NotificationPayload = {
      actor_user_id: actorUserId ?? null,
      body,
      entity_id: requestId ?? null,
      entity_type: "service_request",
      event,
      is_read: false,
      message: body,
      metadata: {
        ...(metadata ?? {}),
        providerId: providerId ?? null,
        requestId: requestId ?? null,
      },
      provider_id: providerId ?? null,
      recipient_user_id: recipientUserId,
      request_id: requestId ?? null,
      title,
      type: event,
      user_id: recipientUserId,
    };
    const notificationsClient = supabaseClient as unknown as NotificationInsertClient;
    const { error } = await notificationsClient
      .from("notifications")
      .insert(notificationPayload);

    if (!error || isMissingNotificationsTable(error)) {
      return;
    }

    logWarn("Notification record insert failed.", {
      event,
      requestId,
      providerId,
      recipientUserId,
      supabaseError: {
        code: typeof error.code === "string" ? error.code : undefined,
        details: typeof error.details === "string" ? error.details : undefined,
        hint: typeof error.hint === "string" ? error.hint : undefined,
        message: typeof error.message === "string" ? error.message : undefined,
      },
    });
  } catch (error) {
    logWarn("Notification record insert threw.", {
      event,
      requestId,
      providerId,
      recipientUserId,
      error,
    });
  }
}

export async function notifyProviderApplicationSubmitted(
  metadata?: ProviderApplicationSubmittedNotification,
): Promise<NotificationMockResult> {
  return createMockNotificationResult("provider_application_submitted", metadata);
}

export async function notifyProviderApplicationApproved(
  metadata: ProviderApplicationDecisionNotification,
): Promise<NotificationMockResult> {
  return createMockNotificationResult("provider_application_approved", metadata);
}

export async function notifyProviderApplicationRejected(
  metadata: ProviderApplicationDecisionNotification,
): Promise<NotificationMockResult> {
  return createMockNotificationResult("provider_application_rejected", metadata);
}

export async function notifyServiceRequestCreated(
  metadata?: ServiceRequestCreatedNotification,
): Promise<NotificationMockResult> {
  return createMockNotificationResult("service_request_created", metadata);
}

export async function notifyEmergencyRequestDispatched(
  metadata?: ServiceRequestCreatedNotification,
): Promise<NotificationMockResult> {
  return createMockNotificationResult("emergency_request_dispatched", {
    ...metadata,
    notificationChannels: metadata?.notificationChannels ?? ["provider_dashboard"],
  });
}

export async function notifyServiceRequestAssigned(
  metadata: ServiceRequestLifecycleNotification,
): Promise<NotificationMockResult> {
  await Promise.all([
    createNotificationRecordIfTableExists({
      actorUserId: metadata.actorUserId,
      body: "Usta atandı. Yanıt bekleniyor.",
      event: "service_request_assigned",
      metadata: getLifecycleNotificationMetadata(metadata),
      providerId: metadata.providerId,
      recipientUserId: metadata.customerUserId,
      requestId: metadata.requestId,
      supabaseClient: metadata.supabaseClient,
      title: "Talebine usta atandı",
    }),
    createNotificationRecordIfTableExists({
      actorUserId: metadata.actorUserId,
      body: "Sana yeni bir talep atandı.",
      event: "service_request_assigned",
      metadata: getLifecycleNotificationMetadata(metadata),
      providerId: metadata.providerId,
      recipientUserId: metadata.providerUserId,
      requestId: metadata.requestId,
      supabaseClient: metadata.supabaseClient,
      title: "Yeni talep atandı",
    }),
  ]);

  return createMockNotificationResult("service_request_assigned", metadata);
}

export async function notifyServiceRequestAccepted(
  metadata: ServiceRequestLifecycleNotification,
): Promise<NotificationMockResult> {
  await createNotificationRecordIfTableExists({
    actorUserId: metadata.actorUserId,
    body: "Usta talebini kabul etti.",
    event: "service_request_accepted",
    metadata: getLifecycleNotificationMetadata(metadata),
    providerId: metadata.providerId,
    recipientUserId: metadata.customerUserId,
    requestId: metadata.requestId,
    supabaseClient: metadata.supabaseClient,
    title: "Talebin kabul edildi",
  });

  return createMockNotificationResult("service_request_accepted", metadata);
}

export async function notifyServiceRequestRejected(
  metadata: ServiceRequestLifecycleNotification,
): Promise<NotificationMockResult> {
  await createNotificationRecordIfTableExists({
    actorUserId: metadata.actorUserId,
    body: "Usta talebi reddetti. Yeni eşleşme bekleniyor.",
    event: "service_request_rejected",
    metadata: getLifecycleNotificationMetadata(metadata),
    providerId: metadata.providerId,
    recipientUserId: metadata.customerUserId,
    requestId: metadata.requestId,
    supabaseClient: metadata.supabaseClient,
    title: "Talep yanıtı güncellendi",
  });

  return createMockNotificationResult("service_request_rejected", metadata);
}
