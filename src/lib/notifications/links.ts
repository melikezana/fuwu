// Bir bildirime dokununca hangi sayfanın açılacağı tek yerde belirlenir (zil, Hesabım › Bildirimler, Usta Paneli).
// Yalnızca site içi, bilinen bölümlere giden yollar kabul edilir; veritabanından gelen metin dış adrese yönlendiremez.

type NotificationLike = {
  entity_type?: string | null;
  entity_id?: string | null;
  request_id?: string | null;
  event?: string | null;
  type?: string | null;
  metadata?: unknown;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_PATH = /^\/(admin|account|provider-dashboard|orders|order-tracking)(\/[A-Za-z0-9/_-]*)?$/;
const PROVIDER_REQUEST_EVENTS = ["emergency_request_dispatched", "emergency_request_reassigned_away", "new_service_request_match", "service_request_assigned"];

export function notificationMetadataHref(notification: NotificationLike): string | null {
  const metadata = notification.metadata;
  const url = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? (metadata as Record<string, unknown>).url : null;
  return typeof url === "string" && SAFE_PATH.test(url) && !url.includes("//") ? url : null;
}

export function isProviderRequestNotification(notification: NotificationLike) {
  return PROVIDER_REQUEST_EVENTS.includes(notification.type ?? "") || PROVIDER_REQUEST_EVENTS.includes(notification.event ?? "");
}

/** Bildirimin götürdüğü sayfa; anlamlı bir hedef yoksa null (bildirim yine okundu işaretlenir). */
export function notificationHref(notification: NotificationLike): string | null {
  if (notification.entity_type === "order" && notification.entity_id && UUID.test(notification.entity_id)) return `/orders/${notification.entity_id}`;
  const fromMetadata = notificationMetadataHref(notification);
  if (fromMetadata) return fromMetadata;
  if (isProviderRequestNotification(notification)) return "/provider-dashboard/requests";
  if (notification.request_id && UUID.test(notification.request_id)) return `/order-tracking/${notification.request_id}`;
  if (notification.entity_type === "provider_application") return "/account/applications";
  return null;
}
