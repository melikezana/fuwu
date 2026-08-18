"use client";

import { useI18n } from "@/lib/i18n";

export function RequestSlogan() {
  const { locale } = useI18n();

  if (locale !== "tr") {
    return null;
  }

  return (
    <p className="mt-2 text-xs font-semibold tracking-wide text-[var(--brand-orange)] md:hidden">
      Artık komşuya değil, FUWU&apos;ya sor.
    </p>
  );
}
