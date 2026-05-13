type AnalyticsValue = string | number | boolean;
type AnalyticsPayload = Record<string, AnalyticsValue | null | undefined>;

export const ANALYTICS_EVENTS = {
  loginAttempt: "login_attempt",
  phoneClick: "phone_click",
  providerApplicationSubmit: "provider_application_submit",
  providerProfileView: "provider_profile_view",
  requestSubmit: "request_submit",
  whatsappClick: "whatsapp_click",
} as const;

type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

type ProviderInteractionPayload = {
  category?: string;
  district?: string;
  providerId: string;
  source?: string;
};

type RequestSubmitPayload = {
  category?: string;
  district?: string;
  requestCode?: string;
  source?: string;
  urgencyLevel?: string;
};

type ProviderApplicationSubmitPayload = {
  category?: string;
  mode?: "demo" | "production";
  serviceArea?: string;
};

type LoginAttemptPayload = {
  method: "email" | "google" | "phone";
  status: "attempted" | "blocked" | "failed" | "success";
};

declare global {
  interface Window {
    gtag?: (command: "event", eventName: string, parameters?: Record<string, AnalyticsValue>) => void;
  }
}

export const analyticsConfig = {
  debug: process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "true",
  enabled: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true",
  gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "",
};

function sanitizePayload(payload: AnalyticsPayload) {
  return Object.entries(payload).reduce<Record<string, AnalyticsValue>>((safePayload, [key, value]) => {
    if (value !== null && value !== undefined) {
      safePayload[key] = value;
    }

    return safePayload;
  }, {});
}

function canTrackWithGoogleAnalytics() {
  return (
    typeof window !== "undefined" &&
    analyticsConfig.enabled &&
    Boolean(analyticsConfig.gaMeasurementId) &&
    typeof window.gtag === "function"
  );
}

export function trackEvent(eventName: AnalyticsEventName, payload: AnalyticsPayload = {}) {
  const safePayload = sanitizePayload(payload);

  if (canTrackWithGoogleAnalytics()) {
    window.gtag?.("event", eventName, safePayload);
    return;
  }

  if (analyticsConfig.debug && typeof window !== "undefined") {
    console.info("[analytics:disabled]", eventName, safePayload);
  }
}

export function trackProviderView(payload: ProviderInteractionPayload) {
  trackEvent(ANALYTICS_EVENTS.providerProfileView, {
    category: payload.category,
    district: payload.district,
    provider_id: payload.providerId,
    source: payload.source,
  });
}

export function trackWhatsappClick(payload: ProviderInteractionPayload) {
  trackEvent(ANALYTICS_EVENTS.whatsappClick, {
    category: payload.category,
    district: payload.district,
    provider_id: payload.providerId,
    source: payload.source,
  });
}

export function trackPhoneClick(payload: ProviderInteractionPayload) {
  trackEvent(ANALYTICS_EVENTS.phoneClick, {
    category: payload.category,
    district: payload.district,
    provider_id: payload.providerId,
    source: payload.source,
  });
}

export function trackRequestSubmit(payload: RequestSubmitPayload) {
  trackEvent(ANALYTICS_EVENTS.requestSubmit, {
    category: payload.category,
    district: payload.district,
    request_code: payload.requestCode,
    source: payload.source,
    urgency_level: payload.urgencyLevel,
  });
}

export function trackProviderApplicationSubmit(payload: ProviderApplicationSubmitPayload) {
  trackEvent(ANALYTICS_EVENTS.providerApplicationSubmit, {
    category: payload.category,
    mode: payload.mode,
    service_area: payload.serviceArea,
  });
}

export function trackLoginAttempt(payload: LoginAttemptPayload) {
  trackEvent(ANALYTICS_EVENTS.loginAttempt, {
    method: payload.method,
    status: payload.status,
  });
}
