export const defaultLocale = "tr" as const;

export const supportedLocales = [
  {
    code: "tr",
    label: "Türkçe",
    shortLabel: "TR",
    dir: "ltr",
    status: "active",
  },
  {
    code: "en",
    label: "English",
    shortLabel: "EN",
    dir: "ltr",
    status: "coming-soon",
  },
  {
    code: "ar",
    label: "العربية",
    shortLabel: "AR",
    dir: "rtl",
    status: "coming-soon",
  },
] as const;

export type LocaleCode = (typeof supportedLocales)[number]["code"];
export type LocaleDirection = (typeof supportedLocales)[number]["dir"];

export function isSupportedLocale(value: string | null | undefined): value is LocaleCode {
  return supportedLocales.some((locale) => locale.code === value);
}

export function getLocaleConfig(localeCode: string | null | undefined) {
  return supportedLocales.find((locale) => locale.code === localeCode) ?? supportedLocales[0];
}

export function getLocaleSupportMessage(localeCode: string | null | undefined) {
  const locale = getLocaleConfig(localeCode);

  if (locale.status === "active") {
    return `${locale.label} içerik gösteriliyor.`;
  }

  return "Dil desteği yakında tamamen aktif olacak.";
}
