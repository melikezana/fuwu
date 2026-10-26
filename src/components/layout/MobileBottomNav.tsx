"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  ClipboardList,
  Home,
  LayoutDashboard,
  UserRound,
  WalletCards,
  CalendarDays,
  Activity,
  ScrollText,
  UserRoundSearch,
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
    href: appRoutes.catalog,
    icon: Search,
    label: "Hizmetler",
    match: [appRoutes.catalog],
  },
  {
    href: appRoutes.providers,
    icon: UserRoundSearch,
    label: "Ustalar",
    match: [appRoutes.providers],
  },
  {
    href: appRoutes.orders,
    icon: ClipboardList,
    label: "Siparişlerim",
    match: [appRoutes.orders, appRoutes.orderTracking],
  },
  {
    href: appRoutes.account,
    icon: UserRound,
    label: "Hesabım",
    match: [appRoutes.account, appRoutes.login],
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
    href: "/provider-dashboard/orders",
    icon: ClipboardList,
    label: "Siparişler",
    match: ["/provider-dashboard/orders", "/orders"],
  },
  {
    href: "/provider-dashboard/store",
    icon: ClipboardList,
    label: "Mağazam",
    match: ["/provider-dashboard/store"],
  },
  {
    href: appRoutes.providerDashboardEarnings,
    icon: WalletCards,
    label: "Kazançlar",
    match: [appRoutes.providerDashboardEarnings],
  },
  {
    href: appRoutes.providerDashboardCalendar,
    icon: CalendarDays,
    label: "Takvim",
    match: [appRoutes.providerDashboardCalendar],
  },
];

const adminTabs: MobileTab[] = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard", match: ["/admin"] },
  { href: "/admin/marketplace", icon: ClipboardList, label: "Siparişler", match: ["/admin/marketplace"] },
  { href: "/admin/revenue", icon: WalletCards, label: "Gelir", match: ["/admin/revenue"] },
  { href: "/admin/marketplace?view=health", icon: Activity, label: "Sağlık", match: [] },
  { href: "/admin/audit", icon: ScrollText, label: "Audit Log", match: ["/admin/audit"] },
];

function isRouteActive(pathname: string, tab: MobileTab) {
  return tab.match.some((href) => {
    if (href === "/admin" || href === appRoutes.home || href === appRoutes.account || href === appRoutes.providerDashboard) {
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
    () => (isAdminPath ? adminTabs : userProfile?.role === "provider" ? providerTabs : customerTabs),
    [userProfile?.role, isAdminPath],
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

  return (
    <nav aria-label="Mobil alt sekme navigasyonu" className="mobile-tab-bar">
      <div className="mobile-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = isRouteActive(pathname, tab);
          return (
            <Link aria-current={isActive ? "page" : undefined} aria-label={tab.label} className={cn("mobile-tab", isActive && "is-active", tab.center && "mobile-tab-create")} href={tab.href} key={tab.label}>
              <span className="mobile-tab-icon"><Icon aria-hidden="true" className="size-5" /></span>
              <span className="mobile-tab-label">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
