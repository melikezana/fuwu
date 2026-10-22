import type { CommerceOrder, OrderStatus } from "./types";

export const serviceActiveStatuses: OrderStatus[] = ["CONFIRMED", "PROVIDER_ON_THE_WAY", "IN_PROGRESS"];
export const trackingStatuses: OrderStatus[] = ["PENDING_PAYMENT", ...serviceActiveStatuses, "REFUND_PENDING", "DISPUTED"];
export const historyStatuses: OrderStatus[] = ["COMPLETED", "CANCELLED", "PAYMENT_FAILED", "REFUNDED"];

export function isOrderOverdue(order: Pick<CommerceOrder, "status" | "ends_at">, now: number) {
  return serviceActiveStatuses.includes(order.status) && Date.parse(order.ends_at) < now;
}

// Expiry is an observation, not an authoritative cancellation/payment result.
export function isHoldExpired(order: Pick<CommerceOrder, "status" | "expires_at">, now: number) {
  return order.status === "PENDING_PAYMENT" && Date.parse(order.expires_at) <= now;
}
