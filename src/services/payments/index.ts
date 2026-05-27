import type { ServiceRequestPaymentPreference } from "@/types/request";

export type { ServiceRequestPaymentPreference } from "@/types/request";

export const PAYMENT_PREFERENCES = {
  cash: "cash",
  iban: "iban",
  onlineSoon: "online_soon",
} as const satisfies Record<string, ServiceRequestPaymentPreference>;

export const EMERGENCY_PAYMENT_PREFERENCES = [
  PAYMENT_PREFERENCES.cash,
  PAYMENT_PREFERENCES.iban,
] as const;

export const PAYMENT_PREFERENCE_LABELS: Record<ServiceRequestPaymentPreference, string> = {
  [PAYMENT_PREFERENCES.cash]: "Nakit",
  [PAYMENT_PREFERENCES.iban]: "IBAN",
  [PAYMENT_PREFERENCES.onlineSoon]: "Online ödeme yakında",
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

  if (["iban", "iban-ile-odeme", "iban-ile-ödeme"].includes(normalizedValue)) {
    return PAYMENT_PREFERENCES.iban;
  }

  if (
    [
      "online",
      "online-soon",
      "online_soon",
      "online-odeme-yakinda",
      "online-ödeme-yakında",
    ].includes(normalizedValue)
  ) {
    return PAYMENT_PREFERENCES.onlineSoon;
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

export function isEmergencyPaymentPreference(
  value: string | null | undefined,
): value is (typeof EMERGENCY_PAYMENT_PREFERENCES)[number] {
  const paymentPreference = normalizePaymentPreference(value);

  return paymentPreference === PAYMENT_PREFERENCES.cash || paymentPreference === PAYMENT_PREFERENCES.iban;
}

export function saveEmergencyPaymentPreference(value: string | null | undefined) {
  const paymentPreference = normalizePaymentPreference(value);

  return isEmergencyPaymentPreference(paymentPreference) ? paymentPreference : null;
}
