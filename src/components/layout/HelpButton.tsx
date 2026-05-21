"use client";

import { HelpCircle, Mail, MessageCircle, Phone, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { customerServiceContact } from "@/lib/constants/contact";
import { cn } from "@/lib/utils";

const helpActionClassName =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-[var(--surface-soft)] px-3 text-sm font-bold text-[var(--brand-navy)] transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2";

export function HelpButton() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const hasMobileContactBar = /^\/providers\/[^/]+/.test(pathname ?? "");

  return (
    <div
      className={cn(
        "fixed right-4 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end sm:bottom-5 sm:right-5",
        hasMobileContactBar
          ? "bottom-[calc(5.75rem+env(safe-area-inset-bottom))] lg:bottom-[calc(1rem+env(safe-area-inset-bottom))]"
          : "bottom-[calc(1rem+env(safe-area-inset-bottom))]",
      )}
    >
      {isOpen ? (
        <div className="mb-3 w-[min(calc(100vw-2rem),320px)] cursor-default select-none rounded-lg border border-[var(--border)] bg-white p-4 shadow-[0_22px_70px_rgba(13,20,36,0.18)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[var(--brand-navy)]">Fuwu destek</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">
                Telefon, WhatsApp veya e-posta ile bize ulaşabilirsin.
              </p>
            </div>
            <button
              aria-label="Yardım panelini kapat"
              className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md bg-[var(--surface-soft)] text-[var(--brand-navy)] transition-colors hover:bg-[var(--brand-orange-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          <div className="mt-4 grid gap-2">
            <a
              aria-label="Fuwu destek hattını telefonla ara"
              className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[var(--brand-orange)] px-4 text-sm font-bold text-white shadow-[0_14px_30px_rgba(255,138,0,0.22)] transition-colors hover:bg-[var(--brand-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
              href={customerServiceContact.phoneHref}
            >
              <Phone aria-hidden="true" className="size-4" />
              Telefon
            </a>
            <div className="grid grid-cols-2 gap-2">
              <a
                aria-label="Fuwu WhatsApp desteğine yaz"
                className={helpActionClassName}
                href={customerServiceContact.whatsappHref}
                rel="noopener noreferrer"
                target="_blank"
              >
                <MessageCircle aria-hidden="true" className="size-4" />
                WhatsApp
              </a>
              <a
                aria-label="Fuwu destek ekibine e-posta gönder"
                className={helpActionClassName}
                href={`mailto:${customerServiceContact.email}`}
              >
                <Mail aria-hidden="true" className="size-4" />
                E-posta
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <button
        aria-label={isOpen ? "Yardım panelini kapat" : "Yardım panelini aç"}
        aria-expanded={isOpen}
        className="inline-flex size-12 cursor-pointer items-center justify-center rounded-full bg-[var(--brand-navy)] p-0 text-white shadow-[0_18px_44px_rgba(13,20,36,0.24)] transition-all hover:-translate-y-0.5 hover:bg-[var(--brand-navy-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <HelpCircle aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}
