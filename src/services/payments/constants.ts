import type { Database } from "@/lib/supabase/types";
import type { ServiceRequestPaymentPreference } from "@/types/request";

export type { ServiceRequestPaymentPreference } from "@/types/request";

export type PaymentStatus = Database["public"]["Tables"]["payments"]["Row"]["status"];

export const PAYMENT_PREFERENCES = {
  cash: "cash",
  iban: "iban",
  iyzico: "iyzico",
  onlineSoon: "online_soon",
} as const satisfies Record<string, ServiceRequestPaymentPreference>;

export const EMERGENCY_PAYMENT_PREFERENCES = [
  PAYMENT_PREFERENCES.iyzico,
  PAYMENT_PREFERENCES.onlineSoon,
] as const;

export const PAYMENT_STATUSES = {
  confirmed: "confirmed",
  escrowFailed: "escrow_failed",
  escrowHeld: "escrow_held",
  escrowRefunded: "escrow_refunded",
  escrowReleased: "escrow_released",
  pendingConfirmation: "pending_confirmation",
} as const satisfies Record<string, PaymentStatus>;

export const PAYMENT_PREFERENCE_LABELS: Record<ServiceRequestPaymentPreference, string> = {
  [PAYMENT_PREFERENCES.cash]: "Nakit",
  [PAYMENT_PREFERENCES.iban]: "IBAN / Havale",
  [PAYMENT_PREFERENCES.iyzico]: "iyzico",
  [PAYMENT_PREFERENCES.onlineSoon]: "Online Ödeme",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PAYMENT_STATUSES.confirmed]: "Onaylandı",
  [PAYMENT_STATUSES.escrowFailed]: "Emanet ödeme müdahale bekliyor",
  [PAYMENT_STATUSES.escrowHeld]: "Emanette bekliyor",
  [PAYMENT_STATUSES.escrowRefunded]: "İade edildi",
  [PAYMENT_STATUSES.escrowReleased]: "Ustaya aktarıldı",
  [PAYMENT_STATUSES.pendingConfirmation]: "Onay bekliyor",
};

export const ibanAfterProviderAcceptsText =
  "IBAN bilgisi usta kabul ettikten sonra paylaşılır.";

export function normalizePaymentPreference(
  value: string | null | undefined,
): ServiceRequestPaymentPreference | null {
  const normalizedValue = value?.trim().toLocaleLowerCase("tr").replace(/\s+/g, "-") ?? "";

  if (!normalizedValue) {
    return null;
  }

  if (["cash", "nakit"].includes(normalizedValue)) {
    return PAYMENT_PREFERENCES.cash;
  }

  if (["iban", "havale", "iban-ile-odeme", "iban-ile-ödeme"].includes(normalizedValue)) {
    return PAYMENT_PREFERENCES.iban;
  }

  if (
    [
      "online",
      "online-odeme",
      "online-ödeme",
      "online-soon",
      "online_soon",
      "iyzico",
      "online-odeme-yakinda",
      "online-ödeme-yakında",
    ].includes(normalizedValue)
  ) {
    return normalizedValue === "iyzico"
      ? PAYMENT_PREFERENCES.iyzico
      : PAYMENT_PREFERENCES.onlineSoon;
  }

  return null;
}

export function getPaymentPreferenceLabel(value: string | null | undefined) {
  const paymentPreference = normalizePaymentPreference(value);

  return paymentPreference ? PAYMENT_PREFERENCE_LABELS[paymentPreference] : "Belirtilmedi";
}

export function savePaymentPreference(value: string | null | undefined) {
  return normalizePaymentPreference(value);
}

export function getPaymentStatusLabel(value: string | null | undefined) {
  return value && value in PAYMENT_STATUS_LABELS
    ? PAYMENT_STATUS_LABELS[value as PaymentStatus]
    : "Takip kaydı yok";
}

export function isEmergencyPaymentPreference(
  value: string | null | undefined,
): value is (typeof EMERGENCY_PAYMENT_PREFERENCES)[number] {
  const paymentPreference = normalizePaymentPreference(value);

  return (
    paymentPreference === PAYMENT_PREFERENCES.onlineSoon ||
    paymentPreference === PAYMENT_PREFERENCES.iyzico
  );
}

export function saveEmergencyPaymentPreference(value: string | null | undefined) {
  const paymentPreference = normalizePaymentPreference(value);

  return isEmergencyPaymentPreference(paymentPreference) ? paymentPreference : null;
}
