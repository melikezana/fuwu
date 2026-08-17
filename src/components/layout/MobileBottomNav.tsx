"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ClipboardList,
  Home,
  LayoutDashboard,
  MessageCircle,
  Plus,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { appRoutes } from "@/lib/constants/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { CurrentUserProfile } from "@/types/auth";

type MobileTab = {
  center?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  match: string[];
};

const customerTabs: MobileTab[] = [
  {
    href: appRoutes.home,
    icon: Home,
    label: "Ana Sayfa",
    match: [appRoutes.home],
  },
  {
    href: appRoutes.accountRequests,
    icon: ClipboardList,
    label: "Taleplerim",
    match: [appRoutes.accountRequests, "/account/requests", appRoutes.orderTracking],
  },
  {
    center: true,
    href: appRoutes.request,
    icon: Plus,
    label: "Talep Oluştur",
    match: [appRoutes.request],
  },
  {
    href: appRoutes.accountNotifications,
    icon: Bell,
    label: "Bildirimler",
    match: [appRoutes.accountNotifications],
  },
  {
    href: appRoutes.account,
    icon: UserRound,
    label: "Profil",
    match: [appRoutes.account],
  },
];

const providerTabs: MobileTab[] = [
  {
    href: appRoutes.providerDashboard,
    icon: LayoutDashboard,
    label: "Genel Bakış",
    match: [appRoutes.providerDashboard],
  },
  {
    href: appRoutes.providerDashboardRequests,
    icon: ClipboardList,
    label: "Talepler",
    match: [appRoutes.providerDashboardRequests],
  },
  {
    href: appRoutes.providerDashboardMessages,
    icon: MessageCircle,
    label: "Mesajlar",
    match: [appRoutes.providerDashboardMessages],
  },
  {
    href: appRoutes.providerDashboardEarnings,
    icon: WalletCards,
    label: "Kazançlar",
    match: [appRoutes.providerDashboardEarnings],
  },
  {
    href: appRoutes.providerDashboardProfile,
    icon: UserRound,
    label: "Profil",
    match: [appRoutes.providerDashboardProfile],
  },
];

function isRouteActive(pathname: string, tab: MobileTab) {
  return tab.match.some((href) => {
    if (href === appRoutes.home || href === appRoutes.account || href === appRoutes.providerDashboard) {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  });
}

export function MobileBottomNav() {
  const pathname = usePathname() ?? appRoutes.home;
  const [userProfile, setUserProfile] = useState<CurrentUserProfile | null>(null);
  const isAdminPath = pathname === appRoutes.adminDashboard || pathname.startsWith("/admin/");
  const tabs = useMemo(
    () => (userProfile?.role === "provider" ? providerTabs : customerTabs),
    [userProfile?.role],
  );

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    async function loadAuth() {
      try {
        const response = await fetch("/api/auth/user", { cache: "no-store" });
        const data = response.ok ? await response.json() : null;

        if (mounted) {
          setUserProfile(data?.authenticated && data.profile ? data.profile : null);
        }
      } catch {
        if (mounted) {
          setUserProfile(null);
        }
      }
    }

    void loadAuth();

    const {
      data: { subscription },
    } =
      supabase?.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          setUserProfile(null);
          return;
        }

        if (event === "SIGNED_IN" || event === "USER_UPDATED") {
          void loadAuth();
        }
      }) ?? { data: { subscription: null } };

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  if (isAdminPath) {
    return null;
  }

  return (
    <nav
      aria-label="Mobil alt sekme navigasyonu"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-white/95 pb-[var(--safe-bottom)] shadow-[0_-16px_36px_rgba(10,37,64,0.12)] backdrop-blur-xl md:hidden"
    >
      <div className="grid h-[var(--mobile-bottom-nav-height)] grid-cols-5 items-center px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = isRouteActive(pathname, tab);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.label}
              className={cn(
                "group relative flex min-h-14 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-md px-1 text-[0.68rem] font-extrabold leading-4 text-[var(--brand-navy)] transition-colors duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2",
                tab.center
                  ? "text-[var(--brand-orange-dark)]"
                  : isActive
                    ? "text-[var(--brand-orange)]"
                    : "opacity-60 hover:bg-[var(--brand-orange-soft)] hover:opacity-100",
              )}
              href={tab.href}
              key={tab.label}
            >
              {tab.center ? (
                <span className="-mt-6 inline-flex size-14 items-center justify-center rounded-full bg-[var(--brand-orange)] text-white shadow-[var(--shadow-action)] ring-4 ring-white">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
              ) : (
                <Icon className="size-5" aria-hidden="true" />
              )}
              <span
                className={cn(
                  "max-w-full text-center",
                  tab.center ? "whitespace-normal text-[0.62rem] leading-3" : "truncate",
                )}
              >
                {tab.label}
              </span>
              {isActive && !tab.center ? (
                <span
                  aria-hidden="true"
                  className="absolute bottom-1 h-1 w-5 rounded-full bg-[var(--brand-orange)]"
                />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
