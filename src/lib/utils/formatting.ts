export function formatInteger(value: number, locale = "tr-TR") {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatOptionalText(value: string | null | undefined, fallback = "") {
  return value?.trim() || fallback;
}
