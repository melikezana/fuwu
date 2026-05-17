"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useId, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type MobileCollapsibleSectionProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function MobileCollapsibleSection({
  children,
  className,
  contentClassName,
}: MobileCollapsibleSectionProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();

  return (
    <div className={cn("min-w-0", className)}>
      <button
        aria-controls={contentId}
        aria-expanded={isOpen}
        className="mt-5 inline-flex min-h-11 w-full cursor-pointer select-none items-center justify-center gap-2 rounded-md bg-[var(--brand-navy)] px-4 py-2.5 text-sm font-black text-white shadow-[0_14px_32px_rgba(13,20,36,0.16)] transition-colors hover:bg-[var(--brand-navy-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 md:hidden"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        type="button"
      >
        {isOpen ? t("mobile.close") : t("mobile.details")}
        <ChevronDown
          aria-hidden="true"
          className={cn("size-4 transition-transform", isOpen ? "rotate-180" : "")}
        />
      </button>
      <div
        className={cn(isOpen ? "block" : "hidden", "md:block", contentClassName)}
        id={contentId}
      >
        {children}
      </div>
    </div>
  );
}
