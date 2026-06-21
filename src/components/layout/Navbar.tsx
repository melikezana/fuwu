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
    <header className="sticky top-0 z-30 border-b border-[rgba(13,20,36,0.08)] bg-white/[0.97] shadow-[var(--shadow-subtle)] backdrop-blur-xl">
      <Container className="max-w-[1440px] py-3 xl:py-0">
        <nav
          className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 xl:h-[72px]"
          ref={navRef}
        >
          <Link
            aria-label={t("nav.logo")}
            className="inline-flex min-w-0 cursor-pointer rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            onClick={() => handleMenuLinkClick(appRoutes.home)}
            href={appRoutes.home}
          >
            <FuwuLogo size="sm" />
          </Link>

          <div className="hidden min-w-0 items-center justify-center gap-0.5 xl:flex">
            {translatedHeaderNavigationLinks.map((item) => (
              <Link
                aria-current={isActiveLink(item.href) ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-2.5 text-center text-sm font-semibold leading-5 transition-colors hover:bg-[var(--brand-orange-soft)] hover:text-[var(--brand-navy)] active:bg-[var(--brand-orange)] active:text-white",
                  isActiveLink(item.href)
                    ? "bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]"
                    : "text-[var(--muted)]",
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
                "h-10 min-h-10 whitespace-nowrap px-3.5",
                isActiveLink(appRoutes.providerApplication)
                  ? "ring-2 ring-[var(--brand-orange)] ring-offset-2"
                  : undefined,
              )}
              href={appRoutes.providerApplication}
              onClick={() => setActiveHref(appRoutes.providerApplication)}
              variant="secondary"
            >
              {t("cta.provider")}
            </Button>
            <Button
              aria-current={isActiveLink(appRoutes.providers) ? "page" : undefined}
              className={cn(
                "h-10 min-h-10 whitespace-nowrap px-4",
                isActiveLink(appRoutes.providers)
                  ? "ring-2 ring-[var(--brand-orange)] ring-offset-2"
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
                  className="h-10 w-full rounded-md bg-[var(--surface-soft)] opacity-70"
                />
              ) : userProfile ? (
                <>
                  <NotificationBell className="shrink-0" userId={userProfile.id} />
                  <Button
                    aria-label={`${userDisplayName} profiline git`}
                    className="h-10 min-h-10 w-[9.5rem] min-w-0 shrink-0 justify-start gap-2 px-3"
                    href={userProfile.role === "admin" ? appRoutes.adminDashboard : appRoutes.account}
                    onClick={() => setActiveHref(userProfile.role === "admin" ? appRoutes.adminDashboard : appRoutes.account)}
                    title={userDisplayName}
                    variant="secondary"
                  >
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-navy)] text-xs font-medium text-white">
                      {userAvatarInitial}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-left">{userDisplayName}</span>
                  </Button>
                  <Button
                    className="h-10 min-h-10 shrink-0 whitespace-nowrap border border-[var(--brand-navy-soft)] px-3.5 text-[var(--brand-navy)] hover:bg-[var(--brand-navy-soft)] hover:text-white"
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
                    variant="secondary"
                  >
                    Çıkış Yap
                  </Button>
                </>
              ) : (
                <Button
                  className="h-10 min-h-10 w-[6.75rem] whitespace-nowrap px-4"
                  href={appRoutes.login}
                  onClick={() => setActiveHref(appRoutes.login)}
                  variant="secondary"
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
              className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full bg-[var(--brand-navy)] text-white shadow-[var(--shadow-card)] transition-colors hover:bg-[var(--brand-navy-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
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
              className="absolute left-0 right-0 top-[calc(100%+0.65rem)] z-50 max-h-[min(48vh,18rem)] overflow-y-auto rounded-lg border border-[rgba(13,20,36,0.08)] bg-white py-2 shadow-[var(--shadow-elevated)] xl:hidden"
              id="mobile-navigation-menu"
            >
              <div className="grid gap-1 px-2">
                {mobileNavigationLinks.map((item) => {
                  const isActive = isActiveLink(item.href);

                  return (
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 cursor-pointer select-none items-center justify-between rounded-md px-3.5 py-2.5 text-sm font-bold leading-5 transition-colors hover:bg-[var(--brand-orange-soft)] active:bg-[var(--brand-orange)] active:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-1",
                        isActive
                          ? "bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]"
                          : "text-[var(--brand-navy)]",
                      )}
                      href={item.href}
                      key={item.id}
                      onClick={() => handleMenuLinkClick(item.href)}
                    >
                      <span className="min-w-0 truncate">{item.label}</span>
                      {isActive ? (
                        <span className="h-2 w-2 rounded-full bg-[var(--brand-orange)]" />
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
