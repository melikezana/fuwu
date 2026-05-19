"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
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
const localeChangeEventName = "fuwu-locale-change";
let volatileLocale: LocaleCode = defaultLocale;

function applyDocumentLocale(locale: LocaleCode) {
  const localeConfig = getLocaleConfig(locale);

  document.documentElement.lang = locale;
  document.documentElement.dir = localeConfig.dir;
}

function getStoredLocale() {
  if (typeof window === "undefined") {
    return defaultLocale;
  }

  let storedLocale: string | null = null;

  try {
    storedLocale = window.localStorage.getItem(localeStorageKey);
  } catch {
    return volatileLocale;
  }

  return isSupportedLocale(storedLocale) ? storedLocale : volatileLocale;
}

function subscribeToLocaleChanges(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener("storage", callback);
  window.addEventListener(localeChangeEventName, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(localeChangeEventName, callback);
  };
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeToLocaleChanges,
    getStoredLocale,
    () => defaultLocale,
  );
  const setLocale = useCallback((nextLocale: LocaleCode) => {
    volatileLocale = nextLocale;

    try {
      window.localStorage.setItem(localeStorageKey, nextLocale);
    } catch {
      // Keep the visible locale responsive even when browser storage is blocked.
    }

    window.dispatchEvent(new Event(localeChangeEventName));
  }, []);

  useEffect(() => {
    volatileLocale = locale;
    applyDocumentLocale(locale);

    try {
      if (window.localStorage.getItem(localeStorageKey) !== locale) {
        window.localStorage.setItem(localeStorageKey, locale);
      }
    } catch {
      // Turkish remains the safe runtime fallback when persistence is unavailable.
    }
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => {
    const localeConfig = getLocaleConfig(locale);

    return {
      dir: localeConfig.dir,
      locale,
      setLocale,
      t: (key, values) => getTranslation(locale, key, values),
    };
  }, [locale, setLocale]);

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
