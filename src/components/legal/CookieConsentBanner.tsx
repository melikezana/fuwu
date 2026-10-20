"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { appRoutes } from "@/lib/constants/navigation";

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("fuwu:cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConsent = (choice: "accepted" | "rejected") => {
    localStorage.setItem("fuwu:cookie-consent", choice);
    window.dispatchEvent(new CustomEvent("fuwuConsentChanged"));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+0.75rem)] left-3 right-3 z-[60] rounded-xl border border-[var(--border)] bg-white p-4 text-[var(--brand-navy)] shadow-[var(--shadow-elevated)] sm:left-6 sm:right-auto sm:w-[min(30rem,calc(100vw-3rem))] md:bottom-6"
      role="alert"
      aria-label="Çerez İzni"
    >
      <div className="flex flex-col gap-3">
        <p className="text-left text-xs font-semibold leading-5 text-[var(--muted)] sm:text-sm sm:leading-6">
          Fuwu, deneyimi iyileştirmek için çerez kullanır.{" "}
          <Link
            href={appRoutes.privacy}
            className="inline-flex min-h-11 items-center font-bold text-[var(--brand-orange-dark)] hover:underline sm:min-h-0"
          >
            Gizlilik Politikası
          </Link>{" "}
          ·{" "}
          <Link
            href={appRoutes.cookies}
            className="inline-flex min-h-11 items-center font-bold text-[var(--brand-orange-dark)] hover:underline sm:min-h-0"
          >
            Çerez Politikası
          </Link>
        </p>
        <div className="flex w-full shrink-0 items-center justify-end gap-2">
          <Button
            variant="ghost"
            className="h-11 min-h-11 shrink-0 px-4 py-2 text-xs font-bold text-[var(--muted)] hover:bg-[var(--brand-orange-soft)] hover:text-[var(--brand-navy)] sm:h-10 sm:min-h-10"
            onClick={() => handleConsent("rejected")}
          >
            Reddet
          </Button>
          <Button
            variant="primary"
            className="h-11 min-h-11 shrink-0 px-4 py-2 text-xs font-bold sm:h-10 sm:min-h-10"
            onClick={() => handleConsent("accepted")}
          >
            Kabul Et
          </Button>
        </div>
      </div>
    </div>
  );
}
