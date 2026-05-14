export type NotificationEvent =
  | "provider_application_submitted"
  | "provider_application_approved"
  | "provider_application_rejected"
  | "service_request_created";

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
  requestCode?: string;
  requestId?: string | null;
};

type NotificationMetadata =
  | ProviderApplicationSubmittedNotification
  | ProviderApplicationDecisionNotification
  | ServiceRequestCreatedNotification;

const isDevelopment = process.env.NODE_ENV !== "production";

function createMockNotificationResult(
  event: NotificationEvent,
  metadata?: NotificationMetadata,
): NotificationMockResult {
  if (isDevelopment) {
    console.info("[Fuwu notifications] Mock notification prepared.", {
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
