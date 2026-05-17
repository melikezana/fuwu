"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  defaultLocale,
  getLocaleConfig,
  getTranslation,
  isSupportedLocale,
  localeStorageKey,
  type LocaleCode,
  type LocaleDirection,
  type TranslationKey,
} from "./locales";

type TranslationValues = Record<string, number | string>;

type LocaleContextValue = {
  dir: LocaleDirection;
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  t: (key: TranslationKey, values?: TranslationValues) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function applyDocumentLocale(locale: LocaleCode) {
  const localeConfig = getLocaleConfig(locale);

  document.documentElement.lang = locale;
  document.documentElement.dir = localeConfig.dir;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<LocaleCode>(defaultLocale);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(localeStorageKey);

    if (isSupportedLocale(storedLocale)) {
      setLocale(storedLocale);
      setIsInitialized(true);
      return;
    }

    applyDocumentLocale(defaultLocale);
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    applyDocumentLocale(locale);
    window.localStorage.setItem(localeStorageKey, locale);
  }, [isInitialized, locale]);

  const value = useMemo<LocaleContextValue>(() => {
    const localeConfig = getLocaleConfig(locale);

    return {
      dir: localeConfig.dir,
      locale,
      setLocale,
      t: (key, values) => getTranslation(locale, key, values),
    };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useI18n must be used inside LocaleProvider");
  }

  return context;
}

export function I18nText({
  i18nKey,
  values,
}: {
  i18nKey: TranslationKey;
  values?: TranslationValues;
}) {
  const { t } = useI18n();

  return <>{t(i18nKey, values)}</>;
}
