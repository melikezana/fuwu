import type { SupabaseClient } from "@supabase/supabase-js";
import { logInfo, logWarn } from "@/lib/logger";
import type { Database, Json } from "@/lib/supabase/types";

export type NotificationEvent =
  | "emergency_request_dispatched"
  | "new_service_request_match"
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
  actorUserId: string;
  applicationId: string;
  providerId?: string;
  recipientUserId: string;
  supabaseClient: SupabaseClient<Database>;
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
  entityId?: string | null;
  entityType?: "service_request" | "provider_application" | "provider";
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
  entity_type: "service_request" | "provider_application" | "provider";
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

export type NotificationRecord =
  Database["public"]["Tables"]["notifications"]["Row"];

export type NotificationListOptions = {
  limit?: number;
  unreadOnly?: boolean;
};

type NotificationInsertClient = {
  from: (table: "notifications") => {
    insert: (payload: NotificationPayload) => Promise<{ error: NotificationInsertError | null }>;
    upsert: (
      payload: NotificationPayload[],
      options: {
        count: "exact";
        ignoreDuplicates: true;
        onConflict: string;
      },
    ) => Promise<{
      count: number | null;
      error: NotificationInsertError | null;
    }>;
  };
};

const isDevelopment = process.env.NODE_ENV !== "production";
const DEFAULT_NOTIFICATION_LIMIT = 10;
const MAX_NOTIFICATION_LIMIT = 50;

function normalizeNotificationLimit(limit?: number) {
  if (!Number.isFinite(limit)) {
    return DEFAULT_NOTIFICATION_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(limit as number), 1), MAX_NOTIFICATION_LIMIT);
}

function getSupabaseErrorLogDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return {};
  }

  const record = error as {
    code?: unknown;
    details?: unknown;
    hint?: unknown;
    message?: unknown;
  };

  return {
    code: typeof record.code === "string" ? record.code : undefined,
    details: typeof record.details === "string" ? record.details : undefined,
    hint: typeof record.hint === "string" ? record.hint : undefined,
    message: typeof record.message === "string" ? record.message : undefined,
  };
}

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

export async function getNotificationsForUser(
  userId: string,
  supabase: SupabaseClient<Database>,
  options: NotificationListOptions = {},
): Promise<NotificationRecord[]> {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    return [];
  }

  let query = supabase
    .from("notifications")
    .select(
      "id, user_id, recipient_user_id, actor_user_id, provider_id, request_id, entity_id, entity_type, type, event, title, body, message, metadata, is_read, created_at, updated_at",
    )
    .eq("recipient_user_id", normalizedUserId)
    .order("created_at", { ascending: false })
    .limit(normalizeNotificationLimit(options.limit));

  if (options.unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;

  if (error) {
    logWarn("Notification records read failed.", {
      recipientUserId: normalizedUserId,
      supabaseError: getSupabaseErrorLogDetails(error),
    });
    return [];
  }

  return (data ?? []) as NotificationRecord[];
}

