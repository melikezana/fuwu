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
      className="fixed inset-x-3 bottom-3 z-50 rounded-lg border border-[var(--border)] bg-white p-3 text-[var(--brand-navy)] shadow-[var(--shadow-elevated)] sm:inset-x-6 sm:p-4"
      role="alert"
      aria-label="Çerez İzni"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-left text-sm font-semibold leading-6 text-[var(--muted)]">
          Fuwu, deneyimi iyileştirmek için çerez kullanır.{" "}
          <Link
            href={appRoutes.privacy}
            className="font-bold text-[var(--brand-orange-dark)] hover:underline"
          >
            Gizlilik Politikası
          </Link>{" "}
          ·{" "}
          <Link
            href={appRoutes.cookies}
            className="font-bold text-[var(--brand-orange-dark)] hover:underline"
          >
            Çerez Politikası
          </Link>
        </p>
        <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
          <Button
            variant="ghost"
            className="h-10 min-h-10 shrink-0 px-4 py-2 text-xs font-bold text-[var(--muted)] hover:bg-[var(--brand-orange-soft)] hover:text-[var(--brand-navy)]"
            onClick={() => handleConsent("rejected")}
          >
            Reddet
          </Button>
          <Button
            variant="primary"
            className="h-10 min-h-10 shrink-0 px-4 py-2 text-xs font-bold"
            onClick={() => handleConsent("accepted")}
          >
            Kabul Et
          </Button>
        </div>
      </div>
    </div>
  );
}
