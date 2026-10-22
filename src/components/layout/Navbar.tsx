"use client";

import Link from "next/link";
import { LifeBuoy, MapPin, Menu, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FuwuLogo } from "@/components/brand/FuwuLogo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Container } from "@/components/ui/Container";
import { appRoutes, type NavigationLink } from "@/lib/constants/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { CurrentUserProfile } from "@/types/auth";

const headerNavigationLinks: NavigationLink[] = [
  { href: appRoutes.orders, id: "orders", label: "Siparişlerim" },
  {
    href: appRoutes.home,
    id: "home",
    label: "Ana Sayfa",
  },
  {
    href: appRoutes.services,
    id: "services",
    label: "Hizmetler",
  },
  {
    href: appRoutes.providers,
    id: "providers",
    label: "Usta Bul",
  },
  {
    href: appRoutes.howItWorks,
    id: "how-it-works",
    label: "Nasıl Çalışır?",
  },
  {
    href: appRoutes.trust,
    id: "trust",
    label: "Neden FUWU?",
  },
  {
    href: "/#contact",
    id: "contact",
    label: "İletişim",
  },
];

function getActiveHref(pathname: string, links: Array<{ href: string }>) {
  if (typeof window !== "undefined" && window.location.hash) {
    const hash = window.location.hash;
    const matchingLink = links.find((item) => item.href === hash || item.href.endsWith(hash));

    if (matchingLink) {
      return matchingLink.href;
    }
  }

  return pathname;
}

function getUserDisplayName(profile: CurrentUserProfile | null, fallback: string) {
  return profile?.full_name?.trim() || fallback;
}


export function Navbar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState("");
  const [userProfile, setUserProfile] = useState<CurrentUserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const navRef = useRef<HTMLElement>(null);
  const userDisplayName = useMemo(
    () => getUserDisplayName(userProfile, t("nav.account")),
    [t, userProfile],
  );

  const mobileNavigationLinks = useMemo(() => {
    const links: NavigationLink[] = [
      ...headerNavigationLinks,
      {
        href: appRoutes.providerApplication,
        id: "provider-application",
        label: "Hizmet Veren Ol",
      },
    ];

    if (!isAuthLoading) {
      if (userProfile) {
        links.push({
          href: userProfile.role === "admin" ? appRoutes.adminDashboard : appRoutes.account,
          id: "account",
          label: userDisplayName,
        });
        links.push({
          href: "#logout",
          id: "logout",
          label: "Çıkış Yap",
        });
      } else {
        links.push({
          href: appRoutes.login,
          id: "login",
          label: t("nav.login"),
        });
      }
    }

    return links;
  }, [isAuthLoading, t, userDisplayName, userProfile]);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    async function loadAuth() {
      try {
        const response = await fetch("/api/auth/user", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.profile) {
            if (mounted) setUserProfile(data.profile);
          } else if (mounted) {
            setUserProfile(null);
          }
        } else if (mounted) {
          setUserProfile(null);
        }
      } catch {
        if (mounted) setUserProfile(null);
      } finally {
        if (mounted) setIsAuthLoading(false);
      }
    }

    void loadAuth();
    const {
      data: { subscription },
    } =
      supabase?.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          setUserProfile(null);
          setIsAuthLoading(false);
          return;
        }

        if (event === "SIGNED_IN" || event === "USER_UPDATED") {
          setIsAuthLoading(true);
          void loadAuth();
        }
      }) ?? { data: { subscription: null } };

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function updateActiveHref() {
      setActiveHref(getActiveHref(pathname, mobileNavigationLinks));
    }

    updateActiveHref();
    window.addEventListener("hashchange", updateActiveHref);

    return () => window.removeEventListener("hashchange", updateActiveHref);
  }, [mobileNavigationLinks, pathname]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!navRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        navRef.current?.querySelector<HTMLButtonElement>("[aria-controls='mobile-navigation-menu']")?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  function isActiveLink(href: string) {
    if (href === appRoutes.home) {
      return activeHref === appRoutes.home && pathname === appRoutes.home;
    }

    return activeHref === href || (!href.includes("#") && pathname === href);
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await createClient()?.auth.signOut();
    } catch {
      // Session refresh handles any transient logout issue.
    }
    setUserProfile(null);
    window.location.reload();
  }

  function handleMenuLinkClick(href: string) {
    setActiveHref(href);
    setIsMenuOpen(false);
  }

  return (
    <header className="site-header">
      <Container className="site-header-container">
        <nav aria-label="Ana navigasyon" className="site-header-nav" ref={navRef}>
          <Link aria-label={t("nav.logo")} className="site-logo-link" href={appRoutes.home} onClick={() => handleMenuLinkClick(appRoutes.home)}>
            <FuwuLogo size="sm" />
          </Link>
          <div className="site-desktop-links">
            {headerNavigationLinks.map((item) => (
              <Link aria-current={isActiveLink(item.href) ? "page" : undefined} className={cn("site-nav-link", isActiveLink(item.href) && "is-active")} href={item.href} key={item.id} onClick={() => setActiveHref(item.href)}>{item.label}</Link>
            ))}
          </div>
          <Link className="site-mobile-location" href={appRoutes.providers}><MapPin aria-hidden="true" className="size-3.5 shrink-0" />İstanbul</Link>
          <div className="site-desktop-actions">
            <Link className="site-provider-link" href={appRoutes.providerApplication} onClick={() => setActiveHref(appRoutes.providerApplication)}>Hizmet Veren Ol</Link>
            {!isAuthLoading && userProfile ? <NotificationBell className="shrink-0" userId={userProfile.id} /> : null}
            {isAuthLoading ? <span aria-hidden="true" className="site-account-placeholder" /> : (
              <Link className="site-account-link" href={userProfile ? (userProfile.role === "admin" ? appRoutes.adminDashboard : appRoutes.account) : appRoutes.login} title={userProfile ? userDisplayName : undefined}>
                <UserRound aria-hidden="true" className="size-4 shrink-0" /><span>{userProfile ? userDisplayName : "Giriş Yap"}</span>
              </Link>
            )}
          </div>
          <div className="site-mobile-actions">
            {!isAuthLoading && userProfile ? <NotificationBell panelAlign="right" userId={userProfile.id} /> : (
              <Link aria-label="Hesabınıza giriş yapın" className="site-icon-button" href={appRoutes.login}><UserRound aria-hidden="true" className="size-5" /></Link>
            )}
            <button aria-controls="mobile-navigation-menu" aria-expanded={isMenuOpen} aria-label={isMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")} className="site-icon-button" onClick={() => setIsMenuOpen((value) => !value)} type="button">
              {isMenuOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
            </button>
          </div>
          {isMenuOpen ? (
            <div className="site-mobile-menu" id="mobile-navigation-menu">
              {mobileNavigationLinks.map((item) => item.href === "#logout" ? (
                <button className="site-menu-link" key={item.id} onClick={handleLogout} type="button">{item.label}</button>
              ) : (
                <Link aria-current={isActiveLink(item.href) ? "page" : undefined} className={cn("site-menu-link", isActiveLink(item.href) && "is-active")} href={item.href} key={item.id} onClick={() => handleMenuLinkClick(item.href)}>{item.label}</Link>
              ))}
              <button className="site-menu-link gap-2" onClick={() => { setIsMenuOpen(false); window.dispatchEvent(new Event("fuwu:open-support")); }} type="button"><LifeBuoy aria-hidden="true" className="size-4 shrink-0" />Yardım ve Destek</button>
            </div>
          ) : null}
        </nav>
      </Container>
    </header>
  );
}
