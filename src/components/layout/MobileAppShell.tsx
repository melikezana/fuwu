"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { appRoutes } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";
import { MobileBottomNav } from "./MobileBottomNav";

import { PageTransition } from "./PageTransition";

type MobileAppShellProps = {
  children: ReactNode;
};

export function MobileAppShell({ children }: MobileAppShellProps) {
  const pathname = usePathname() ?? appRoutes.home;
  const isAdminPath = pathname === appRoutes.adminDashboard || pathname.startsWith("/admin/");

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    function updateKeyboardInset() {
      const editing = document.activeElement?.matches("input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), textarea");
      const inset = Math.max(0, window.innerHeight - viewport!.height - viewport!.offsetTop);
      const isOpen = Boolean(editing && inset > 150);
      document.documentElement.toggleAttribute("data-keyboard-open", isOpen);
      document.documentElement.style.setProperty("--keyboard-inset", `${isOpen ? inset : 0}px`);
    }
    viewport.addEventListener("resize", updateKeyboardInset);
    viewport.addEventListener("scroll", updateKeyboardInset);
    document.addEventListener("focusin", updateKeyboardInset);
    document.addEventListener("focusout", updateKeyboardInset);
    return () => {
      viewport.removeEventListener("resize", updateKeyboardInset);
      viewport.removeEventListener("scroll", updateKeyboardInset);
      document.removeEventListener("focusin", updateKeyboardInset);
      document.removeEventListener("focusout", updateKeyboardInset);
      document.documentElement.removeAttribute("data-keyboard-open");
      document.documentElement.style.removeProperty("--keyboard-inset");
    };
  }, []);

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col",
        !isAdminPath &&
          "pb-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom))] md:pb-0",
      )}
    >
      <PageTransition key={pathname} className="flex flex-1 flex-col">
        {children}
      </PageTransition>
      <MobileBottomNav />
    </div>
  );
}
