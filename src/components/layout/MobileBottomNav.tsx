"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  ClipboardList,
  Home,
  LayoutDashboard,
  UserRound,
  CalendarDays,
  Activity,
  ScrollText,
  UserRoundSearch,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import { appRoutes } from "@/lib/constants/navigation";
import { useSessionProfile } from "@/components/auth/SessionProfileProvider";
import { cn } from "@/lib/utils";


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
 { href: appRoutes.providerDashboard, icon: Home, label: "Ana Sayfa", match: [appRoutes.providerDashboard] },
 { href: "/provider-dashboard/store", icon: ClipboardList, label: "Hizmetlerim", match: ["/provider-dashboard/store"] },
 { href: appRoutes.providerDashboardCalendar, icon: CalendarDays, label: "Takvim", match: [appRoutes.providerDashboardCalendar] },
 { href: appRoutes.providerDashboardProfile, icon: UserRound, label: "Profilim", match: [appRoutes.providerDashboardProfile] },
];

const adminTabs: MobileTab[] = [
  { href: "/admin", icon: LayoutDashboard, label: "Genel Bakış", match: ["/admin"] },
  { href: "/admin/providers", icon: UserRoundSearch, label: "Ustalar", match: ["/admin/providers"] },
  { href: "/admin/provider-applications", icon: ClipboardList, label: "Başvurular", match: ["/admin/provider-applications"] },
  { href: "/admin/marketplace?view=health", icon: Activity, label: "Sağlık", match: ["/admin/marketplace"] },
  { href: "/admin/audit", icon: ScrollText, label: "İşlem Kaydı", match: ["/admin/audit"] },
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
  const { profile: userProfile } = useSessionProfile();
  const isAdminPath = pathname === appRoutes.adminDashboard || pathname.startsWith("/admin/");
  const isProviderPath = pathname === appRoutes.providerDashboard || pathname.startsWith("/provider-dashboard/");
  const tabs = useMemo(
    () => (isAdminPath ? adminTabs : (isProviderPath || userProfile?.role === "provider") ? providerTabs : customerTabs),
    [userProfile?.role, isAdminPath, isProviderPath],
  );



  return (
    <nav aria-label="Mobil alt sekme navigasyonu" className="mobile-tab-bar">
      <div className="mobile-tabs" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
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