export async function markNotificationAsRead(
  notificationId: string,
  userId: string,
  supabase: SupabaseClient<Database>,
) {
  const normalizedNotificationId = notificationId.trim();
  const normalizedUserId = userId.trim();

  if (!normalizedNotificationId || !normalizedUserId) {
    return false;
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", normalizedNotificationId)
    .eq("recipient_user_id", normalizedUserId);

  if (error) {
    logWarn("Notification mark-as-read failed.", {
      notificationId: normalizedNotificationId,
      recipientUserId: normalizedUserId,
      supabaseError: getSupabaseErrorLogDetails(error),
    });
    return false;
  }

  return true;
}

export async function markAllNotificationsAsRead(
  userId: string,
  supabase: SupabaseClient<Database>,
) {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    return false;
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("recipient_user_id", normalizedUserId)
    .eq("is_read", false);

  if (error) {
    logWarn("Notification mark-all-as-read failed.", {
      recipientUserId: normalizedUserId,
      supabaseError: getSupabaseErrorLogDetails(error),
    });
    return false;
  }

  return true;
}

async function createNotificationRecordIfTableExists({
  actorUserId,
  body,
  entityId,
  entityType = "service_request",
  event,
  metadata,
  providerId,
  recipientUserId,
  requestId,
  supabaseClient,
  title,
}: NotificationRecordInput) {
  if (!supabaseClient || !recipientUserId) {
    return false;
  }

  try {
    const notificationPayload: NotificationPayload = {
      actor_user_id: actorUserId ?? null,
      body,
      entity_id: entityId ?? requestId ?? null,
      entity_type: entityType,
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

    if (!error) {
      return true;
    }

    if (isMissingNotificationsTable(error)) {
      return false;
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
    return false;
  } catch (error) {
    logWarn("Notification record insert threw.", {
      event,
      requestId,
      providerId,
      recipientUserId,
      error,
    });
    return false;
  }
}

export type NewServiceRequestMatchNotification = {
  actorUserId: string;
  categoryId: string;
  districtId: string;
  providers: Array<{
    providerId: string;
    providerUserId: string;
  }>;
  requestId: string;
  supabaseClient: SupabaseClient<Database>;
  urgencyType: "standard" | "emergency";
};

export async function notifyNewServiceRequestMatch(
  metadata: NewServiceRequestMatchNotification,
) {
  const startedAt = Date.now();
  const isEmergency = metadata.urgencyType === "emergency";
  const body = isEmergency
    ? "Bölgenizde acil bir müşteri talebi oluşturuldu. Talep ayrıntılarını inceleyin."
    : "Kategori ve hizmet bölgenizle eşleşen yeni bir müşteri talebi var.";
  const title = isEmergency ? "Yeni acil hizmet talebi" : "Yeni hizmet talebi";
  const uniqueProviders = Array.from(
    new Map(
      metadata.providers
        .filter(
          (provider) =>
            provider.providerId.trim() && provider.providerUserId.trim(),
        )
        .map((provider) => [provider.providerUserId, provider]),
    ).values(),
  );

  if (uniqueProviders.length === 0) {
    logInfo("Provider match notification batch skipped.", {
      durationMs: Date.now() - startedAt,
      requestId: metadata.requestId,
      targetedProviderCount: 0,
    });
    return 0;
  }

  const notificationPayloads: NotificationPayload[] = uniqueProviders.map(
    ({ providerId, providerUserId }) => ({
      actor_user_id: metadata.actorUserId,
      body,
      entity_id: metadata.requestId,
      entity_type: "service_request",
      event: "new_service_request_match",
      is_read: false,
      message: body,
      metadata: {
        actorUserId: metadata.actorUserId,
        categoryId: metadata.categoryId,
        districtId: metadata.districtId,
        providerId,
        providerUserId,
        requestId: metadata.requestId,
        urgencyType: metadata.urgencyType,
      },
      provider_id: providerId,
      recipient_user_id: providerUserId,
      request_id: metadata.requestId,
      title,
      type: "new_service_request_match",
      user_id: providerUserId,
    }),
  );

  try {
    const notificationsClient =
      metadata.supabaseClient as unknown as NotificationInsertClient;
    const { count, error } = await notificationsClient
      .from("notifications")
      .upsert(notificationPayloads, {
        count: "exact",
        ignoreDuplicates: true,
        onConflict: "recipient_user_id,request_id,event",
      });

    if (error) {
      if (!isMissingNotificationsTable(error)) {
        logWarn("Provider match notification batch insert failed.", {
          durationMs: Date.now() - startedAt,
          requestId: metadata.requestId,
          supabaseError: getSupabaseErrorLogDetails(error),
          targetedProviderCount: uniqueProviders.length,
        });
      }

      return 0;
    }

    const insertedCount = count ?? uniqueProviders.length;
    logInfo("Provider match notification batch completed.", {
      durationMs: Date.now() - startedAt,
      insertedNotificationCount: insertedCount,
      requestId: metadata.requestId,
      targetedProviderCount: uniqueProviders.length,
    });

    return insertedCount;
  } catch (error) {
    logWarn("Provider match notification batch insert threw.", {
      durationMs: Date.now() - startedAt,
      error,
      requestId: metadata.requestId,
      targetedProviderCount: uniqueProviders.length,
    });
    return 0;
  }
}

export async function notifyProviderApplicationSubmitted(
  metadata?: ProviderApplicationSubmittedNotification,
): Promise<NotificationMockResult> {
  return createMockNotificationResult("provider_application_submitted", metadata);
}

export async function notifyProviderApplicationApproved(
  metadata: ProviderApplicationDecisionNotification,
) {
  return createNotificationRecordIfTableExists({
    actorUserId: metadata.actorUserId,
    body: "Usta başvurunuz onaylandı. Usta paneliniz artık kullanıma hazır.",
    entityId: metadata.applicationId,
    entityType: "provider_application",
    event: "provider_application_approved",
    metadata: {
      applicationId: metadata.applicationId,
      providerId: metadata.providerId ?? null,
    },
    providerId: metadata.providerId,
    recipientUserId: metadata.recipientUserId,
    supabaseClient: metadata.supabaseClient,
    title: "Usta başvurunuz onaylandı",
  });
}

export async function notifyProviderApplicationRejected(
  metadata: ProviderApplicationDecisionNotification,
) {
  return createNotificationRecordIfTableExists({
    actorUserId: metadata.actorUserId,
    body: "Usta başvurunuz şu aşamada onaylanmadı. Başvuru durumunuzu hesabınızdan inceleyebilirsiniz.",
    entityId: metadata.applicationId,
    entityType: "provider_application",
    event: "provider_application_rejected",
    metadata: {
      applicationId: metadata.applicationId,
      providerId: metadata.providerId ?? null,
    },
    providerId: metadata.providerId,
    recipientUserId: metadata.recipientUserId,
    supabaseClient: metadata.supabaseClient,
    title: "Usta başvurusu güncellendi",
  });
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
