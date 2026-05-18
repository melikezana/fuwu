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
  rating?: string;
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

declare global {
  interface Window {
    gtag?: (command: "event", eventName: string, parameters?: Record<string, AnalyticsValue>) => void;
  }
}

const analyticsEvents = {
  filterUsed: "filter_used",
  pageView: "page_view",
  phoneClick: "phone_click",
  providerApplicationSubmitted: "provider_application_submitted",
  providerDetailOpen: "provider_detail_open",
  requestSubmit: "request_submit",
  whatsappClick: "whatsapp_click",
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
