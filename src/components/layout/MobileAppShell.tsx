"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
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
