"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FuwuLogo } from "@/components/brand/FuwuLogo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { appRoutes, navigationLinks } from "@/lib/constants/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { CurrentUserProfile } from "@/types/auth";

const navLabelKeys: Record<string, TranslationKey> = {
  about: "nav.about",
  contact: "nav.contact",
  "how-it-works": "nav.howItWorks",
  "provider-application": "cta.provider",
  providers: "nav.providers",
  services: "nav.services",
  trust: "nav.trust",
};

const headerNavigationLinks = navigationLinks.filter((item) => item.id !== "providers");

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

function getAvatarInitial(displayName: string) {
  return displayName.trim().charAt(0).toLocaleUpperCase("tr-TR") || "?";
}

export function Navbar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState("");
  const [userProfile, setUserProfile] = useState<CurrentUserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const navRef = useRef<HTMLElement>(null);
  const translatedHeaderNavigationLinks = useMemo(
    () =>
      headerNavigationLinks.map((item) => ({
        ...item,
        label: t(navLabelKeys[item.id] ?? "nav.services"),
      })),
    [t],
  );
  const userDisplayName = useMemo(
    () => getUserDisplayName(userProfile, t("nav.account")),
    [t, userProfile],
  );
  const userAvatarInitial = useMemo(
    () => getAvatarInitial(userDisplayName),
    [userDisplayName],
  );
  const mobileNavigationLinks = useMemo(
    () => {
      const links = [
        ...translatedHeaderNavigationLinks,
        {
          id: "provider-application",
          label: t("cta.provider"),
          href: appRoutes.providerApplication,
        },
        {
          id: "providers",
          label: t("cta.findProvider"),
          href: appRoutes.providers,
        },
      ];

      if (!isAuthLoading) {
        if (userProfile) {
          links.push({
            id: "account",
            label: userDisplayName,
            href: userProfile.role === "admin" ? appRoutes.adminDashboard : appRoutes.account,
          });
          links.push({
            id: "logout",
            label: "Çıkış Yap",
            href: "#logout",
          });
        } else {
          links.push({
            id: "login",
            label: t("nav.login"),
            href: appRoutes.login,
          });
        }
      }

      return links;
    },
    [t, translatedHeaderNavigationLinks, isAuthLoading, userProfile, userDisplayName],
  );

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
    loadAuth();
    const {
      data: { subscription },
    } = supabase?.auth.onAuthStateChange((event) => {
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

    return () => {
      window.removeEventListener("hashchange", updateActiveHref);
    };
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

    function handleScroll() {
      setIsMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isMenuOpen]);

  function isActiveLink(href: string) {
    return activeHref === href || (!href.includes("#") && pathname === href);
  }

  async function handleMenuLinkClick(href: string) {
    if (href === "#logout") {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
        await createClient()?.auth.signOut();
      } catch {
        // ignore
      }
      setUserProfile(null);
      window.location.reload();
      return;
    }
    setActiveHref(href);
    setIsMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[#F9F8F5]/10 bg-[#0F0F0F]/85 shadow-[0_12px_32px_-26px_rgba(0,0,0,0.9)] backdrop-blur-xl">
      <Container className="max-w-[1440px] py-3 xl:py-0">
        <nav
          className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 xl:h-[72px]"
          ref={navRef}
        >
          <Link
            aria-label={t("nav.logo")}
            className="inline-flex min-w-0 cursor-pointer rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:ring-offset-2 focus:ring-offset-[#0F0F0F]"
            onClick={() => handleMenuLinkClick(appRoutes.home)}
            href={appRoutes.home}
          >
            <FuwuLogo inverted size="sm" />
          </Link>

          <div className="hidden min-w-0 items-center justify-center gap-0.5 xl:flex">
            {translatedHeaderNavigationLinks.map((item) => (
              <Link
                aria-current={isActiveLink(item.href) ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-3 text-center text-sm font-bold leading-5 transition-colors hover:bg-[#F9F8F5]/[0.06] hover:text-[#F9F8F5] active:bg-[#FF6B00] active:text-[#0F0F0F]",
                  isActiveLink(item.href)
                    ? "bg-[#FF6B00]/10 text-[#FF8A33] ring-1 ring-[#FF6B00]/30"
                    : "text-[#F9F8F5]/60",
                )}
                href={item.href}
                key={item.id}
                onClick={() => setActiveHref(item.href)}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden min-w-0 shrink-0 items-center gap-2 xl:flex">
            <LanguageSwitcher />
            <Button
              aria-current={isActiveLink(appRoutes.providerApplication) ? "page" : undefined}
              className={cn(
                "h-10 min-h-10 whitespace-nowrap rounded-full border border-[#F9F8F5]/10 bg-transparent px-3.5 text-[#F9F8F5] shadow-none ring-0 hover:border-[#F9F8F5]/30 hover:bg-[#F9F8F5]/[0.06] hover:text-[#F9F8F5] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:ring-offset-2 focus:ring-offset-[#0F0F0F]",
                isActiveLink(appRoutes.providerApplication)
                  ? "ring-2 ring-[#FF6B00] ring-offset-2 ring-offset-[#0F0F0F]"
                  : undefined,
              )}
              href={appRoutes.providerApplication}
              onClick={() => setActiveHref(appRoutes.providerApplication)}
              variant="plain"
            >
              {t("cta.provider")}
            </Button>
            <Button
              aria-current={isActiveLink(appRoutes.providers) ? "page" : undefined}
              className={cn(
                "h-10 min-h-10 whitespace-nowrap rounded-full bg-[linear-gradient(140deg,#FF8A33,#FF6B00_58%,#C24E00)] px-4 text-[#0F0F0F] shadow-[0_14px_28px_-18px_rgba(255,107,0,0.8)] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-18px_rgba(255,107,0,0.9)] focus:ring-offset-[#0F0F0F]",
                isActiveLink(appRoutes.providers)
                  ? "ring-2 ring-[#FF6B00] ring-offset-2 ring-offset-[#0F0F0F]"
                  : undefined,
              )}
              href={appRoutes.providers}
              onClick={() => setActiveHref(appRoutes.providers)}
            >
              {t("cta.findProvider")}
            </Button>
            <div className="flex min-w-[18.5rem] items-center justify-end gap-2">
              {isAuthLoading ? (
                <div
                  aria-hidden="true"
                  className="h-10 w-full rounded-md bg-[#F9F8F5]/10 opacity-70"
                />
              ) : userProfile ? (
                <>
                  <NotificationBell className="shrink-0" userId={userProfile.id} />
                  <Button
                    aria-label={`${userDisplayName} profiline git`}
                    className="h-10 min-h-10 w-[9.5rem] min-w-0 shrink-0 justify-start gap-2 rounded-full border border-[#F9F8F5]/10 bg-[#F9F8F5]/[0.04] px-3 text-[#F9F8F5] shadow-none ring-0 hover:bg-[#F9F8F5]/[0.08] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:ring-offset-2 focus:ring-offset-[#0F0F0F]"
                    href={userProfile.role === "admin" ? appRoutes.adminDashboard : appRoutes.account}
                    onClick={() => setActiveHref(userProfile.role === "admin" ? appRoutes.adminDashboard : appRoutes.account)}
                    title={userDisplayName}
                    variant="plain"
                  >
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-navy)] text-xs font-medium text-white">
                      {userAvatarInitial}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-left">{userDisplayName}</span>
                  </Button>
                  <Button
                    className="h-10 min-h-10 shrink-0 whitespace-nowrap rounded-full border border-[#F9F8F5]/10 bg-transparent px-3.5 text-[#F9F8F5] shadow-none ring-0 hover:bg-[#F9F8F5]/[0.06] hover:text-[#F9F8F5] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:ring-offset-2 focus:ring-offset-[#0F0F0F]"
                    onClick={async () => {
                      try {
                        await fetch("/api/auth/logout", { method: "POST" });
                        await createClient()?.auth.signOut();
                      } catch {
                        // ignore
                      }
                      setUserProfile(null);
                      window.location.reload();
                    }}
                    variant="plain"
                  >
                    Çıkış Yap
                  </Button>
                </>
              ) : (
                <Button
                  className="h-10 min-h-10 w-[6.75rem] whitespace-nowrap rounded-full border border-[#F9F8F5]/10 bg-transparent px-4 text-[#F9F8F5] shadow-none ring-0 hover:bg-[#F9F8F5]/[0.06] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:ring-offset-2 focus:ring-offset-[#0F0F0F]"
                  href={appRoutes.login}
                  onClick={() => setActiveHref(appRoutes.login)}
                  variant="plain"
                >
                  {t("nav.login")}
                </Button>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 xl:hidden">
            <LanguageSwitcher align="right" />
            {!isAuthLoading && userProfile ? (
              <NotificationBell panelAlign="right" userId={userProfile.id} />
            ) : null}
            <button
              aria-controls="mobile-navigation-menu"
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
              className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-[#F9F8F5]/10 bg-[#1F1F23] text-[#F9F8F5] shadow-[0_16px_34px_-24px_rgba(0,0,0,0.9)] transition-colors hover:bg-[#F9F8F5]/[0.08] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:ring-offset-2 focus:ring-offset-[#0F0F0F]"
              onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
              type="button"
            >
              {isMenuOpen ? (
                <X aria-hidden="true" className="size-5" />
              ) : (
                <Menu aria-hidden="true" className="size-5" />
              )}
            </button>
          </div>

          {isMenuOpen ? (
            <div
              className="absolute left-0 right-0 top-[calc(100%+0.65rem)] z-50 max-h-[min(48vh,18rem)] overflow-y-auto rounded-lg border border-[#F9F8F5]/10 bg-[#17171A] py-2 shadow-[0_28px_70px_-34px_rgba(0,0,0,0.9)] xl:hidden"
              id="mobile-navigation-menu"
            >
              <div className="grid gap-1 px-2">
                {mobileNavigationLinks.map((item) => {
                  const isActive = isActiveLink(item.href);

                  return (
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 cursor-pointer select-none items-center justify-between rounded-md px-3.5 py-2.5 text-sm font-bold leading-5 transition-colors hover:bg-[#F9F8F5]/[0.06] active:bg-[#FF6B00] active:text-[#0F0F0F] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:ring-offset-1 focus:ring-offset-[#17171A]",
                        isActive
                          ? "bg-[#FF6B00]/10 text-[#FF8A33]"
                          : "text-[#F9F8F5]",
                      )}
                      href={item.href}
                      key={item.id}
                      onClick={() => handleMenuLinkClick(item.href)}
                    >
                      <span className="min-w-0 truncate">{item.label}</span>
                      {isActive ? (
                        <span className="h-2 w-2 rounded-full bg-[#FF6B00]" />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </nav>
      </Container>
    </header>
  );
}
