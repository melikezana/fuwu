import { logInfo } from "@/lib/logger";

type AnalyticsValue = string | number | boolean;
type AnalyticsPayload = Record<string, AnalyticsValue | null | undefined>;

type PageViewPayload = {
  path: string;
  title?: string;
};

type ProviderAnalyticsPayload = {
  category?: string;
  district?: string;
  providerId: string;
  source?: string;
};

type FilterAnalyticsPayload = {
  availability?: string;
  category?: string;
  district?: string;
  hasQuery?: boolean;
  maximumPrice?: string;
  minimumPrice?: string;
  price?: string;
  rating?: string;
  budget?: string;
};

type RequestCreatedPayload = {
  category?: string;
  district?: string;
  requestCode?: string;
  urgencyLevel?: string;
};

type ProviderApplicationSubmittedPayload = {
  category?: string;
  mode?: "demo" | "live";
  serviceArea?: string;
};

type LoginAttemptPayload = {
  method: "email" | "google" | "phone";
  status: "attempted" | "blocked" | "failed" | "success";
};

type VoiceCommandPayload = {
  action: "category" | "category-district" | "district" | "emergency" | "read-profiles" | "reset" | "show-providers" | "start" | "stop" | "unsupported" | "unknown" | "whatsapp";
  matched?: boolean;
};

declare global {
  interface Window {
    gtag?: (command: "event", eventName: string, parameters?: Record<string, AnalyticsValue>) => void;
  }
}

const analyticsEvents = {
  filterUsed: "filter_used",
  loginAttempt: "login_attempt",
  pageView: "page_view",
  phoneClick: "phone_click",
  providerApplicationSubmitted: "provider_application_submitted",
  providerDetailOpen: "provider_detail_open",
  requestSubmit: "request_submit",
  voiceCommandUsage: "voice_command_usage",
  whatsappClick: "whatsapp_click",
  adminAction: "admin_action",
} as const;

type AnalyticsEventName = (typeof analyticsEvents)[keyof typeof analyticsEvents];

const analyticsConfig = {
  debug: process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "true",
  enabled: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true",
  gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "",
};

function sanitizePayload(payload: AnalyticsPayload) {
  return Object.entries(payload).reduce<Record<string, AnalyticsValue>>(
    (safePayload, [key, value]) => {
      if (value !== null && value !== undefined && String(value).trim() !== "") {
        safePayload[key] = value;
      }

      return safePayload;
    },
    {},
  );
}

function canTrackWithGoogleAnalytics() {
  return (
    typeof window !== "undefined" &&
    analyticsConfig.enabled &&
    Boolean(analyticsConfig.gaMeasurementId) &&
    typeof window.gtag === "function"
  );
}

function trackOperationalEvent(eventName: AnalyticsEventName, payload: AnalyticsPayload = {}) {
  const safePayload = sanitizePayload(payload);

  if (canTrackWithGoogleAnalytics()) {
    window.gtag?.("event", eventName, safePayload);
    return;
  }

  if (process.env.NODE_ENV !== "development" && !analyticsConfig.debug) {
    return;
  }

  logInfo("Analytics event.", {
    eventName,
    payload: safePayload,
  });
}

export function trackPageView(payload: PageViewPayload) {
  trackOperationalEvent(analyticsEvents.pageView, {
    path: payload.path,
    title: payload.title,
  });
}

export function trackProviderDetailOpen(payload: ProviderAnalyticsPayload) {
  trackOperationalEvent(analyticsEvents.providerDetailOpen, {
    category: payload.category,
    district: payload.district,
    provider_id: payload.providerId,
    source: payload.source,
  });
}

export function trackProviderView(payload: ProviderAnalyticsPayload) {
  trackProviderDetailOpen(payload);
}

export function trackWhatsappClick(payload: ProviderAnalyticsPayload) {
  trackOperationalEvent(analyticsEvents.whatsappClick, {
    category: payload.category,
    district: payload.district,
    provider_id: payload.providerId,
    source: payload.source,
  });
}

export function trackPhoneClick(payload: ProviderAnalyticsPayload) {
  trackOperationalEvent(analyticsEvents.phoneClick, {
    category: payload.category,
    district: payload.district,
    provider_id: payload.providerId,
    source: payload.source,
  });
}

export function trackFilterUsed(payload: FilterAnalyticsPayload) {
  trackOperationalEvent(analyticsEvents.filterUsed, {
    availability: payload.availability,
    category: payload.category,
    district: payload.district,
    has_query: payload.hasQuery,
    maximum_price: payload.maximumPrice,
    minimum_price: payload.minimumPrice,
    rating: payload.rating,
  });
}

export function trackRequestCreated(payload: RequestCreatedPayload) {
  trackOperationalEvent(analyticsEvents.requestSubmit, {
    category: payload.category,
    district: payload.district,
    request_code: payload.requestCode,
    urgency_level: payload.urgencyLevel,
  });
}

export function trackRequestSubmit(payload: RequestCreatedPayload) {
  trackRequestCreated(payload);
}

export function trackProviderApplicationSubmitted(
  payload: ProviderApplicationSubmittedPayload,
) {
  trackOperationalEvent(analyticsEvents.providerApplicationSubmitted, {
    category: payload.category,
    mode: payload.mode,
    service_area: payload.serviceArea,
  });
}

export function trackLoginAttempt(payload: LoginAttemptPayload) {
  trackOperationalEvent(analyticsEvents.loginAttempt, {
    method: payload.method,
    status: payload.status,
  });
}

export function trackVoiceCommandUsage(payload: VoiceCommandPayload) {
  trackOperationalEvent(analyticsEvents.voiceCommandUsage, {
    action: payload.action,
    matched: payload.matched,
  });
}

export function trackAdminAction(actionName: string, payload: { targetId?: string; status?: string } = {}) {
  // Safe helper exclusively for tracking high-level admin operations
  trackOperationalEvent(analyticsEvents.adminAction, {
    action_name: actionName,
    target_id: payload.targetId,
    status: payload.status,
  });
}
