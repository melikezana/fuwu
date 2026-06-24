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
      className="fixed bottom-0 inset-x-0 z-50 p-4 sm:px-6 sm:py-4 bg-[var(--brand-navy)] text-white border-t border-white/10 shadow-[var(--shadow-elevated)]"
      role="alert"
      aria-label="Çerez İzni"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm font-medium leading-relaxed text-left text-white/90">
          Fuwu, deneyimi iyileştirmek için çerez kullanır.{" "}
          <Link
            href={appRoutes.privacy}
            className="text-[var(--brand-orange)] hover:underline font-semibold"
          >
            Gizlilik Politikası
          </Link>{" "}
          ·{" "}
          <Link
            href={appRoutes.cookies}
            className="text-[var(--brand-orange)] hover:underline font-semibold"
          >
            Çerez Politikası
          </Link>
        </p>
        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-end">
          <Button
            variant="ghost"
            className="h-10 min-h-10 px-4 py-2 text-xs font-bold text-white/80 hover:text-white hover:bg-white/10 shrink-0"
            onClick={() => handleConsent("rejected")}
          >
            Reddet
          </Button>
          <Button
            variant="primary"
            className="h-10 min-h-10 px-4 py-2 text-xs font-bold shrink-0"
            onClick={() => handleConsent("accepted")}
          >
            Kabul Et
          </Button>
        </div>
      </div>
    </div>
  );
}
