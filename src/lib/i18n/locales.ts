import { arTranslations } from "./translations/ar";
import { enTranslations } from "./translations/en";
import { trTranslations, type TranslationDictionary } from "./translations/tr";

export const defaultLocale = "tr" as const;
export const localeStorageKey = "fuwu-locale";

export const supportedLocales = [
  { code: "tr", label: "T\u00fcrk\u00e7e", shortLabel: "TR", dir: "ltr", status: "active" },
  { code: "en", label: "English", shortLabel: "EN", dir: "ltr", status: "active" },
  { code: "ar", label: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", shortLabel: "AR", dir: "rtl", status: "active" },
] as const;

export type LocaleCode = (typeof supportedLocales)[number]["code"];
export type LocaleDirection = (typeof supportedLocales)[number]["dir"];

type TranslationValues = Record<string, number | string>;

export const translations = {
  tr: trTranslations,
  en: { ...trTranslations, ...enTranslations },
  ar: { ...trTranslations, ...arTranslations },
} as const satisfies Record<LocaleCode, TranslationDictionary>;

export type TranslationKey = keyof typeof trTranslations;

export function isSupportedLocale(value: string | null | undefined): value is LocaleCode {
  return supportedLocales.some((locale) => locale.code === value);
}

export function getLocaleConfig(localeCode: string | null | undefined) {
  return supportedLocales.find((locale) => locale.code === localeCode) ?? supportedLocales[0];
}

export function interpolateTranslation(template: string, values: TranslationValues = {}) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}

export function getTranslation(
  localeCode: string | null | undefined,
  key: TranslationKey,
  values?: TranslationValues,
) {
  const locale = isSupportedLocale(localeCode) ? localeCode : defaultLocale;
  const template = translations[locale][key] ?? translations[defaultLocale][key];

  return interpolateTranslation(template, values);
}

export function getLocaleSupportMessage(localeCode: string | null | undefined) {
  const locale = getLocaleConfig(localeCode);

  return getTranslation(locale.code, "language.status.active", { language: locale.label });
}
