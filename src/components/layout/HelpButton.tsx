"use client";

import { HelpCircle, Mail, X } from "lucide-react";
import { useState } from "react";

const supportEmail = "fuwuhizmet@gmail.com";

export function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 left-4 z-40 max-w-[calc(100vw-2rem)]">
      {isOpen ? (
        <div className="mb-3 w-[min(calc(100vw-2rem),320px)] cursor-default select-none rounded-lg border border-[var(--border)] bg-white p-4 shadow-[0_22px_70px_rgba(13,20,36,0.18)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-[var(--brand-navy)]">Fuwu destek</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">
                Fuwu destek için bize e-posta gönderebilirsin.
              </p>
            </div>
            <button
              aria-label="Yardım panelini kapat"
              className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md bg-[var(--surface-soft)] text-[var(--brand-navy)] transition-colors hover:bg-[var(--brand-orange-soft)]"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          <a
            className="mt-4 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[var(--brand-orange)] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,138,0,0.22)] transition-colors hover:bg-[var(--brand-orange-dark)]"
            href={`mailto:${supportEmail}`}
          >
            <Mail aria-hidden="true" className="size-4" />
            E-posta Gönder
          </a>
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
