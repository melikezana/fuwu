"use client";

import { Languages } from "lucide-react";
import { useId, useState } from "react";
import { defaultLocale, supportedLocales, type LocaleCode } from "@/lib/i18n";

export function LanguageSwitcher() {
  const [selectedLocale, setSelectedLocale] = useState<LocaleCode>(defaultLocale);
  const [statusMessage, setStatusMessage] = useState("Türkçe içerik gösteriliyor.");
  const statusId = useId();

  function handleLocaleClick(localeCode: LocaleCode) {
    if (localeCode === "tr") {
      setSelectedLocale("tr");
      setStatusMessage("Türkçe içerik gösteriliyor.");
      return;
    }

    if (localeCode === "en") {
      setSelectedLocale("tr");
      setStatusMessage("English desteği hazırlanıyor. Şimdilik Türkçe içerik gösteriliyor.");
      return;
    }

    setSelectedLocale("tr");
    setStatusMessage("Arapça ve RTL desteği hazırlanıyor. Şimdilik Türkçe içerik gösteriliyor.");
  }

  return (
    <div
      aria-label="Dil seçenekleri"
      className="flex min-w-0 items-center gap-1 rounded-full bg-[var(--surface-soft)] p-1 text-xs font-bold text-[var(--brand-navy)]"
      role="group"
    >
      <span className="inline-flex size-8 shrink-0 cursor-default select-none items-center justify-center rounded-full bg-white text-[var(--brand-orange-dark)] shadow-[inset_0_0_0_1px_rgba(13,20,36,0.08)]">
        <Languages aria-hidden="true" className="size-4" />
      </span>
      {supportedLocales.map((locale) => {
        const isSelected = selectedLocale === locale.code;
        const isPrepared = locale.status === "coming-soon";

        return (
          <button
            aria-describedby={statusId}
            aria-label={
              isPrepared
                ? `${locale.label} dil desteği yakında`
                : `${locale.label} dilini seç`
            }
            aria-pressed={isSelected}
            className={[
              "inline-flex min-h-8 cursor-pointer select-none items-center justify-center rounded-full px-2.5 text-xs font-black leading-4 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2",
              isSelected
                ? "bg-[var(--brand-navy)] text-white"
                : "bg-transparent text-[var(--muted)] hover:bg-white hover:text-[var(--brand-navy)]",
            ].join(" ")}
            key={locale.code}
            onClick={() => handleLocaleClick(locale.code)}
            type="button"
          >
            {locale.shortLabel}
            {isPrepared ? (
              <span className="ml-1 hidden text-[0.6rem] font-bold sm:inline">Yakında</span>
            ) : null}
          </button>
        );
      })}
      <span className="sr-only" id={statusId} role="status">
        {statusMessage}
      </span>
    </div>
  );
}
