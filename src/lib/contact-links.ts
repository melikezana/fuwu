export function normalizePhoneToE164Digits(phone: string | null | undefined) {
  const digits = phone?.replace(/\D/g, "") ?? "";

  if (!digits) {
    return null;
  }

  const withoutInternationalPrefix = digits.startsWith("00")
    ? digits.slice(2)
    : digits;

  if (!withoutInternationalPrefix) {
    return null;
  }

  if (withoutInternationalPrefix.startsWith("90")) {
    return withoutInternationalPrefix;
  }

  if (withoutInternationalPrefix.startsWith("0")) {
    return `90${withoutInternationalPrefix.slice(1)}`;
  }

  if (
    withoutInternationalPrefix.length === 10 &&
    withoutInternationalPrefix.startsWith("5")
  ) {
    return `90${withoutInternationalPrefix}`;
  }

  return withoutInternationalPrefix;
}

export function normalizePhoneToE164(phone: string | null | undefined) {
  const digits = normalizePhoneToE164Digits(phone);

  return digits ? `+${digits}` : null;
}

export function createTelHref(phone: string | null | undefined) {
  const e164Phone = normalizePhoneToE164(phone);

  return e164Phone ? `tel:${e164Phone}` : null;
}

export function createWhatsAppDeepLink({
  message,
  phone,
}: {
  message: string;
  phone: string | null | undefined;
}) {
  const normalizedPhone = normalizePhoneToE164Digits(phone);

  if (!normalizedPhone) {
    return null;
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
