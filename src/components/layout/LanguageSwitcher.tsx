"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  getLocaleConfig,
  getLocaleSupportMessage,
  supportedLocales,
  useI18n,
  type LocaleCode,
} from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  align?: "left" | "right";
};

export function LanguageSwitcher({ align = "left" }: LanguageSwitcherProps) {
  const { locale: selectedLocale, setLocale, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const statusId = useId();
  const menuId = useId();
  const selectedLocaleConfig = getLocaleConfig(selectedLocale);
  const statusMessage = getLocaleSupportMessage(selectedLocale);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!switcherRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleLocaleClick(localeCode: LocaleCode) {
    setLocale(localeCode);
    setIsOpen(false);
  }

  return (
    <div
      className="relative inline-flex min-w-0 text-xs font-bold text-[var(--brand-navy)]"
      ref={switcherRef}
    >
      <button
        aria-controls={menuId}
        aria-describedby={statusId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={t("language.select")}
        className="inline-flex min-h-10 min-w-12 cursor-pointer select-none items-center justify-center gap-1.5 rounded-full bg-[var(--surface-soft)] px-3 text-sm font-bold leading-5 text-[var(--brand-navy)] shadow-[inset_0_0_0_1px_rgba(13,20,36,0.08)] transition-colors hover:bg-[var(--brand-orange-soft)] active:bg-[var(--brand-orange)] active:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        type="button"
      >
        <span>{selectedLocaleConfig.shortLabel}</span>
        <ChevronDown
          aria-hidden="true"
          className={`size-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen ? (
        <div
          aria-label={t("language.options")}
          className={cn(
            "absolute top-full z-50 mt-2 w-40 overflow-hidden rounded-lg border border-[var(--border)] bg-white py-1 shadow-[0_18px_44px_rgba(13,20,36,0.14)]",
            align === "right" ? "right-0" : "left-0",
          )}
          id={menuId}
          role="menu"
        >
          {supportedLocales.map((locale) => {
            const isSelected = selectedLocale === locale.code;

            return (
              <button
                aria-describedby={statusId}
                aria-current={isSelected ? "true" : undefined}
                className={cn(
                  "flex min-h-10 w-full cursor-pointer select-none items-center justify-between gap-3 px-3.5 text-left text-sm font-semibold leading-5 text-[var(--brand-navy)] transition-colors hover:bg-[var(--brand-orange-soft)] active:bg-[var(--brand-orange)] active:text-white focus:bg-[var(--brand-orange-soft)] focus:outline-none",
                  isSelected ? "bg-[var(--brand-orange-soft)]" : undefined,
                )}
                key={locale.code}
                onClick={() => handleLocaleClick(locale.code)}
                role="menuitem"
                type="button"
              >
                <span>{locale.label}</span>
                {isSelected ? (
                  <Check aria-hidden="true" className="size-4 text-[var(--brand-orange-dark)]" />
                ) : null}
              </button>
            );
          })}
          <p className="border-t border-[var(--border)] px-3.5 py-2 text-[0.72rem] font-bold leading-5 text-[var(--muted)]">
            {statusMessage}
          </p>
        </div>
      ) : null}
      <span className="sr-only" id={statusId} role="status">
        {statusMessage}
      </span>
    </div>
  );
}
