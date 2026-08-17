"use client";

import type { ReactNode } from "react";
import { useKeyboardOpen } from "@/hooks/useKeyboardOpen";
import { cn } from "@/lib/utils";

export function ProviderRequestActionDock({ children }: { children: ReactNode }) {
  const isKeyboardOpen = useKeyboardOpen();

  return (
    <div
      className={cn(
        "mobile-sticky-action fixed bottom-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom))] left-0 right-0 z-40 bg-white px-4 py-3 border-t border-[var(--border)] shadow-[var(--shadow-elevated)] md:static md:bottom-auto md:z-auto md:border-0 md:bg-transparent md:p-0 md:shadow-none",
        isKeyboardOpen && "static bottom-auto shadow-none",
      )}
    >
      {children}
    </div>
  );
}
